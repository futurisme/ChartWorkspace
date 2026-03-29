'use client';

import type React from 'react';
import type { DrawerProps } from '../../core/types';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { cx } from '../../core/cx';
import { resolveLengthValue } from '../../core/space';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import { useDialog } from '../../core/use-dialog';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import styles from './overlay.module.css';

export function Drawer({
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  actions,
  trigger,
  dismissOnOverlay = true,
  closeOnEscape = true,
  closeLabel = 'Close drawer',
  tone,
  side = 'right',
  width = '26rem',
  portal = true,
  children,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: DrawerProps) {
  const drawer = useDialog({
    open,
    defaultOpen,
    onOpenChange,
    dismissOnOverlay,
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

  const content = drawer.open ? (
    <div className={styles.drawerShell} style={overlaySyntax.style} data-side={side} {...drawer.getOverlayProps({ 'data-slot': 'drawer-overlay' })}>
      <div
        {...(recipe?.attrs as Record<string, unknown> | undefined)}
        {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
        {...drawer.getDialogProps(props)}
        className={cx(styles.drawerPanel, className)}
        style={{
          '--fwlb-drawer-width': resolveLengthValue(width),
          ...panelStyle,
          ...style,
        } as React.CSSProperties}
        data-side={rootSyntax.attrs['data-side'] ?? side}
        data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
        data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'drawer'}
      >
        {(title || description) ? (
          <div className={styles.header} style={headerSyntax.style} data-slot="drawer-header">
            <div className={styles.titleWrap}>
              {title ? <div className={styles.title} style={titleSyntax.style} {...drawer.getTitleProps({ 'data-slot': 'drawer-title' })}>{title}</div> : null}
              {description ? (
                <div className={styles.description} style={descriptionSyntax.style} {...drawer.getDescriptionProps({ 'data-slot': 'drawer-description' })}>
                  {description}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={styles.closeButton}
              style={closeSyntax.style}
              onClick={drawer.closeDialog}
              aria-label={closeLabel}
              data-slot="drawer-close"
            >
              x
            </button>
          </div>
        ) : null}
        <div className={styles.body} style={bodySyntax.style} data-slot="drawer-body">{children}</div>
        {actions ? <div className={styles.actions} style={actionsSyntax.style} data-slot="drawer-actions">{actions}</div> : null}
      </div>
    </div>
  ) : null;

  return (
    <>
      {trigger ? (
        <span {...drawer.getTriggerProps({ 'data-slot': 'drawer-trigger' })}>
          {trigger}
        </span>
      ) : null}
      {portal && mounted && typeof document !== 'undefined' ? createPortal(content, document.body) : content}
    </>
  );
}
