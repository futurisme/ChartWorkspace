import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeAlienFramedCandidates, encodeAlienFramed } from './fadhil-symbol-codec';

test('alien framed codec roundtrip keeps bytes stable', () => {
  const source = new Uint8Array(Array.from({ length: 33 }, (_, i) => (i * 17) % 256));
  const token = encodeAlienFramed(source);
  const [decoded] = decodeAlienFramedCandidates(token, source.length);
  assert.deepEqual(Array.from(decoded), Array.from(source));
});

test('alien decoder provides fallback candidates for unframed tokens', () => {
  const source = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
  const framed = encodeAlienFramed(source);
  const unframed = framed.slice(framed.indexOf('~') + 1);
  const candidates = decodeAlienFramedCandidates(unframed);
  assert.ok(candidates.length >= 1);
  assert.equal(candidates[0].length >= source.length, true);
});
