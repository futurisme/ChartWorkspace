'use client';

import type { DialogProps } from '../../core/types';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import { useDialog } from '../../core/use-dialog';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import styles from './overlay.module.css';

export function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  actions,
  trigger,
  dismissOnOverlay = true,
  closeOnEscape = true,
  closeLabel = 'Close dialog',
  tone,
  size,
  portal = true,
  children,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: DialogProps) {
  const dialog = useDialog({
    open,
    defaultOpen,
    onOpenChange,
    dismissOnOverlay: recipe?.logic?.dismissOnOverlay ?? dismissOnOverlay,
    closeOnEscape,
  });
  const [mounted, setMounted] = useState(false);
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStates = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const overlaySyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.overlay, slotSyntax?.overlay));
  const panelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.panel, slotSyntax?.panel));
  const headerSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.header, slotSyntax?.header));
  const titleSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.title, slotSyntax?.title));
  const descriptionSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.description, slotSyntax?.description));
  const bodySyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.body, slotSyntax?.body));
  const actionsSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.actions, slotSyntax?.actions));
  const closeSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.close, slotSyntax?.close));
  const panelStyle = createStateStyleVariables({ ...rootSyntax.style, ...panelSyntax.style }, resolvedStates);

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = dialog.open ? (
    <div className={styles.overlay} style={overlaySyntax.style} {...dialog.getOverlayProps({ 'data-slot': 'dialog-overlay' })}>
      <div
        {...(recipe?.attrs as Record<string, unknown> | undefined)}
        {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
        {...dialog.getDialogProps(props)}
        className={cx(styles.dialogPanel, className)}
        style={{ ...panelStyle, ...style }}
        data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
        data-size={rootSyntax.semantics.size ?? size ?? recipe?.logic?.size ?? 'md'}
        data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'dialog'}
      >
        {(title || description) ? (
          <div className={styles.header} style={headerSyntax.style} data-slot="dialog-header">
            <div className={styles.titleWrap}>
              {title ? <div className={styles.title} style={titleSyntax.style} {...dialog.getTitleProps({ 'data-slot': 'dialog-title' })}>{title}</div> : null}
              {description ? (
                <div className={styles.description} style={descriptionSyntax.style} {...dialog.getDescriptionProps({ 'data-slot': 'dialog-description' })}>
                  {description}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={styles.closeButton}
              style={closeSyntax.style}
              onClick={dialog.closeDialog}
              aria-label={closeLabel}
              data-slot="dialog-close"
            >
              x
            </button>
          </div>
        ) : null}
        <div className={styles.body} style={bodySyntax.style} data-slot="dialog-body">{children}</div>
        {actions ? <div className={styles.actions} style={actionsSyntax.style} data-slot="dialog-actions">{actions}</div> : null}
      </div>
    </div>
  ) : null;

  return (
    <>
      {trigger ? (
        <span {...dialog.getTriggerProps({ 'data-slot': 'dialog-trigger' })}>
          {trigger}
        </span>
      ) : null}
      {portal && mounted && typeof document !== 'undefined' ? createPortal(content, document.body) : content}
    </>
  );
}
