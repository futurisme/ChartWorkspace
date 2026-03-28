import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSelection, selectSelectionItem, toggleSelectionItem } from './selection';

test('normalizeSelection removes duplicates and respects single-selection mode', () => {
  const values = normalizeSelection(['a', 'a', 'b'], false);

  assert.deepEqual(values, ['a']);
});

test('toggleSelectionItem adds and removes items in multi-select mode', () => {
  const added = toggleSelectionItem(['alpha'], 'beta', true);
  const removed = toggleSelectionItem(added, 'alpha', true);

  assert.deepEqual(added, ['alpha', 'beta']);
  assert.deepEqual(removed, ['beta']);
});

test('selectSelectionItem replaces the active value in single-select mode', () => {
  const selected = selectSelectionItem(['draft'], 'published', false);

  assert.deepEqual(selected, ['published']);
});
