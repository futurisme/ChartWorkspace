'use client';

import { useRef } from 'react';
import { cx } from '../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../core/state-syntax';
import { useDisclosure } from '../core/use-disclosure';
import type { CollapsiblePanelProps } from '../core/types';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './collapsible-panel.module.css';

export function CollapsiblePanel({
  id,
  title,
  summary,
  actions,
  tone,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  presence,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  children,
  ...props
}: CollapsiblePanelProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const finalDisabled = rootSyntax.logic.disabled ?? disabled ?? recipe?.logic?.disabled ?? false;
  const resolvedOpen = rootSyntax.logic.open ?? open;
  const disclosure = useDisclosure({
    id,
    open: resolvedOpen,
    defaultOpen,
    onOpenChange,
    disabled: finalDisabled,
  });
  const headerSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.header, slotSyntax?.header));
  const triggerSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.trigger, slotSyntax?.trigger));
  const headingSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.heading, slotSyntax?.heading));
  const titleRowSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.titleRow, slotSyntax?.titleRow));
  const titleSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.title, slotSyntax?.title));
  const summarySyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.summary, slotSyntax?.summary));
  const actionsSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.actions, slotSyntax?.actions));
  const indicatorSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.indicator, slotSyntax?.indicator));
  const contentSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.content, slotSyntax?.content));
  const finalTone = rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const finalPresence = rootSyntax.logic.presence ?? presence ?? recipe?.logic?.presence ?? 'keep';
  const hasOpenedRef = useRef(disclosure.open);
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStateSyntax);

  if (disclosure.open) {
    hasOpenedRef.current = true;
  }

  const shouldRenderContent =
    finalPresence === 'keep' ||
    disclosure.open ||
    (finalPresence === 'lazy' && hasOpenedRef.current);

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{ ...rootStyle, ...style }}
      data-slot="collapsible-panel"
      data-state={disclosure.open ? 'open' : 'closed'}
      data-tone={finalTone}
      data-disabled={finalDisabled ? 'true' : 'false'}
      data-loading={rootSyntax.logic.loading ? 'true' : 'false'}
      data-open={disclosure.open ? 'true' : 'false'}
      data-current={rootSyntax.logic.current ? 'true' : 'false'}
    >
      <div className={styles.header} style={headerSyntax.style} data-slot="collapsible-panel-header">
        <button
          {...disclosure.getTriggerProps({
            className: styles.trigger,
            style: triggerSyntax.style,
            'data-slot': 'collapsible-panel-trigger',
          })}
        >
          <span className={styles.heading} style={headingSyntax.style} data-slot="collapsible-panel-heading">
            <span className={styles.titleRow} style={titleRowSyntax.style} data-slot="collapsible-panel-title-row">
              <span className={styles.title} style={titleSyntax.style} data-slot="collapsible-panel-title">{title}</span>
              <span className={styles.indicator} style={indicatorSyntax.style} data-slot="collapsible-panel-indicator" aria-hidden="true">
                &gt;
              </span>
            </span>
            {summary ? (
              <span className={styles.summary} style={summarySyntax.style} data-slot="collapsible-panel-summary">
                {summary}
              </span>
            ) : null}
          </span>
        </button>
        {actions ? (
          <div className={styles.actions} style={actionsSyntax.style} data-slot="collapsible-panel-actions">
            {actions}
          </div>
        ) : null}
      </div>
      {shouldRenderContent ? (
        <div
          {...disclosure.getContentProps({
            className: styles.content,
            style: contentSyntax.style,
            'data-slot': 'collapsible-panel-content',
          })}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
