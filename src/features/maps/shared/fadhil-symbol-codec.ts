const ALIEN_BLOCK_START = 0x3400;
const ALIEN_BASE = 8192;

export function encodeAlienSymbols(bytes: Uint8Array): string {
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

export function decodeAlienSymbols(text: string): Uint8Array {
  let bits = 0;
  let bitCount = 0;
  const out: number[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const value = text.charCodeAt(i) - ALIEN_BLOCK_START;
    if (value < 0 || value >= ALIEN_BASE) {
      throw new Error('Simbol alien rusak / di luar rentang.');
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

export function encodeAlienFramed(bytes: Uint8Array): string {
  return `${bytes.length.toString(36)}~${encodeAlienSymbols(bytes)}`;
}

export function decodeAlienFramedCandidates(text: string, expectedLength?: number): Uint8Array[] {
  const sep = text.indexOf('~');
  if (sep > 0) {
    const expected = Number.parseInt(text.slice(0, sep), 36);
    if (!Number.isFinite(expected) || expected < 0) {
      throw new Error('Header panjang alien tidak valid.');
    }

    const decoded = decodeAlienSymbols(text.slice(sep + 1));
    if (decoded.length < expected) {
      throw new Error('Data alien terpotong.');
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
