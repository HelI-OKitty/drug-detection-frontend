import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { filterDetections, readFilters } from "../src/lib/detection-filters.ts";

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
const review = loadServer("../src/app/detections/[id]/actions.ts");
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

test("confirming review only updates review status, not the AI verdict", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/detections/review-item/status");
    assert.equal(init.method, "PATCH");
    assert.deepEqual(JSON.parse(init.body), { review_status: "confirmed" });
    return Response.json({ review_status: "confirmed" });
  };
  assert.deepEqual(await review.confirmDetection("review-item"), { success: true });
});

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

test("summary-only image responses support the image-positive filter", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).pathname, "/detections");
    return Response.json(rows.map((row, index) => ({
      ...row,
      image_ai_results: [{ prediction: index === 0 ? 1 : 0, image_score: 0.8, has_ocr_text: true }],
    })));
  };
  const result = await detections.fetchDetections();
  assert.equal(result.ok, true);
  assert.deepEqual(result.items[0].imageAnalyses, [{ flagged: true, score: 0.8, hasOcrText: true, ocrFlagged: null, ocrScore: null }]);
  assert.deepEqual(filterDetections(result.items, readFilters(new URLSearchParams("types=image")), "2026-11-23").map((row) => row.id), [rows[0].id]);
});

test("detail preserves source=model even without a probability", async () => {
  globalThis.fetch = async (url) => Response.json(new URL(url).pathname === "/detections" ? [rows[0]] : {
    ...rows[0], text_ai_result: { prediction: 1, source: "model", matched_terms: [], matched_intents: [] },
    image_ai_results: [{ image_url: "https://example.com/test.png", prediction: 0, ocr_text: "text" }],
  });
  const detail = await detections.fetchDetectionDetail(rows[0].id);
  assert.equal(detail.detection.textAnalysis.source, "model");
  assert.equal(detail.detection.textAnalysis.probDrug, null);
  assert.equal(detail.detection.imageAnalyses[0].ocrScore, null);
});

test("dashboard preserves documented counts and does not turn failures into zero", async () => {
  const verdict = { positive: 149, negative: 6 };
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).pathname, "/dashboard/summary");
    return Response.json({ total: 149, today: 8, unreviewed: 23, verdict });
  };
  assert.deepEqual(await detections.fetchDashboard(), {
    ok: true,
    summary: { total: 149, today: 8, unconfirmed: 23 },
    verdicts: verdict,
  });
  globalThis.fetch = async () => new Response("error", { status: 500 });
  assert.deepEqual(await detections.fetchDashboard(), { ok: false, reason: "error" });
});

test("detail maps text_score percentage without deriving verdicts from scores", async () => {
  for (const [fields, expected] of [
    [{ text_score: 12.18 }, 12.18 / 100],
    [{ text_score: 0 }, 0],
    [{ text_score: 100 }, 1],
    [{ text_score: null }, null],
    [{ text_score: "12.18" }, null],
    [{ text_score: 101 }, null],
    [{ text_score: -1 }, null],
    [{}, null],
  ]) {
    globalThis.fetch = async () => Response.json({
      ...rows[0], text_ai_result: { prediction: 1, source: "model", ...fields },
      image_ai_results: [{ image_url: "https://example.com/test.png", prediction: 0 }],
    });
    const { detection } = await detections.fetchDetectionDetail(rows[0].id);
    assert.equal(detection.textAnalysis.probDrug, expected);
    assert.equal(detection.textScore, expected);
    assert.equal(detection.textFlagged, true);
    assert.equal(detection.imageAnalyses[0].flagged, false);
  }
});

test("zero collected posts and duplicate-only crawls are successful completions", async () => {
  process.env.INTERNAL_API_KEY = "test-internal-key";
  for (const result of [
    { total: 0, saved: 0, skipped: 0, failed: 0 },
    { total: 10, saved: 0, skipped: 10, failed: 0 },
  ]) {
    globalThis.fetch = async (url) => Response.json(new URL(url).pathname === "/profile"
      ? { id: "admin-1" }
      : { results: [{ admin_id: "admin-1", ...result, error: null }] });
    assert.deepEqual(await crawl.triggerCrawl(10), { success: true, result });
  }
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

test("analysis statistics come from the aggregate endpoint", async () => {
  const trend = [{ date: "2026-11-23", positive: 5, negative: 2 }];
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).pathname, "/dashboard/analytics");
    return Response.json({
      trend,
      text: { analyzed: 4, source: { model: 1, rule: 3 }, top_terms: [{ term: "term", count: 2 }], top_intents: [{ intent: "intent", count: 3 }] },
      image: { total_images: 6, ocr_with_text: 2, ocr_without_text: 4, objects: [{ class_name: "Heroin", count: 1 }] },
    });
  };
  assert.deepEqual(await detections.fetchAnalysisStats(), {
    trend, analyzedText: 4, textModel: 1, textRuleOnly: 3,
    terms: [{ name: "term", count: 2 }], intents: [{ name: "intent", count: 3 }],
    imageTotal: 6, withOcr: 2, withoutOcr: 4, objects: [{ name: "Heroin", count: 1 }],
  });
  globalThis.fetch = async () => Response.json({ trend });
  assert.equal(await detections.fetchAnalysisStats(), null);
});

