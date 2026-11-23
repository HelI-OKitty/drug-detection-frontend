import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { prepareAnalyzeRequest } from '../src/lib/text-detector.ts';
const output = ts.transpileModule(readFileSync(new URL('../src/app/api/analyze/route.ts', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded = {exports:{}};
new Function('require','module','exports',output)((name)=> {
  if (name==='next/server') return {NextResponse:{json:(data,init)=>Response.json(data,init)}};
  assert.equal(name,'@/lib/text-detector');
  return {prepareAnalyzeRequest};
},loaded,loaded.exports);
const originalFetch = globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
const request=(body)=>new Request('http://localhost/api/analyze',{method:'POST',body:JSON.stringify(body)});
test('proxy forwards only text and images, preserving nested response and error statuses',async()=>{
  for (const status of [200,422,429,500]) {
    const body={is_drug:true,text_ai_result:null,image_ai_results:[]};
    globalThis.fetch=async(url,init)=>{
      assert.equal(new URL(url).pathname,'/public/analyze');
      assert.deepEqual(JSON.parse(init.body),{text:'본문',images:['aA==','aQ==']});
      return Response.json(body,{status});
    };
    const result=await loaded.exports.POST(request({text:' 본문 ',images:['aA==','aQ=='],image:'legacy',admin_id:'ignored'}));
    assert.equal(result.status,status);
    assert.deepEqual(await result.json(),body);
  }
});
test('proxy rejects invalid batches rather than silently dropping images',async()=>{
  globalThis.fetch=async()=>assert.fail('must not forward');
  for (const body of [{images:[]},{image:'aA=='},{text:'본문',images:[3]},{text:'본문',images:'aA=='}]) {
    assert.equal((await loaded.exports.POST(request(body))).status,422);
  }
  assert.equal((await loaded.exports.POST(request({images:['a'.repeat(4*1024*1024+4)]}))).status,413);
  assert.equal((await loaded.exports.POST(new Request('http://localhost',{method:'POST',body:'{' }))).status,400);
});
