export interface DialogAttributesOptions {
  idBase: string;
  open: boolean;
}

export function buildDialogAttributes({
  idBase,
  open,
}: DialogAttributesOptions) {
  const dialogId = `${idBase}-dialog`;
  const titleId = `${idBase}-title`;
  const descriptionId = `${idBase}-description`;
  const dataState = open ? 'open' : 'closed';

  return {
    dialogId,
    titleId,
    descriptionId,
    overlayProps: {
      'data-state': dataState,
    },
    dialogProps: {
      id: dialogId,
      role: 'dialog' as const,
      tabIndex: -1,
      'aria-modal': true,
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
      'data-state': dataState,
    },
    titleProps: {
      id: titleId,
      'data-state': dataState,
    },
    descriptionProps: {
      id: descriptionId,
      'data-state': dataState,
    },
  };
}
