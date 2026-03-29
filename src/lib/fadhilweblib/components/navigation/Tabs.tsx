'use client';

import type { TabsProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import { useTabs } from '../../core/use-tabs';
import styles from './navigation.module.css';

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  tone,
  keepMounted = false,
  orientation = 'horizontal',
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: TabsProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStates = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const listSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.list, slotSyntax?.list));
  const tabSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.tab, slotSyntax?.tab));
  const tabLabelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.tabLabel, slotSyntax?.tabLabel));
  const tabBadgeSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.tabBadge, slotSyntax?.tabBadge));
  const panelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.panel, slotSyntax?.panel));
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStates);
  const tabs = useTabs({
    items: items.map((item) => ({ value: item.value, disabled: item.disabled })),
    value,
    defaultValue,
    onValueChange,
    orientation: recipe?.logic?.orientation ?? orientation,
  });

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.tabs, className)}
      style={{ ...rootStyle, ...style }}
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'tabs'}
    >
      <div className={styles.tabList} style={listSyntax.style} {...tabs.getListProps({ 'data-slot': 'tabs-list' })}>
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className={styles.tabButton}
            style={tabSyntax.style}
            {...tabs.getTabProps(item.value, {
              'data-slot': 'tabs-tab',
              disabled: item.disabled,
            })}
          >
            <span className={styles.tabLabel} style={tabLabelSyntax.style} data-slot="tabs-tab-label">{item.label}</span>
            {item.badge ? <span className={styles.tabBadge} style={tabBadgeSyntax.style} data-slot="tabs-tab-badge">{item.badge}</span> : null}
          </button>
        ))}
      </div>
      {items.map((item) => {
        if (!keepMounted && tabs.value !== item.value) {
          return null;
        }

        return (
          <div
            key={item.value}
            className={styles.tabPanel}
            style={panelSyntax.style}
            {...tabs.getPanelProps(item.value, { 'data-slot': 'tabs-panel' })}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
