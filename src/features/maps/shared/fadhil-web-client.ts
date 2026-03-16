import { decodeAlienFramedCandidates, encodeAlienFramed } from '@/features/maps/shared/fadhil-symbol-codec';

const FADHIL_WEB_MAGIC = 'chartworkspace/fadhil-web';
const FADHIL_WEB_ALGO = 'deflate-raw+alien-b8192';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export type FadhilCompressedSnapshot = {
  magic: typeof FADHIL_WEB_MAGIC;
  algo: typeof FADHIL_WEB_ALGO;
  data: string;
};

export async function encodeFadhilWebSnapshot(snapshot: string): Promise<FadhilCompressedSnapshot | null> {
  if (typeof CompressionStream === 'undefined') {
    return null;
  }

  const source = new TextEncoder().encode(snapshot);
  if (source.length < 8 * 1024) {
    return null;
  }

  const stream = new Blob([toArrayBuffer(source)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  if (compressed.length >= source.length) {
    return null;
  }

  return {
    magic: FADHIL_WEB_MAGIC,
    algo: FADHIL_WEB_ALGO,
    data: encodeAlienFramed(compressed),
  };
}

export async function decodeFadhilWebSnapshot(payload: FadhilCompressedSnapshot): Promise<string> {
  if (payload.magic !== FADHIL_WEB_MAGIC || payload.algo !== FADHIL_WEB_ALGO) {
    throw new Error('Payload fAdHiL Web tidak valid.');
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Browser tidak mendukung DecompressionStream.');
  }

  const [bytes] = decodeAlienFramedCandidates(payload.data);
  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const plain = new Uint8Array(await new Response(stream).arrayBuffer());
  return new TextDecoder().decode(plain);
}
