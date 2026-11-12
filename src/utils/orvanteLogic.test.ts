import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp01,
  computeWordFillFactor,
  interpolateWordColor,
  formatCounterValue,
  computeRecorderState,
} from './orvanteLogic';

test('clamp01 clamps out-of-range values to [0, 1]', () => {
  assert.equal(clamp01(-0.5), 0);
  assert.equal(clamp01(0), 0);
  assert.equal(clamp01(0.45), 0.45);
  assert.equal(clamp01(1), 1);
  assert.equal(clamp01(2.3), 1);
});

test('computeWordFillFactor implements 3-word soft edge in reading order', () => {
  const totalWords = 29;
  assert.equal(computeWordFillFactor(0, totalWords, 0, 3), 0);
  assert.equal(computeWordFillFactor(28, totalWords, 0, 3), 0);
  assert.equal(computeWordFillFactor(0, totalWords, 1, 3), 1);
  assert.equal(computeWordFillFactor(28, totalWords, 1, 3), 1);

  // At mid-scroll, earlier words are more filled than later words
  const w5 = computeWordFillFactor(5, totalWords, 0.25, 3);
  const w6 = computeWordFillFactor(6, totalWords, 0.25, 3);
  const w7 = computeWordFillFactor(7, totalWords, 0.25, 3);
  const w8 = computeWordFillFactor(8, totalWords, 0.25, 3);
  assert.ok(w5 >= w6 && w6 >= w7 && w7 >= w8, 'words fill strictly in reading order');
  assert.ok(w6 > 0 && w6 < 1, 'soft edge produces intermediate fractional fill');
});

test('interpolateWordColor maps 0 to #6f6f6f and 1 to #f4f4f4', () => {
  assert.equal(interpolateWordColor(0), 'rgb(111, 111, 111)');
  assert.equal(interpolateWordColor(1), 'rgb(244, 244, 244)');
});

test('formatCounterValue counts from 0 to target with suffix', () => {
  assert.equal(formatCounterValue(400, 0, '+'), '0+');
  assert.equal(formatCounterValue(400, 1, '+'), '400+');
  assert.equal(formatCounterValue(56, 1, 'M+'), '56M+');
  assert.equal(formatCounterValue(10, 1, '+'), '10+');
});

test('computeRecorderState follows exact ?rec=1 timeline windows', () => {
  const before = computeRecorderState(1.0);
  assert.equal(before.statementProgress, 0);
  assert.equal(before.trustProgress, 0);
  assert.equal(before.awardsLifted, false);

  const mid = computeRecorderState(2.75);
  assert.ok(mid.statementProgress > 0.45 && mid.statementProgress < 0.55);
  assert.equal(mid.trustProgress, 0);

  const done = computeRecorderState(5.5);
  assert.equal(done.statementProgress, 1);
  assert.equal(done.trustProgress, 1);
  assert.equal(done.awardsLifted, true);
  assert.ok(done.photoDriftPx > 0);
});
