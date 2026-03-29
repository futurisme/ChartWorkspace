import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDialogAttributes } from './dialog';

test('buildDialogAttributes returns stable ids and open state metadata', () => {
  const result = buildDialogAttributes({
    idBase: 'dialog-test',
    open: true,
  });

  assert.equal(result.dialogId, 'dialog-test-dialog');
  assert.equal(result.titleId, 'dialog-test-title');
  assert.equal(result.descriptionId, 'dialog-test-description');
  assert.equal(result.overlayProps['data-state'], 'open');
  assert.equal(result.dialogProps.id, 'dialog-test-dialog');
  assert.equal(result.dialogProps.role, 'dialog');
  assert.equal(result.dialogProps['aria-modal'], true);
  assert.equal(result.dialogProps['aria-labelledby'], 'dialog-test-title');
  assert.equal(result.dialogProps['aria-describedby'], 'dialog-test-description');
  assert.equal(result.dialogProps['data-state'], 'open');
  assert.equal(result.titleProps.id, 'dialog-test-title');
  assert.equal(result.descriptionProps.id, 'dialog-test-description');
});

test('buildDialogAttributes returns closed state metadata when dialog is not open', () => {
  const result = buildDialogAttributes({
    idBase: 'dialog-test',
    open: false,
  });

  assert.equal(result.overlayProps['data-state'], 'closed');
  assert.equal(result.dialogProps['data-state'], 'closed');
  assert.equal(result.titleProps['data-state'], 'closed');
  assert.equal(result.descriptionProps['data-state'], 'closed');
});