test("null text predictions preserve source instead of becoming negative", async () => {
  for (const source of ['no_supported_characters','model','rule','future_reason']) {
    const raw = {...rows[0], text_ai_result:{prediction:null,source,text_score:null,matched_terms:[],matched_intents:[]}};
    globalThis.fetch = async () => Response.json([raw]);
    const list = await detections.fetchDetections();
    assert.equal(list.items[0].textFlagged,null);
    assert.equal(list.items[0].textSource,source);
    globalThis.fetch = async () => Response.json(raw);
    const detail = await detections.fetchDetectionDetail(raw.id);
    assert.equal(detail.detection.textAnalysis.flagged,null);
    assert.equal(detail.detection.textAnalysis.source,source);
  }
});
test("detail OCR arrays retain every verdict and score", async () => {
  const ocr = (text,prediction,score) => ({ocr_text:text,prediction,ocr_text_score:score,matched_terms:['term'],matched_intents:['intent']});
  const raw = {...rows[0],image_ai_results:[
    {image_url:'https://example.com/a.png',prediction:0,image_score:.1,detected_objects:[],ocr_text_results:[ocr('first',1,90),ocr('second',0,0),{...ocr('third',null,null),source:'no_supported_characters'}]},
    {image_url:'https://example.com/b.png',prediction:0,image_score:.2,detected_objects:[]},
  ]};
  globalThis.fetch = async () => Response.json(raw);
  const {detection} = await detections.fetchDetectionDetail(raw.id);
  assert.equal(detection.images[0].ocrText,'first\nsecond\nthird');
  assert.deepEqual(detection.images[0].ocrResults.map(r=>[r.flagged,r.probDrug]),[[true,.9],[false,0],[null,null]]);
  assert.deepEqual(detection.images[0].ocrResults[0].matchedTerms,['term']);
  assert.deepEqual(detection.images[1].ocrResults,[]);
});
test("crawl defaults omitted failed count to zero without accepting invalid counts", async () => {
  process.env.INTERNAL_API_KEY = 'test';
  for (const failed of [undefined,null,-1,'0']) {
    globalThis.fetch = async url=>Response.json(url.endsWith('/profile') ? {id:'a'} : {results:[{admin_id:'a',total:1,saved:1,skipped:0,failed}]});
    const result = await crawl.triggerCrawl(10);
    assert.equal(result.success,failed===undefined);
    if(result.success) assert.equal(result.result.failed,0);
  }
});

test("list OCR verdict uses only is_ocr_drug booleans independently of OCR presence", async () => {
  const values = [true,false,null,undefined,1,0,'true'];
  globalThis.fetch = async () => Response.json(values.map((value,index)=>({...rows[0],id:String(index),image_ai_results:[{prediction:0,image_score:0,has_ocr_text:true,is_ocr_drug:value}]})));
  const {items} = await detections.fetchDetections();
  assert.deepEqual(items.map(item=>item.ocrFlagged),[true,false,null,null,null,null,null]);
  assert.ok(items.every(item=>item.imageAnalyses[0].hasOcrText));
});

test('OCR image verdicts aggregate without treating missing predictions as negative', async () => {
  const batches = [[true,null],[false,false],[false,null],[null],[]];
  globalThis.fetch=async()=>Response.json(batches.map((values,i)=>({...rows[0],id:String(i),image_ai_results:values.map(is_ocr_drug=>({prediction:0,image_score:0,has_ocr_text:true,is_ocr_drug}))})));
  const {items}=await detections.fetchDetections();
  assert.deepEqual(items.map(item=>item.ocrFlagged),[true,false,null,null,null]);
  assert.deepEqual(filterDetections(items,readFilters(new URLSearchParams('types=ocr')),'2026-11-23').map(item=>item.id),['0']);
});

test('OCR presence takes precedence over verdicts, including mixed image batches', async () => {
  const image = (has_ocr_text,is_ocr_drug) => ({prediction:0,image_score:0,has_ocr_text,is_ocr_drug});
  const batches = [
    [image(false,false)], [image(false,true)], [],
    [image(false,true),image(true,false)],
    [image(false,false),image(true,true)],
    [image(false,true),image(true,null)],
  ];
  globalThis.fetch = async () => Response.json(batches.map((image_ai_results,i)=>({...rows[0],id:String(i),image_ai_results})));
  const {items} = await detections.fetchDetections();
  assert.deepEqual(items.map(item=>item.ocrFlagged),[null,null,null,false,true,null]);
  assert.equal(items[1].imageAnalyses[0].ocrFlagged,null);
  assert.deepEqual(filterDetections(items,readFilters(new URLSearchParams('types=ocr')),'2026-11-23').map(item=>item.id),['4']);
});
