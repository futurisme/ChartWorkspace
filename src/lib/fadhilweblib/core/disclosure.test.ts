import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDisclosureAttributes } from './disclosure';

test('buildDisclosureAttributes returns accessible ids and open state', () => {
  const disclosure = buildDisclosureAttributes({
    idBase: 'sample-panel',
    open: true,
  });

  assert.equal(disclosure.triggerProps.id, 'sample-panel-trigger');
  assert.equal(disclosure.triggerProps['aria-controls'], 'sample-panel-content');
  assert.equal(disclosure.triggerProps['aria-expanded'], true);
  assert.equal(disclosure.contentProps.id, 'sample-panel-content');
  assert.equal(disclosure.contentProps['aria-labelledby'], 'sample-panel-trigger');
  assert.equal(disclosure.contentProps.hidden, false);
  assert.equal(disclosure.triggerProps['data-state'], 'open');
  assert.equal(disclosure.contentProps['data-state'], 'open');
});

test('buildDisclosureAttributes returns disabled closed state when requested', () => {
  const disclosure = buildDisclosureAttributes({
    idBase: 'secondary-panel',
    open: false,
    disabled: true,
  });

  assert.equal(disclosure.triggerProps.disabled, true);
  assert.equal(disclosure.triggerProps['aria-expanded'], false);
  assert.equal(disclosure.contentProps.hidden, true);
  assert.equal(disclosure.triggerProps['data-state'], 'closed');
});
