import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { authRequest } from "../src/lib/auth-api.ts";

let token = "test-token";
const originalFetch = globalThis.fetch;
afterEach(() => { token = "test-token"; globalThis.fetch = originalFetch; });
const output = ts.transpileModule(readFileSync(new URL("../src/app/settings/account/password/actions.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", output)((name) => {
  if (name === "next/headers") return { cookies: async () => ({ get: () => token ? { value: token } : undefined }) };
  assert.equal(name, "@/lib/auth-api");
  return { authRequest };
}, loaded, loaded.exports);
const { changePassword } = loaded.exports;
function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ currentPassword: "old-password", newPassword: " new-password ", confirmation: " new-password ", ...overrides })) data.set(key, value);
  return data;
}

test("password change validates authentication and all fields before making a request", async () => {
  globalThis.fetch = async () => assert.fail("invalid input must not reach backend");
  token = null;
  assert.equal((await changePassword(form())).success, false);
  token = "test-token";
  for (const values of [{ currentPassword: "" }, { newPassword: "short", confirmation: "short" }, { confirmation: "different" }, { currentPassword: new Blob(["invalid"]) }]) {
    assert.equal((await changePassword(form(values))).success, false);
  }
});

test("password screen uses existing profile endpoint and sends only password fields", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/profile");
    assert.equal(init.method, "PATCH");
    assert.equal(init.headers.Authorization, "Bearer test-token");
    assert.deepEqual(JSON.parse(init.body), { current_password: "old-password", new_password: " new-password " });
    return Response.json({ id: "example" });
  };
  assert.deepEqual(await changePassword(form()), { success: true });
});

test("rejected passwords and network failures cannot appear successful", async () => {
  globalThis.fetch = async () => new Response("unauthorized", { status: 401 });
  assert.equal((await changePassword(form())).success, false);
  globalThis.fetch = async () => { throw new TypeError("network failure"); };
  assert.match((await changePassword(form())).message, /연결하지 못했습니다/);
});
