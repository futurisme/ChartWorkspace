import { inflateRawSync } from 'node:zlib';
import { decodeAlienFramedCandidates } from '@/features/maps/shared/fadhil-symbol-codec';

const FADHIL_WEB_MAGIC = 'chartworkspace/fadhil-web';
const FADHIL_WEB_ALGO = 'deflate-raw+alien-b8192';

type FadhilCompressedSnapshot = {
  magic: typeof FADHIL_WEB_MAGIC;
  algo: typeof FADHIL_WEB_ALGO;
  data: string;
};

export function decodeServerFadhilWebSnapshot(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const payload = raw as Partial<FadhilCompressedSnapshot>;
  if (payload.magic !== FADHIL_WEB_MAGIC || payload.algo !== FADHIL_WEB_ALGO || typeof payload.data !== 'string') {
    return null;
  }

  const candidates = decodeAlienFramedCandidates(payload.data);
  let lastError: unknown = null;

  for (const bytes of candidates) {
    try {
      return inflateRawSync(Buffer.from(bytes)).toString('utf8');
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown');
  throw new Error(`Dekompresi fAdHiL Web gagal: ${message}`);
}
