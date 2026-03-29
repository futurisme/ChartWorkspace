import type { KeyValueListProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './feedback.module.css';

export function KeyValueList({
  items,
  tone,
  syntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: KeyValueListProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const itemSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.item, slotSyntax?.item));
  const labelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.label, slotSyntax?.label));
  const valueSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.value, slotSyntax?.value));

  return (
    <dl
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.keyValueList, className)}
      style={{ ...rootSyntax.style, ...style }}
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'key-value-list'}
    >
      {items.map((item, index) => (
        <div key={index} className={styles.keyValueItem} style={itemSyntax.style} data-slot="key-value-item">
          <dt className={styles.keyValueLabel} style={labelSyntax.style} data-slot="key-value-label">{item.label}</dt>
          <dd className={styles.keyValueValue} style={valueSyntax.style} data-slot="key-value-value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
