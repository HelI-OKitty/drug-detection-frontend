import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { analyzeContent, analyzeText, prepareAnalyzeRequest, MAX_ANALYZE_BODY_BYTES, MAX_IMAGE_BYTES } from "../src/lib/text-detector.ts";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const textResult = (fields = {}) => ({ prediction: 1, source: 'rule', text_score: null, matched_terms: ['마약'], matched_intents: ['판매'], ...fields });
const imageResult = (fields = {}) => ({ prediction: 0, image_score: 0.12, detected_objects: [], ocr_text: '', ...fields });
const response = (fields = {}) => ({ is_drug: true, text_ai_result: textResult(), image_ai_results: [], ...fields });

test('sends text and all images in exactly one request; preserves independent verdicts and order', async () => {
  let requests = 0;
  globalThis.fetch = async (url, init) => {
    requests++;
    assert.equal(new URL(url).pathname, '/public/analyze');
    assert.equal(init.method, 'POST');
    assert.equal(init.cache, 'no-store');
    assert.deepEqual(JSON.parse(init.body), { text: '테스트', images: ['aGVsbG8=', 'd29ybGQ='] });
    return Response.json(response({ is_drug: false, image_ai_results: [imageResult({ prediction: 1, image_score: .87, ocr_text: '추출 텍스트', detected_objects: [{class_name:'Sample',confidence:.8}] }), imageResult()] }));
  };
  const result = await analyzeContent({ text: ' 테스트 ', images: ['aGVsbG8=', 'd29ybGQ='] });
  assert.equal(requests, 1);
  assert.equal(result.isDrug, false);
  assert.equal(result.textResult.isDrug, true);
  assert.deepEqual(result.imageResults.map((r) => r.isDrug), [true, false]);
  assert.equal(result.imageResults[0].score, .87);
  assert.equal(result.imageResults[0].ocrText, '추출 텍스트');
  assert.deepEqual(result.imageResults[0].detectedObjects, [{className:'Sample',confidence:.8}]);
});
test('rule results preserve supplied scores including zero without inventing missing scores', async () => {
  for (const [score, expected] of [[99, .99], [12.18, 12.18 / 100], [0, 0], [null, null], [undefined, null]]) {
    globalThis.fetch = async () => Response.json(response({ text_ai_result: textResult({ text_score: score }) }));
    const result = await analyzeContent({ text: '테스트' });
    assert.equal(result.textResult.source, 'rule');
    assert.equal(result.textResult.score, expected);
    assert.deepEqual(result.textResult.matchedTerms, ['마약']);
    assert.deepEqual(result.textResult.matchedIntents, ['판매']);
  }
});
test('text scores are percentages while image scores and confidence are ratios', async () => {
  for (const [value, expected] of [[12.18,12.18/100],[0,0],[100,1],[.12,.0012],[null,null],['12.18',null],[-1,null],[101,null]]) {
    globalThis.fetch = async () => Response.json(response({ text_ai_result: textResult({ source:'model', text_score:value }) }));
    assert.equal((await analyzeContent({text:'테스트'})).textResult.score, expected);
  }
  globalThis.fetch = async () => Response.json(response({ text_ai_result:null, image_ai_results:[imageResult({image_score:87})] }));
  assert.equal((await analyzeContent({images:['aA==']})).imageResults[0].score,null);
});
test('image-only and text-only payloads support null text results and empty image results', async () => {
  globalThis.fetch = async (url, init) => {
    assert.deepEqual(JSON.parse(init.body), {images:['aA==']});
    return Response.json(response({text_ai_result:null,image_ai_results:[imageResult()]}));
  };
  assert.equal((await analyzeContent({images:['aA==']})).textResult,null);
  for (const isDrug of [true,false]) {
    globalThis.fetch = async () => Response.json(response({is_drug:isDrug}));
    assert.deepEqual(await analyzeText('テスト'),{is_drug:isDrug});
  }
});
test('invalid inputs are rejected before fetch and request size is bounded', async () => {
  globalThis.fetch = async () => assert.fail('must not call backend');
  for (const value of ['', '  ', null, 123, {}]) await assert.rejects(analyzeText(value), /텍스트를 입력/);
  for (const input of [{}, {images:[]}, {image:'legacy'}, {images:'invalid'}, {text:'valid',images:[null]}, {images:[' ']}, {text:12}]) {
    assert.equal(prepareAnalyzeRequest(input).status,422);
  }
  assert.equal(prepareAnalyzeRequest({text:'a'.repeat(MAX_ANALYZE_BODY_BYTES)}).status,413);
  await assert.rejects(analyzeContent({images:['a'.repeat(4*1024*1024 + 4)]}), /파일당 3MB/);
});
test('malformed or legacy responses and incomplete image batches cannot appear as valid results', async () => {
  for (const body of [null, {}, response({is_drug:'false'}), response({text_ai_result:{}}), response({image_ai_results:null})]) {
    globalThis.fetch = async () => Response.json(body);
    await assert.rejects(analyzeContent({text:'테스트'}), /결과를 확인/);
  }
  globalThis.fetch = async () => Response.json(response());
  await assert.rejects(analyzeContent({images:['aA==']}), /이미지 1장.*0건/);
  globalThis.fetch = async () => Response.json(response({image_ai_results:[imageResult({prediction:null})]}));
  await assert.rejects(analyzeContent({images:['aA==']}), /결과를 확인/);
});
test('backend errors, network failures and timeouts have actionable messages', async () => {
  for (const [status, message] of [[422,/내용을 확인/],[429,/요청이 많/],[413,/용량/],[500,/완료하지 못/],[504,/시간이 초과/]]) {
    globalThis.fetch = async () => new Response('private server details',{status});
    await assert.rejects(analyzeText('테스트'),message);
  }
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(analyzeText('테스트'),/연결하지 못/);
  globalThis.fetch = async () => { throw new DOMException('timeout','TimeoutError'); };
  await assert.rejects(analyzeText('테스트'),/시간이 초과/);
});


