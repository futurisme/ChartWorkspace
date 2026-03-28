'use client';

import { cx } from '../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../core/state-syntax';
import type { ButtonProps } from '../core/types';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './button.module.css';

function getButtonState(disabled: boolean, loading: boolean) {
  if (loading) {
    return 'loading';
  }

  if (disabled) {
    return 'disabled';
  }

  return 'idle';
}

export function Button({
  children,
  tone,
  size,
  loading,
  disabled,
  fullWidth,
  leadingVisual,
  trailingVisual,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  type = 'button',
  ...props
}: ButtonProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const labelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.label, slotSyntax?.label));
  const leadingVisualSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.leadingVisual, slotSyntax?.leadingVisual));
  const trailingVisualSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.trailingVisual, slotSyntax?.trailingVisual));
  const finalTone = rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const finalSize = rootSyntax.semantics.size ?? size ?? recipe?.logic?.size ?? 'md';
  const finalFullWidth = rootSyntax.semantics.full ?? fullWidth ?? recipe?.logic?.fullWidth ?? false;
  const finalLoading = rootSyntax.logic.loading ?? loading ?? recipe?.logic?.loading ?? false;
  const finalDisabled = rootSyntax.logic.disabled ?? disabled ?? recipe?.logic?.disabled ?? false;
  const isDisabled = finalDisabled || finalLoading;
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStateSyntax);

  return (
    <button
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={finalLoading || undefined}
      className={cx(styles.root, className)}
      style={{ ...rootStyle, ...style }}
      data-slot="button"
      data-tone={finalTone}
      data-size={finalSize}
      data-state={getButtonState(finalDisabled, finalLoading)}
      data-disabled={finalDisabled ? 'true' : 'false'}
      data-loading={finalLoading ? 'true' : 'false'}
      data-open={rootSyntax.logic.open ? 'true' : 'false'}
      data-current={rootSyntax.logic.current ? 'true' : 'false'}
      data-full-width={finalFullWidth ? 'true' : 'false'}
    >
      {finalLoading ? <span className={styles.spinner} data-slot="button-spinner" aria-hidden="true" /> : null}
      {leadingVisual && !finalLoading ? (
        <span
          className={styles.visual}
          style={leadingVisualSyntax.style}
          data-slot="button-leading-visual"
          aria-hidden="true"
        >
          {leadingVisual}
        </span>
      ) : null}
      <span className={styles.label} style={labelSyntax.style} data-slot="button-label">{children}</span>
      {trailingVisual && !finalLoading ? (
        <span
          className={styles.visual}
          style={trailingVisualSyntax.style}
          data-slot="button-trailing-visual"
          aria-hidden="true"
        >
          {trailingVisual}
        </span>
      ) : null}
    </button>
  );
}
