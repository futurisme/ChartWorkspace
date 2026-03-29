import type React from 'react';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { cx } from '../../core/cx';
import type { RangeProps } from '../../core/types';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './controls.module.css';

export function Range({
  tone,
  size,
  invalid,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  value,
  ...props
}: RangeProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const labelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.label, slotSyntax?.label));
  const valueSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.value, slotSyntax?.value));
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStateSyntax);
  const currentValue = Array.isArray(value) ? value[0] : value;

  return (
    <div data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'range'}>
      {props['aria-label'] ? (
        <div style={labelSyntax.style} data-slot="range-label">{props['aria-label']}</div>
      ) : null}
      <input
        {...props}
        value={value}
        type="range"
        className={cx(styles.control, styles.range, className)}
        style={{ ...rootStyle, ...style }}
        data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
        data-size={rootSyntax.semantics.size ?? size ?? recipe?.logic?.size ?? 'md'}
        data-invalid={invalid ? 'true' : 'false'}
        data-disabled={props.disabled ? 'true' : 'false'}
      />
      {currentValue !== undefined && currentValue !== null ? (
        <div style={valueSyntax.style} data-slot="range-value">{currentValue as React.ReactNode}</div>
      ) : null}
    </div>
  );
}
