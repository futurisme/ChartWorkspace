export type FadhilContentType = 'workspace-archive' | 'featurelib-gameideas';

export type FadhilArchiveFile = {
  magic: 'chartworkspace/fadhil-archive';
  version: 2;
  algo: 'aes-gcm+deflate+alien-b8192';
  compressed: boolean;
  iv: string;
  data: string;
  contentType: FadhilContentType;
  exportedAt: string;
};


export type LegacyFadhilArchiveFile = {
  magic: 'chartworkspace/fadhil-archive';
  version: 1;
  algo: 'aes-gcm+gzip+base64url';
  compressed: boolean;
  iv: string;
  data: string;
  contentType: FadhilContentType;
  exportedAt: string;
};

const MAGIC = 'chartworkspace/fadhil-archive';
const CURRENT_VERSION = 2;
const CURRENT_ALGO = 'aes-gcm+deflate+alien-b8192';
const LEGACY_ALGO = 'aes-gcm+gzip+base64url';
const PREFIX = '🜂fAdHiL🜁';
const ALIEN_BLOCK_START = 0x3400;
const ALIEN_BASE = 8192;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

const PASSPHRASE_V2 = 'FadhilAkbar.ChartWorkspace.FeatureLib.v2';
const SALT_V2 = 'ChartWorkspace::fAdHiL::Alien::2026';
const PASSPHRASE_V1 = 'FadhilAkbar.ChartWorkspace.FeatureLib.v1';
const SALT_V1 = 'ChartWorkspace::fAdHiL::2026';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

function encodeAlienSymbols(bytes: Uint8Array): string {
  let bits = 0;
  let bitCount = 0;
  let out = '';

  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    bitCount += 8;

    while (bitCount >= 13) {
      bitCount -= 13;
      const value = (bits >> bitCount) & 0x1fff;
      out += String.fromCharCode(ALIEN_BLOCK_START + value);
      bits &= (1 << bitCount) - 1;
    }
  }

  if (bitCount > 0) {
    const value = (bits << (13 - bitCount)) & 0x1fff;
    out += String.fromCharCode(ALIEN_BLOCK_START + value);
  }

  return out;
}

function decodeAlienSymbols(text: string): Uint8Array {
  let bits = 0;
  let bitCount = 0;
  const out: number[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const value = text.charCodeAt(i) - ALIEN_BLOCK_START;
    if (value < 0 || value >= ALIEN_BASE) {
      throw new Error('Simbol alien .fAdHiL rusak / di luar rentang.');
    }

    bits = (bits << 13) | value;
    bitCount += 13;

    while (bitCount >= 8) {
      bitCount -= 8;
      out.push((bits >> bitCount) & 0xff);
      bits &= (1 << bitCount) - 1;
    }
  }

  return new Uint8Array(out);
}

function encodeAlienBase8192(bytes: Uint8Array): string {
  return `${bytes.length.toString(36)}~${encodeAlienSymbols(bytes)}`;
}

function decodeAlienBase8192Candidates(text: string, expectedLength?: number): Uint8Array[] {
  const sep = text.indexOf('~');
  if (sep > 0) {
    const rawLen = text.slice(0, sep);
    const expected = Number.parseInt(rawLen, 36);
    if (!Number.isFinite(expected) || expected < 0) {
      throw new Error('Header panjang simbol alien .fAdHiL tidak valid.');
    }

    const decoded = decodeAlienSymbols(text.slice(sep + 1));
    if (decoded.length < expected) {
      throw new Error('Data simbol alien .fAdHiL terpotong.');
    }

    return [decoded.slice(0, expected)];
  }

  const decoded = decodeAlienSymbols(text);
  const candidates: Uint8Array[] = [decoded];
  if (decoded.length > 0) {
    candidates.push(decoded.slice(0, decoded.length - 1));
  }

  if (typeof expectedLength === 'number') {
    const exact = candidates.find((bytes) => bytes.length === expectedLength);
    if (exact) {
      return [exact];
    }
  }

  return candidates;
}

async function maybeDeflate(bytes: Uint8Array): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  if (typeof CompressionStream === 'undefined') {
    return { bytes, compressed: false };
  }

  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const result = new Uint8Array(await new Response(stream).arrayBuffer());
  if (result.length >= bytes.length) {
    return { bytes, compressed: false };
  }

  return { bytes: result, compressed: true };
}

