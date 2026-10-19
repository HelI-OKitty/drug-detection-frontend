import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
const originalSignupEnabled = process.env.SIGNUP_ENABLED;
process.env.SIGNUP_ENABLED = "true";
const { authRequest, submitAuth } = await import("../src/lib/auth-api.ts");
delete process.env.SIGNUP_ENABLED;
const disabledAuth = await import("../src/lib/auth-api.ts?signup-disabled");
if (originalSignupEnabled === undefined) delete process.env.SIGNUP_ENABLED;
else process.env.SIGNUP_ENABLED = originalSignupEnabled;

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function signupForm(overrides = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    name: "테스트", email: "test@example.com", password: "example-password",
    passwordConfirmation: "example-password", ...overrides,
  })) form.set(key, value);
  return form;
}

test("signup is disabled by default and never reaches the backend", async () => {
  assert.equal(disabledAuth.SIGNUP_ENABLED, false);
  globalThis.fetch = async () => assert.fail("must not call backend");
  await assert.rejects(disabledAuth.submitAuth("signup", signupForm()), /회원가입을 받지 않습니다/);
});

test("backend signup closure handles JSON and plain-text responses", async () => {
  for (const response of [
    Response.json({ detail: "회원가입 일시 중단" }, { status: 403 }),
    new Response("Forbidden", { status: 403 }),
  ]) {
    globalThis.fetch = async () => response;
    await assert.rejects(submitAuth("signup", signupForm()), /회원가입/);
  }
});

test("signup sends only the three backend fields, never password confirmation", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/auth/signup");
    assert.equal(init.method, "POST");
    assert.equal(init.cache, "no-store");
    assert.deepEqual(JSON.parse(init.body), {
      name: "테스트", email: "test@example.com", password: "example-password",
    });
    return Response.json({ id: "test-id" }, { status: 201 });
  };
  assert.deepEqual(await submitAuth("signup", signupForm()), { id: "test-id" });
});

test("invalid signup never reaches the backend", async () => {
  globalThis.fetch = async () => assert.fail("must not call backend");
  await assert.rejects(submitAuth("signup", signupForm({ passwordConfirmation: "different" })), /일치/);
  await assert.rejects(submitAuth("signup", signupForm({ password: "short" })), /8자/);
  await assert.rejects(submitAuth("signup", signupForm({ name: "   " })), /이름/);
  await assert.rejects(submitAuth("signup", signupForm({ email: "invalid" })), /이메일/);
});

test("login remains available while signup is disabled", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/auth/login");
    assert.deepEqual(JSON.parse(init.body), { email: "test@example.com", password: "short" });
    return Response.json({ access_token: "test-token", refresh_token: "test-refresh" });
  };
  await disabledAuth.submitAuth("login", signupForm({ password: "short" }));
});

test("backend errors become user-facing messages without exposing raw responses", async () => {
  for (const [status, expected] of [[401, /비밀번호/], [422, /형식/], [429, /요청이 많/], [500, /처리하지/]]) {
    globalThis.fetch = async () => Response.json({ detail: "internal details" }, { status });
    await assert.rejects(submitAuth("login", signupForm()), expected);
  }
  globalThis.fetch = async () => Response.json({}, { status: 409 });
  await assert.rejects(submitAuth("signup", signupForm()), /이미 가입/);
});

test("profile requests preserve the Bearer token and disable caching", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/profile");
    assert.equal(init.headers.Authorization, "Bearer test-token");
    assert.equal(init.cache, "no-store");
    return Response.json({ id: "test-id", name: "테스트" });
  };
  await authRequest("/profile", { method: "GET", headers: { Authorization: "Bearer test-token" } });
});
