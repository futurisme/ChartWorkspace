import type { StatusChipProps } from '../core/types';
import { cx } from '../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../core/state-syntax';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './status-chip.module.css';

export function StatusChip({
  label,
  value,
  tone,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: StatusChipProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const labelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.label, slotSyntax?.label));
  const valueSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.value, slotSyntax?.value));
  const finalTone = rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStateSyntax);

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{ ...rootStyle, ...style }}
      data-slot="status-chip"
      data-tone={finalTone}
      data-size="sm"
      data-state={rootSyntax.logic.current ? 'current' : rootSyntax.logic.open ? 'open' : rootSyntax.logic.loading ? 'loading' : rootSyntax.logic.disabled ? 'disabled' : 'idle'}
      data-disabled={rootSyntax.logic.disabled ? 'true' : 'false'}
      data-loading={rootSyntax.logic.loading ? 'true' : 'false'}
      data-open={rootSyntax.logic.open ? 'true' : 'false'}
      data-current={rootSyntax.logic.current ? 'true' : 'false'}
    >
      {label ? <span className={styles.label} style={labelSyntax.style} data-slot="status-chip-label">{label}</span> : null}
      <span className={styles.value} style={valueSyntax.style} data-slot="status-chip-value">{value}</span>
    </div>
  );
}