async function inflate(bytes: Uint8Array, format: 'deflate-raw' | 'gzip', compressed: boolean): Promise<Uint8Array> {
  if (!compressed) return bytes;
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Browser tidak mendukung decompression stream untuk file .fAdHiL terkompresi.');
  }

  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function getKey(mode: 'legacy' | 'current') {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(mode === 'legacy' ? PASSPHRASE_V1 : PASSPHRASE_V2),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(mode === 'legacy' ? SALT_V1 : SALT_V2),
      iterations: mode === 'legacy' ? 120000 : 150000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function serializeV2(file: FadhilArchiveFile): string {
  return `${PREFIX}§${file.contentType}§${file.compressed ? '1' : '0'}§${file.iv}§${file.data}§${file.exportedAt}`;
}

function parseV2(raw: string): Partial<FadhilArchiveFile> | null {
  if (!raw.startsWith(`${PREFIX}§`)) {
    return null;
  }

  const parts = raw.split('§');
  if (parts.length !== 6) {
    throw new Error('Format string .fAdHiL futuristik tidak valid.');
  }

  const [, contentType, compressedFlag, iv, data, exportedAt] = parts;
  return {
    magic: MAGIC,
    version: CURRENT_VERSION,
    algo: CURRENT_ALGO,
    contentType: contentType as FadhilContentType,
    compressed: compressedFlag === '1',
    iv,
    data,
    exportedAt,
  };
}

export async function encodeFadhilArchive(payload: unknown, contentType: FadhilContentType): Promise<string> {
  const text = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const sourceBytes = encoder.encode(text);
  const { bytes: packedBytes, compressed } = await maybeDeflate(sourceBytes);

  const key = await getKey('current');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(packedBytes));

  const file: FadhilArchiveFile = {
    magic: MAGIC,
    version: CURRENT_VERSION,
    algo: CURRENT_ALGO,
    compressed,
    iv: encodeAlienBase8192(iv),
    data: encodeAlienBase8192(new Uint8Array(cipher)),
    contentType,
    exportedAt: new Date().toISOString(),
  };

  return serializeV2(file);
}

export async function decodeFadhilArchive(text: string): Promise<{ payload: unknown; contentType: FadhilContentType }> {
  const parsedV2 = parseV2(text);
  const parsed = parsedV2 ?? (JSON.parse(text) as Partial<FadhilArchiveFile | LegacyFadhilArchiveFile>);

  const isLegacy = parsed.magic === MAGIC && parsed.version === 1 && parsed.algo === LEGACY_ALGO;
  const isCurrent = parsed.magic === MAGIC && parsed.version === CURRENT_VERSION && parsed.algo === CURRENT_ALGO;
  if (!isLegacy && !isCurrent) {
    throw new Error('Format file .fAdHiL tidak valid.');
  }
  if ((parsed.contentType !== 'workspace-archive' && parsed.contentType !== 'featurelib-gameideas') || !parsed.data || !parsed.iv) {
    throw new Error('Metadata file .fAdHiL tidak lengkap.');
  }

  const key = await getKey(isLegacy ? 'legacy' : 'current');
  if (isLegacy) {
    const cipherBytes = fromBase64Url(parsed.data);
    const iv = fromBase64Url(parsed.iv);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(cipherBytes));
    const unpacked = await inflate(new Uint8Array(plain), 'gzip', Boolean(parsed.compressed));
    const payload = JSON.parse(new TextDecoder().decode(unpacked));

    return {
      payload,
      contentType: parsed.contentType,
    };
  }

  const ivCandidates = decodeAlienBase8192Candidates(parsed.iv, 12);
  const cipherCandidates = decodeAlienBase8192Candidates(parsed.data);
  let lastError: unknown = null;

  for (const iv of ivCandidates) {
    for (const cipherBytes of cipherCandidates) {
      try {
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(cipherBytes));
        const unpacked = await inflate(new Uint8Array(plain), 'deflate-raw', Boolean(parsed.compressed));
        const payload = JSON.parse(new TextDecoder().decode(unpacked));

        return {
          payload,
          contentType: parsed.contentType,
        };
      } catch (error) {
        lastError = error;
      }
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown');
  throw new Error(`Dekripsi .fAdHiL gagal: ${detail}`);
}
