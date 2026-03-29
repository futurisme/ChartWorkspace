'use client';

import type React from 'react';
import { useCallback, useEffect, useId, useRef } from 'react';
import { buildDialogAttributes } from './dialog';
import type { DialogState, UseDialogOptions } from './types';
import { useControllableState } from './use-controllable-state';

function normalizeId(value: string) {
  return value.replace(/[:]/g, '');
}

function mergeClassNames(base?: string, next?: string) {
  if (!base) return next;
  if (!next) return base;
  return `${base} ${next}`;
}

function mergeStyles(base?: React.CSSProperties, next?: React.CSSProperties) {
  if (!base) return next;
  if (!next) return base;
  return { ...base, ...next };
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  (ref as React.MutableRefObject<T>).current = value;
}

export function useDialog({
  id,
  open,
  defaultOpen = false,
  dismissOnOverlay = true,
  closeOnEscape = true,
  restoreFocus = true,
  onOpenChange,
}: UseDialogOptions = {}): DialogState {
  const generatedId = useId();
  const baseId = id ?? `fwlb-dialog-${normalizeId(generatedId)}`;
  const [currentOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const dialogRef = useRef<HTMLElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  const closeDialog = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const openDialog = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const toggle = useCallback(() => {
    setOpen((previous) => !previous);
  }, [setOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (!currentOpen) {
      if (restoreFocus) {
        lastActiveRef.current?.focus?.();
      }
      return;
    }

    lastActiveRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    queueMicrotask(() => {
      dialogRef.current?.focus();
    });

    if (!closeOnEscape) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDialog, closeOnEscape, currentOpen, restoreFocus]);

  const { dialogId, titleId, descriptionId, overlayProps, dialogProps, titleProps, descriptionProps } = buildDialogAttributes({
    idBase: baseId,
    open: currentOpen,
  });

  const getTriggerProps = useCallback<DialogState['getTriggerProps']>((props = {}) => {
    const { onClick, className, style, ref, ...rest } = props as React.ButtonHTMLAttributes<HTMLButtonElement> & {
      ref?: React.Ref<HTMLButtonElement>;
    };

    return {
      ...rest,
      'aria-controls': dialogId,
      'aria-expanded': currentOpen,
      className: mergeClassNames(className, undefined),
      style,
      ref: (node: HTMLButtonElement) => {
        assignRef(ref, node);
      },
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          toggle();
        }
      },
    };
  }, [currentOpen, dialogId, toggle]);

  const getOverlayProps = useCallback<DialogState['getOverlayProps']>((props = {}) => {
    const { onClick, className, style, ...rest } = props;

    return {
      ...overlayProps,
      ...rest,
      className: mergeClassNames(className, undefined),
      style: mergeStyles(undefined, style),
      onClick: (event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented && dismissOnOverlay && event.target === event.currentTarget) {
          closeDialog();
        }
      },
    };
  }, [closeDialog, dismissOnOverlay, overlayProps]);

  const getDialogProps = useCallback<DialogState['getDialogProps']>((props = {}) => {
    const { className, style, ref, onClick, ...rest } = props as React.HTMLAttributes<HTMLDivElement> & {
      ref?: React.Ref<HTMLDivElement>;
    };

    return {
      ...dialogProps,
      ...rest,
      className: mergeClassNames(className, undefined),
      style,
      ref: (node: HTMLDivElement) => {
        dialogRef.current = node;
        assignRef(ref, node);
      },
      onClick: (event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event);
      },
    };
  }, [dialogProps]);

  const getTitleProps = useCallback<DialogState['getTitleProps']>((props = {}) => {
    const { className, style, ...rest } = props;

    return {
      ...titleProps,
      ...rest,
      className: mergeClassNames(className, undefined),
      style: mergeStyles(undefined, style),
    };
  }, [titleProps]);

  const getDescriptionProps = useCallback<DialogState['getDescriptionProps']>((props = {}) => {
    const { className, style, ...rest } = props;

    return {
      ...descriptionProps,
      ...rest,
      className: mergeClassNames(className, undefined),
      style: mergeStyles(undefined, style),
    };
  }, [descriptionProps]);

  return {
    open: currentOpen,
    setOpen,
    openDialog,
    closeDialog,
    toggle,
    dialogId,
    titleId,
    descriptionId,
    getTriggerProps,
    getOverlayProps,
    getDialogProps,
    getTitleProps,
    getDescriptionProps,
  };
}
