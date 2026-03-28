import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampRovingFocusIndex,
  findFirstEnabledRovingIndex,
  findLastEnabledRovingIndex,
  getRovingFocusKeyAction,
  moveRovingFocusIndex,
  resolveRovingFocusIndex,
} from './roving-focus';

test('resolveRovingFocusIndex skips disabled entries', () => {
  assert.equal(resolveRovingFocusIndex(1, 5, [1, 2]), 3);
  assert.equal(resolveRovingFocusIndex(0, 5, [0]), 1);
});

test('moveRovingFocusIndex moves around disabled entries and respects looping', () => {
  assert.equal(moveRovingFocusIndex(0, 5, 1, false, [1, 2]), 3);
  assert.equal(moveRovingFocusIndex(4, 5, 1, true, [0]), 1);
  assert.equal(moveRovingFocusIndex(0, 5, -1, true, [4]), 3);
});

test('first and last enabled helpers skip disabled items', () => {
  assert.equal(findFirstEnabledRovingIndex(5, [0, 1]), 2);
  assert.equal(findLastEnabledRovingIndex(5, [4]), 3);
  assert.equal(clampRovingFocusIndex(99, 5), 4);
});

test('getRovingFocusKeyAction maps arrow keys by orientation', () => {
  assert.equal(getRovingFocusKeyAction('ArrowRight', 'horizontal'), 'next');
  assert.equal(getRovingFocusKeyAction('ArrowDown', 'horizontal'), undefined);
  assert.equal(getRovingFocusKeyAction('ArrowDown', 'vertical'), 'next');
  assert.equal(getRovingFocusKeyAction('Home', 'both'), 'first');
  assert.equal(getRovingFocusKeyAction('End', 'both'), 'last');
});
