import type { MetricProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './feedback.module.css';

export function Metric({
  label,
  value,
  change,
  description,
  tone,
  syntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: MetricProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const labelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.label, slotSyntax?.label));
  const valueSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.value, slotSyntax?.value));
  const changeSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.change, slotSyntax?.change));
  const descriptionSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.description, slotSyntax?.description));

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.metric, className)}
      style={{ ...rootSyntax.style, ...style }}
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'metric'}
    >
      <div className={styles.metricLabel} style={labelSyntax.style} data-slot="metric-label">{label}</div>
      <div className={styles.metricValue} style={valueSyntax.style} data-slot="metric-value">{value}</div>
      {change ? <div className={styles.change} style={changeSyntax.style} data-slot="metric-change">{change}</div> : null}
      {description ? (
        <div className={styles.metaText} style={descriptionSyntax.style} data-slot="metric-description">
          {description}
        </div>
      ) : null}
    </div>
  );
}
