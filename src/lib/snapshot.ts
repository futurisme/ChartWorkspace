import * as Y from 'yjs';

/**
 * Encode a Yjs doc state as a base64 string for storage
 */
export function encodeYjsSnapshot(doc: Y.Doc): string {
  const state = Y.encodeStateAsUpdate(doc);
  const buffer = Buffer.from(state);
  return buffer.toString('base64');
}

/**
 * Decode a base64 snapshot back into updates for a Yjs doc
 */
export function decodeYjsSnapshot(snapshot: string): Uint8Array {
  const buffer = Buffer.from(snapshot, 'base64');
  return new Uint8Array(buffer);
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

