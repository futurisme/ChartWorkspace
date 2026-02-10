import * as Y from 'yjs';

function encodeBase64(data: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  }
  let binary = '';
  data.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(snapshot: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(snapshot, 'base64'));
  }
  const binary = atob(snapshot);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encode a Yjs doc state as a base64 string for storage
 */
export function encodeYjsSnapshot(doc: Y.Doc): string {
  const state = Y.encodeStateAsUpdate(doc);
  return encodeBase64(state);
}

/**
 * Decode a base64 snapshot back into updates for a Yjs doc
 */
export function decodeYjsSnapshot(snapshot: string): Uint8Array {
  return decodeBase64(snapshot);
}

/**
 * Apply a snapshot to a Yjs document
 */
export function applyYjsSnapshot(doc: Y.Doc, snapshot: string): void {
  try {
    const update = decodeYjsSnapshot(snapshot);
    Y.applyUpdate(doc, update);
  } catch (error) {
    console.error('Failed to apply snapshot:', error);
    throw new Error('Invalid snapshot');
  }
}

/**
 * Get the current state of a Yjs document as base64
 */
export function getCurrentSnapshot(doc: Y.Doc): string {
  return encodeYjsSnapshot(doc);
}

/**
 * Create a fresh Doc with initial snapshot
 */
export function createDocWithSnapshot(snapshot?: string): Y.Doc {
  const doc = new Y.Doc();

  // Initialize shared structures
  doc.getMap('nodes');
  doc.getMap('edges');
  doc.getMap('selected');
  doc.getText('title');

  // Apply snapshot if provided
  if (snapshot) {
    try {
      applyYjsSnapshot(doc, snapshot);
    } catch (error) {
      console.warn('Could not apply snapshot, starting fresh:', error);
    }
  }

  return doc;
}

