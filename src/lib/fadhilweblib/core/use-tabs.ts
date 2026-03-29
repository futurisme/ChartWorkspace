'use client';

import { useMemo } from 'react';
import type { TabsState, UseTabsOptions } from './types';
import { useControllableState } from './use-controllable-state';
import { useRovingFocus } from './use-roving-focus';

function findFirstEnabledIndex<T extends string>(items: readonly { value: T; disabled?: boolean }[]) {
  return items.findIndex((item) => !item.disabled);
}

export function useTabs<T extends string>({
  items,
  value,
  defaultValue,
  orientation = 'horizontal',
  loop = true,
  onValueChange,
}: UseTabsOptions<T>): TabsState<T> {
  const firstEnabledIndex = useMemo(() => findFirstEnabledIndex(items), [items]);
  const fallbackValue = firstEnabledIndex >= 0 ? items[firstEnabledIndex]?.value : undefined;
  const [currentValue, setCurrentValue] = useControllableState<T | undefined>({
    value,
    defaultValue: defaultValue ?? fallbackValue,
    onChange: (nextValue) => {
      if (nextValue !== undefined) {
        onValueChange?.(nextValue);
      }
    },
  });

  const selectedIndex = Math.max(0, items.findIndex((item) => item.value === currentValue && !item.disabled));
  const rovingFocus = useRovingFocus({
    count: items.length,
    value: selectedIndex,
    loop,
    orientation: orientation === 'both' ? 'horizontal' : orientation,
    disabledIndices: items.reduce<number[]>((result, item, index) => {
      if (item.disabled) {
        result.push(index);
      }
      return result;
    }, []),
    onChange: (index) => {
      const item = items[index];
      if (item && !item.disabled) {
        setCurrentValue(item.value);
      }
    },
  });

  return {
    value: currentValue,
    selectedIndex,
    orientation,
    getListProps: (props = {}) => rovingFocus.getContainerProps({
      role: 'tablist',
      'aria-orientation': orientation === 'both' ? undefined : orientation,
      ...props,
    }),
    getTabProps: (tabValue, props = {}) => {
      const index = items.findIndex((item) => item.value === tabValue);
      const item = items[index];
      const selected = currentValue === tabValue;

      return rovingFocus.getItemProps(index, {
        ...props,
        role: 'tab',
        id: `fwlb-tab-${tabValue}`,
        'aria-selected': selected,
        'aria-controls': `fwlb-tab-panel-${tabValue}`,
        disabled: item?.disabled,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          props.onClick?.(event as React.MouseEvent<HTMLButtonElement>);
          if (!event.defaultPrevented && item && !item.disabled) {
            setCurrentValue(item.value);
          }
        },
      }) as React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
    },
    getPanelProps: (tabValue, props = {}) => ({
      ...props,
      id: `fwlb-tab-panel-${tabValue}`,
      role: 'tabpanel' as const,
      'aria-labelledby': `fwlb-tab-${tabValue}`,
      hidden: currentValue !== tabValue,
      tabIndex: 0,
    }),
    setValue: setCurrentValue as (value: T) => void,
  };
}
