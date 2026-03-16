export type FadhilContentType = 'workspace-archive' | 'featurelib-gameideas';

export type FadhilArchiveFile = {
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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

const PASSPHRASE = 'FadhilAkbar.ChartWorkspace.FeatureLib.v1';
const SALT = 'ChartWorkspace::fAdHiL::2026';

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

async function maybeGzip(bytes: Uint8Array): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  if (typeof CompressionStream === 'undefined') {
    return { bytes, compressed: false };
  }

  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream('gzip'));
  const result = new Uint8Array(await new Response(stream).arrayBuffer());
  if (result.length >= bytes.length) {
    return { bytes, compressed: false };
  }

  return { bytes: result, compressed: true };
}

async function maybeGunzip(bytes: Uint8Array, compressed: boolean): Promise<Uint8Array> {
  if (!compressed) return bytes;
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Browser tidak mendukung decompression stream untuk file .fAdHiL terkompresi.');
  }

  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function getKey() {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(PASSPHRASE),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 120000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encodeFadhilArchive(payload: unknown, contentType: FadhilContentType): Promise<string> {
  const text = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const sourceBytes = encoder.encode(text);
  const { bytes: packedBytes, compressed } = await maybeGzip(sourceBytes);

  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(packedBytes));

  const file: FadhilArchiveFile = {
    magic: MAGIC,
    version: 1,
    algo: 'aes-gcm+gzip+base64url',
    compressed,
    iv: toBase64Url(iv),
    data: toBase64Url(new Uint8Array(cipher)),
    contentType,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(file);
}

export async function decodeFadhilArchive(text: string): Promise<{ payload: unknown; contentType: FadhilContentType }> {
  const parsed = JSON.parse(text) as Partial<FadhilArchiveFile>;
  if (parsed.magic !== MAGIC || parsed.version !== 1 || parsed.algo !== 'aes-gcm+gzip+base64url') {
    throw new Error('Format file .fAdHiL tidak valid.');
  }
  if ((parsed.contentType !== 'workspace-archive' && parsed.contentType !== 'featurelib-gameideas') || !parsed.data || !parsed.iv) {
    throw new Error('Metadata file .fAdHiL tidak lengkap.');
  }

  const key = await getKey();
  const cipherBytes = fromBase64Url(parsed.data);
  const iv = fromBase64Url(parsed.iv);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(cipherBytes));
  const unpacked = await maybeGunzip(new Uint8Array(plain), Boolean(parsed.compressed));
  const payload = JSON.parse(new TextDecoder().decode(unpacked));

  return {
    payload,
    contentType: parsed.contentType,
  };
}
