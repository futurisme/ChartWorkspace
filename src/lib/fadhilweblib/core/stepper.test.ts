import assert from 'node:assert/strict';
import test from 'node:test';
import { clampStepperIndex, moveStepperIndex } from './stepper';

test('clampStepperIndex keeps indices inside the available range', () => {
  assert.equal(clampStepperIndex(-3, 5), 0);
  assert.equal(clampStepperIndex(7, 5), 4);
});

test('moveStepperIndex advances and clamps when looping is disabled', () => {
  assert.equal(moveStepperIndex(1, 4, 1, false), 2);
  assert.equal(moveStepperIndex(3, 4, 1, false), 3);
});

test('moveStepperIndex wraps around when looping is enabled', () => {
  assert.equal(moveStepperIndex(3, 4, 1, true), 0);
  assert.equal(moveStepperIndex(0, 4, -1, true), 3);
});
