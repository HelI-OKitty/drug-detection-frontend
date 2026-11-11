import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterDetections, readFilters } from '../src/lib/detection-filters.ts';
const rows = [
  { id: 'text', isDrug: true, textFlagged: true, imageAnalyses: [], status: 'unreviewed', detectedAt: '2026-11-11 00:00', summary: '게시글', nickname: '@author', keywords: ['keyword'] },
  { id: 'image', isDrug: true, textFlagged: false, imageAnalyses: [{ flagged: true }], status: 'reviewing', detectedAt: '2026-11-05 23:59', summary: '이미지', nickname: '@other', keywords: [] },
  { id: 'both', isDrug: true, textFlagged: true, imageAnalyses: [{ flagged: true }], status: 'confirmed', detectedAt: '2026-11-04 23:59', summary: '둘 다', nickname: '@both', keywords: [] },
  { id: 'negative', isDrug: false, textFlagged: false, imageAnalyses: [{ flagged: false }], status: 'unreviewed', detectedAt: '2026-11-11 12:00', summary: '음성', nickname: '@normal', keywords: [] },
  { id: 'unknown', isDrug: null, textFlagged: null, imageAnalyses: [], status: 'unreviewed', detectedAt: '-', summary: '미제공', nickname: '@unknown', keywords: [] },
  { id: 'positive-unknown-type', isDrug: true, textFlagged: null, imageAnalyses: [], status: 'unreviewed', detectedAt: '2026-11-11 14:00', summary: '종합만', nickname: '@unknown-type', keywords: [] },
];
const ids = (query) => filterDetections(rows, readFilters(new URLSearchParams(query)), '2026-11-11').map((r) => r.id);
test('negative and unknown are separate; positive types use actual verdicts and OR', () => {
  assert.deepEqual(ids('verdict=negative'), ['negative']);
  assert.deepEqual(ids('verdict=unknown'), ['unknown']);
  assert.deepEqual(ids('verdict=positive&types=text'), ['text', 'both']);
  assert.deepEqual(ids('verdict=positive&types=text,image'), ['text', 'image', 'both']);
  assert.deepEqual(ids('verdict=negative&types=text'), []);
});
test('review status, keyword and inclusive KST calendar dates compose', () => {
  assert.deepEqual(ids('verdict=positive&period=7'), ['text', 'image', 'positive-unknown-type']);
  assert.deepEqual(ids('verdict=positive&status=unreviewed&period=today&q=KEYWORD'), ['text']);
  assert.deepEqual(ids('period=custom&from=2026-11-05&to=2026-11-05'), ['image']);
  assert.deepEqual(ids('period=custom&from=2026-11-12&to=2026-11-11'), []);
});
test('invalid URL filters are normalized; OCR text or scores never imply OCR positive', () => {
  const filters = readFilters(new URLSearchParams('verdict=invalid&status=invalid&period=custom&from=2026-02-30&types=ocr,text,text'));
  assert.equal(filters.verdict, 'all');
  assert.equal(filters.status, 'all');
  assert.equal(filters.from, '');
  assert.deepEqual(filters.types, ['text']);
});
