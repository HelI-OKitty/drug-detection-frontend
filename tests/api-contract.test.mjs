import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

// 서버 액션을 네트워크·쿠키 대역으로 실행해 API 계약을 검증한다.
function loadServer(path) {
  const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", output)((name) => {
    assert.equal(name, "next/headers");
    return { cookies: async () => ({ get: () => ({ value: "test-token" }) }) };
  }, loaded, loaded.exports);
  return loaded.exports;
}
const detections = loadServer("../src/lib/detections-api.ts");
const crawl = loadServer("../src/app/admin/crawl/actions.ts");
const originalFetch = globalThis.fetch;
const originalKey = process.env.INTERNAL_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.INTERNAL_API_KEY;
  else process.env.INTERNAL_API_KEY = originalKey;
});
const rows = [true, false].map((is_drug, index) => ({
  id: `id-${index}`, content: "게시글", is_drug,
  detected_at: "2026-11-03T10:35:00Z", review_status: "unreviewed",
}));

test("list uses is_drug without fabricating text, images, or OCR scores", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/detections");
    assert.equal(init.headers.Authorization, "Bearer test-token");
    assert.equal(init.cache, "no-store");
    return Response.json(rows);
  };
  const result = await detections.fetchDetections();
  assert.equal(result.ok, true);
  assert.deepEqual(result.items.map((row) => row.isDrug), [true, false]);
  for (const row of result.items) {
    assert.equal(row.textScore, null);
    assert.equal(row.textFlagged, null);
    assert.deepEqual(row.imageAnalyses, []);
  }
  const runs = await detections.fetchCrawlRuns();
  assert.equal(runs.runs[0].positive, 1);
  assert.equal(runs.runs[0].negative, 1);
});

test("detail and statistics use source=model even without a probability", async () => {
  globalThis.fetch = async (url) => Response.json(new URL(url).pathname === "/detections" ? [rows[0]] : {
    ...rows[0], text_ai_result: { prediction: 1, source: "model", matched_terms: [], matched_intents: [] },
    image_ai_results: [{ image_url: "https://example.com/test.png", prediction: 0, ocr_text: "text" }],
  });
  const detail = await detections.fetchDetectionDetail(rows[0].id);
  assert.equal(detail.detection.textAnalysis.source, "model");
  assert.equal(detail.detection.textAnalysis.probDrug, null);
  assert.equal(detail.detection.imageAnalyses[0].ocrScore, null);
  const stats = await detections.fetchAnalysisStats();
  assert.equal(stats.textModel, 1);
  assert.equal(stats.textRuleOnly, 0);
});

test("dashboard preserves documented counts and does not turn failures into zero", async () => {
  const summary = { total: 149, today: 8, unconfirmed: 23, trend: [{ date: "2026-11-03", count: 8 }] };
  globalThis.fetch = async () => Response.json(summary);
  assert.deepEqual(await detections.fetchDashboard(), { ok: true, summary });
  globalThis.fetch = async () => new Response("error", { status: 500 });
  assert.deepEqual(await detections.fetchDashboard(), { ok: false, reason: "error" });
});

test("manual crawl targets the logged-in admin and parses the results envelope", async () => {
  process.env.INTERNAL_API_KEY = "test-internal-key";
  globalThis.fetch = async (url, init) => {
    if (new URL(url).pathname === "/profile") return Response.json({ id: "admin-1" });
    assert.equal(new URL(url).pathname, "/crawl/trigger");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["X-Internal-Key"], "test-internal-key");
    assert.deepEqual(JSON.parse(init.body), { admin_id: "admin-1", max_results: 40 });
    return Response.json({ admins_processed: 1, total_saved: 12, results: [
      { admin_id: "admin-1", total: 45, saved: 12, skipped: 33, failed: 0, error: null },
    ] });
  };
  assert.deepEqual(await crawl.triggerCrawl(40), {
    success: true, result: { total: 45, saved: 12, skipped: 33, failed: 0 },
  });
});

test("partial failures and missing target results cannot be reported as success", async () => {
  process.env.INTERNAL_API_KEY = "test-internal-key";
  for (const status of [200, 500]) {
    globalThis.fetch = async (url) => new URL(url).pathname === "/profile"
      ? Response.json({ id: "admin-1" })
      : Response.json({ results: [{ admin_id: "admin-1", total: 4, saved: 2, skipped: 1, failed: 1, error: "분석 실패" }] }, { status });
    const result = await crawl.triggerCrawl(40);
    assert.equal(result.success, false);
    assert.match(result.message, /저장 2건, 실패 1건/);
  }
  globalThis.fetch = async (url) => Response.json(new URL(url).pathname === "/profile" ? { id: "admin-1" } : { results: [] });
  assert.equal((await crawl.triggerCrawl(40)).success, false);
});