test('deployed OCR array and unavailable text prediction preserve separate results', async () => {
  globalThis.fetch = async () => Response.json(response({
    is_drug: false,
    text_ai_result: textResult({ prediction: null, source: 'model' }),
    image_ai_results: [{ prediction: 0, image_score: 0, detected_objects: [], ocr_text_results: [
      { ocr_text: 'OCR text', prediction: 1, ocr_text_score: 12.18, matched_terms: ['term'], matched_intents: ['intent'] },
    ] }],
  }));
  const result = await analyzeContent({ images: ['aA=='] });
  assert.equal(result.textResult.isDrug, null);
  assert.equal(result.isDrug, false);
  assert.equal(result.imageResults[0].isDrug, false);
  assert.equal(result.imageResults[0].ocrResults[0].isDrug, true);
  assert.equal(result.imageResults[0].ocrResults[0].score, 12.18 / 100);
  assert.equal(result.imageResults[0].ocrResults[0].text, 'OCR text');
  globalThis.fetch = async () => Response.json({is_drug:false,text_ai_result:null,image_ai_results:[{prediction:0,image_score:0,detected_objects:[],ocr_text_results:[]}]});
  assert.deepEqual((await analyzeContent({images:['aA==']})).imageResults[0].ocrResults, []);
});
test('a skipped image result cannot be shown as a successful negative verdict', async () => {
  globalThis.fetch = async () => Response.json({is_drug:false,text_ai_result:null,image_ai_results:[]});
  await assert.rejects(analyzeContent({images:['aA==']}), /이미지 1장.*0건.*누락/);
  globalThis.fetch = async () => Response.json({is_drug:false,text_ai_result:null,image_ai_results:[{prediction:0,image_score:0,detected_objects:[],ocr_text_results:[]}]});
  await assert.rejects(analyzeContent({images:['aA==','aQ==']}), /이미지 2장.*1건.*누락/);
});

