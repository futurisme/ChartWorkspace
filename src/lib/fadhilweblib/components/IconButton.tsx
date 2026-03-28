'use client';

import { cx } from '../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../core/state-syntax';
import type { IconButtonProps } from '../core/types';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './button.module.css';

export function IconButton({
  icon,
  label,
  tone,
  size,
  loading,
  disabled,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  type = 'button',
  ...props
}: IconButtonProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const iconSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.icon, slotSyntax?.icon));
  const finalTone = rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const finalSize = rootSyntax.semantics.size ?? size ?? recipe?.logic?.size ?? 'md';
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
      aria-label={label}
      title={label}
      disabled={isDisabled}
      aria-busy={finalLoading || undefined}
      className={cx(styles.root, className)}
      style={{ ...rootStyle, ...style }}
      data-slot="icon-button"
      data-tone={finalTone}
      data-size={finalSize}
      data-state={finalLoading ? 'loading' : finalDisabled ? 'disabled' : 'idle'}
      data-disabled={finalDisabled ? 'true' : 'false'}
      data-loading={finalLoading ? 'true' : 'false'}
      data-open={rootSyntax.logic.open ? 'true' : 'false'}
      data-current={rootSyntax.logic.current ? 'true' : 'false'}
      data-icon-only="true"
    >
      {finalLoading ? (
        <span className={styles.spinner} data-slot="icon-button-spinner" aria-hidden="true" />
      ) : (
        <span className={styles.visual} style={iconSyntax.style} data-slot="icon-button-icon" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
}
