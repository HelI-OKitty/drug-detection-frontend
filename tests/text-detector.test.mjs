import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { analyzeText } from "../src/lib/text-detector.ts";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("sends text to the public endpoint and handles both boolean results", async () => {
  for (const isDrug of [true, false]) {
    globalThis.fetch = async (url, init) => {
      assert.equal(new URL(url).pathname, "/public/analyze");
      assert.equal(init.method, "POST");
      assert.equal(init.cache, "no-store");
      assert.deepEqual(JSON.parse(init.body), { text: "테스트 문장" });
      return Response.json({ is_drug: isDrug });
    };
    assert.deepEqual(await analyzeText("  테스트 문장  "), { is_drug: isDrug });
  }
});

test("rejects empty and non-string input before calling the API", async () => {
  globalThis.fetch = async () => assert.fail("must not call the backend");
  for (const value of ["", "  \n ", null, 123, {}]) {
    await assert.rejects(analyzeText(value), /텍스트를 입력/);
  }
});

test("malformed responses never become a negative detection", async () => {
  for (const body of [{}, null, { is_drug: "false" }, { is_drug: 0 }]) {
    globalThis.fetch = async () => Response.json(body);
    await assert.rejects(analyzeText("테스트"), /결과를 확인할 수 없/);
  }
  globalThis.fetch = async () => new Response("not json");
  await assert.rejects(analyzeText("테스트"), /결과를 확인할 수 없/);
});

test("handles backend errors without exposing raw response bodies", async () => {
  for (const [status, message] of [[422, /텍스트를 확인/], [429, /요청이 많/], [500, /완료하지 못/]]) {
    globalThis.fetch = async () => new Response("private server details", { status });
    await assert.rejects(analyzeText("테스트"), message);
  }
});

test("network failures and timeouts have actionable messages", async () => {
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(analyzeText("테스트"), /연결하지 못/);
  globalThis.fetch = async () => { throw new DOMException("timeout", "TimeoutError"); };
  await assert.rejects(analyzeText("테스트"), /시간이 초과/);
});
