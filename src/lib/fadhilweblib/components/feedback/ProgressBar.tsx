import type React from 'react';
import type { ProgressBarProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './feedback.module.css';

function clampProgress(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  tone,
  syntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: ProgressBarProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const trackSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.track, slotSyntax?.track));
  const fillSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.fill, slotSyntax?.fill));
  const labelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.label, slotSyntax?.label));
  const valueSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.value, slotSyntax?.value));
  const percentage = clampProgress(value, max);

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.progress, className)}
      style={{ ...rootSyntax.style, ...style }}
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'progress-bar'}
    >
      {(label || showValue) ? (
        <div className={styles.progressHeader}>
          {label ? <div style={labelSyntax.style} data-slot="progress-bar-label">{label}</div> : null}
          {showValue ? <div style={valueSyntax.style} data-slot="progress-bar-value">{Math.round(percentage)}%</div> : null}
        </div>
      ) : null}
      <div className={styles.progressTrack} style={trackSyntax.style} data-slot="progress-bar-track">
        <div
          className={styles.progressFill}
          style={{ width: `${percentage}%`, ...fillSyntax.style } as React.CSSProperties}
          data-slot="progress-bar-fill"
        />
      </div>
    </div>
  );
}
