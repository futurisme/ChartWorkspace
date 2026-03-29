'use client';

import type { SegmentedControlProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import { useTabs } from '../../core/use-tabs';
import styles from './navigation.module.css';

export function SegmentedControl({
  items,
  value,
  defaultValue,
  onValueChange,
  tone,
  fullWidth = false,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: SegmentedControlProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStates = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const itemSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.item, slotSyntax?.item));
  const itemLabelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.itemLabel, slotSyntax?.itemLabel));
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStates);
  const tabs = useTabs({
    items: items.map((item) => ({ value: item.value, disabled: item.disabled })),
    value,
    defaultValue,
    onValueChange,
  });
  const finalFullWidth = rootSyntax.semantics.full ?? fullWidth ?? recipe?.logic?.fullWidth ?? false;

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.segmented, className)}
      style={{ ...rootStyle, ...style }}
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-full-width={finalFullWidth ? 'true' : 'false'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'segmented-control'}
      {...tabs.getListProps()}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={styles.segmentedItem}
          style={itemSyntax.style}
          {...tabs.getTabProps(item.value, {
            'data-slot': 'segmented-control-item',
            disabled: item.disabled,
            'data-current': tabs.value === item.value ? 'true' : 'false',
          })}
        >
          <span className={styles.segmentedLabel} style={itemLabelSyntax.style} data-slot="segmented-control-item-label">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
