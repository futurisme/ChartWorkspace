import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeFadhilArchive, encodeFadhilArchive } from './fadhil-archive';

function stripLengthHeader(token: string): string {
  const idx = token.indexOf('~');
  return idx > 0 ? token.slice(idx + 1) : token;
}

test('fAdHiL v2 roundtrip decrypts correctly', async () => {
  const payload = {
    magic: 'chartworkspace/archive',
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceMapId: '0420',
    snapshot: 'AAAAAQIDBAUGBwg=',
  };

  const encoded = await encodeFadhilArchive(payload, 'workspace-archive');
  const decoded = await decodeFadhilArchive(encoded);

  assert.equal(decoded.contentType, 'workspace-archive');
  assert.deepEqual(decoded.payload, payload);
});

test('fAdHiL decoder supports legacy unframed alien tokens', async () => {
  const payload = {
    magic: 'chartworkspace/archive',
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceMapId: '0999',
    snapshot: 'AQIDBAUGBwgJCgsMDQ4P',
  };

  const encoded = await encodeFadhilArchive(payload, 'workspace-archive');
  const parts = encoded.split('§');
  assert.equal(parts.length, 6);

  // simulate older v2 tokens without byte-length headers
  parts[3] = stripLengthHeader(parts[3]);
  parts[4] = stripLengthHeader(parts[4]);
  const legacyUnframed = parts.join('§');

  const decoded = await decodeFadhilArchive(legacyUnframed);
  assert.equal(decoded.contentType, 'workspace-archive');
  assert.deepEqual(decoded.payload, payload);
});
