import assert from 'node:assert/strict';
import test from 'node:test';
import { cx } from './cx';

test('cx joins truthy class names and skips empty values', () => {
  assert.equal(cx('alpha', false, undefined, 'beta', null, 'gamma'), 'alpha beta gamma');
});