test('no_supported_characters input yields guidance-only results without inventing a verdict', async () => {
  // 텍스트: 판정·점수·매칭 없이 source만 보존. prediction·점수가 없어도(빈 {}과 달리) 예외 없이 처리된다.
  globalThis.fetch = async () => Response.json(response({ text_ai_result: { source: 'no_supported_characters' } }));
  const text = (await analyzeContent({ text: '!@#$' })).textResult;
  assert.deepEqual(text, { isDrug: null, source: 'no_supported_characters', score: null, matchedTerms: [], matchedIntents: [] });
  // 잘못된 빈 응답은 여전히 거부되어야 한다(분석 불가와 구분).
  globalThis.fetch = async () => Response.json(response({ text_ai_result: {} }));
  await assert.rejects(analyzeContent({ text: '테스트' }), /결과를 확인/);
  // OCR도 텍스트와 동일하게 분석 불가를 처리하고, model/rule source는 그대로 보존한다.
  globalThis.fetch = async () => Response.json(response({ text_ai_result: null, image_ai_results: [imageResult({ ocr_text_results: [
    { ocr_text: '깨진 문구', source: 'no_supported_characters' },
    { ocr_text: 'OCR', prediction: 1, source: 'model', ocr_text_score: 90, matched_terms: ['용어'], matched_intents: ['판매'] },
  ] })] }));
  const ocrResults = (await analyzeContent({ images: ['aA=='] })).imageResults[0].ocrResults;
  assert.deepEqual(ocrResults[0], { text: '깨진 문구', isDrug: null, source: 'no_supported_characters', score: null, matchedTerms: [], matchedIntents: [] });
  assert.equal(ocrResults[1].source, 'model');
  assert.equal(ocrResults[1].isDrug, true);
  assert.equal(ocrResults[1].score, 0.9);
});
test('batch results preserve each image and every OCR entry exactly as single requests do', async () => {
  const images = [
    { prediction: 1, image_score: .3125, detected_objects: [{class_name:'Heroin',confidence:.8224}], ocr_text_results: [
      {ocr_text:'첫 번째 이미지 문구',prediction:0,ocr_text_score:.32,matched_terms:['용어 A'],matched_intents:[]},
      {ocr_text:'첫 번째 이미지 추가 문구',prediction:1,ocr_text_score:92,matched_terms:['용어 B'],matched_intents:['판매']},
    ] },
    { prediction: 0, image_score: .0161, detected_objects: [], ocr_text_results: [
      {ocr_text:'두 번째 이미지 문구',prediction:0,ocr_text_score:0,matched_terms:[],matched_intents:[]},
    ] },
  ];
  const inputs = ['YQ==','Yg=='];
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(init.body);
    return Response.json(response({text_ai_result:textResult({source:'model',text_score:.28}), image_ai_results:request.images.map(value=>images[inputs.indexOf(value)])}));
  };
  const singles = [];
  for (const input of inputs) singles.push((await analyzeContent({text:'테스트',images:[input]})).imageResults[0]);
  const batch = await analyzeContent({text:'테스트',images:inputs});
  assert.deepEqual(batch.imageResults, singles);
  assert.equal(batch.textResult.score,.28/100);
  assert.deepEqual(batch.imageResults.map(image=>image.ocrResults.map(ocr=>ocr.text)), [
    ['첫 번째 이미지 문구','첫 번째 이미지 추가 문구'],['두 번째 이미지 문구'],
  ]);
});

test('allows five 3MB images while enforcing individual size and count limits', () => {
  const exact = Buffer.alloc(MAX_IMAGE_BYTES).toString('base64');
  assert.equal(prepareAnalyzeRequest({ images: Array(5).fill(exact) }).error, undefined);
  for (const size of [MAX_IMAGE_BYTES - 1, MAX_IMAGE_BYTES - 2]) {
    assert.equal(prepareAnalyzeRequest({ images: [Buffer.alloc(size).toString('base64')] }).error, undefined);
  }
  assert.equal(prepareAnalyzeRequest({ images: [Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64')] }).status, 413);
  assert.equal(prepareAnalyzeRequest({ images: Array(6).fill('aA==') }).status, 422);
});

test('optional response fields default safely, but requested image results remain required', async () => {
  globalThis.fetch = async () => Response.json({is_drug:false});
  const text = await analyzeContent({text:'test'});
  assert.equal(text.textResult,null);
  assert.deepEqual(text.imageResults,[]);
  await assert.rejects(analyzeContent({images:['aA==']}), /누락/);
  globalThis.fetch = async () => Response.json({is_drug:false,image_ai_results:[{prediction:0,image_score:0,detected_objects:[]}]});
  const image = await analyzeContent({images:['aA==']});
  assert.deepEqual(image.imageResults[0].ocrResults,[]);
  globalThis.fetch = async () => Response.json(response({text_ai_result:textResult({prediction:null,source:'future_reason'})}));
  assert.equal((await analyzeContent({text:'test'})).textResult.source,'future_reason');
});
