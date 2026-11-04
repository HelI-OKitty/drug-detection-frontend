import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { analyzeContent, analyzeText } from "../src/lib/text-detector.ts";

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
  for (const [status, message] of [[422, /내용을 확인/], [429, /요청이 많/], [500, /완료하지 못/]]) {
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

test("documented text_source and rule matches are preserved without inventing probabilities", async () => {
  const { analyzeContent } = await import("../src/lib/text-detector.ts");
  for (const source of ["rule", "model"]) {
    globalThis.fetch = async () => Response.json({
      is_drug: true, text_source: source, matched_terms: ["용어"], matched_intents: ["판매"],
      detected_objects: null, ocr_text: null,
    });
    const result = await analyzeContent({ text: "테스트" });
    assert.equal(result.textSource, source);
    assert.equal(result.probDrug, null);
    assert.deepEqual(result.matchedTerms, ["용어"]);
    assert.deepEqual(result.matchedIntents, ["판매"]);
  }
});


test("percent response keeps two decimals and does not override the server verdict", async () => {
  const { toPercent } = await import("../src/lib/detections.ts");
  for (const payload of [{ text: "테스트" }, { text: "OCR 추출 텍스트" }, { image: "dGVzdA==" }]) {
    globalThis.fetch = async () => Response.json({
      is_drug: true, text_source: "rule", prob_drug_percent: 12.18, prob_drug: 0.9,
      matched_terms: ["용어"], matched_intents: ["판매"],
    });
    const result = await analyzeContent(payload);
    assert.ok(Math.abs(result.probDrug - 0.1218) < Number.EPSILON);
    assert.equal(toPercent(result.probDrug, 2), "12.18%");
    assert.equal(result.isDrug, true);
    assert.equal(result.textSource, "rule");
  }
});

test("percentage boundaries, missing values and legacy ratios are handled without invented scores", async () => {
  for (const [body, expected] of [
    [{ prob_drug_percent: 0 }, 0],
    [{ prob_drug_percent: 100 }, 1],
    [{ prob_drug_percent: 0.12 }, 0.0012],
    [{ prob_drug_percent: null, prob_drug: 0.9 }, null],
    [{ prob_drug_percent: "12.18" }, null],
    [{ prob_drug_percent: -1 }, null],
    [{ prob_drug_percent: 101 }, null],
    [{ prob_drug: 0.1218 }, 0.1218],
    [{ prob_drug: 12.18 }, null],
    [{}, null],
  ]) {
    globalThis.fetch = async () => Response.json({ is_drug: false, ...body });
    assert.equal((await analyzeContent({ text: "테스트" })).probDrug, expected);
  }
});
