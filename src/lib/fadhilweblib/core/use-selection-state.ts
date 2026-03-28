'use client';

import { useCallback } from 'react';
import { normalizeSelection, isSelectionItemSelected, selectSelectionItem, deselectSelectionItem, toggleSelectionItem } from './selection';
import { useControllableState } from './use-controllable-state';
import type { SelectionState, UseSelectionStateOptions } from './types';

export function useSelectionState<T>({
  value,
  defaultValue = [],
  multiple = true,
  compare,
  onChange,
}: UseSelectionStateOptions<T> = {}): SelectionState<T> {
  const [currentSelection, setCurrentSelection] = useControllableState({
    value,
    defaultValue: normalizeSelection(defaultValue, multiple, compare),
    onChange,
  });

  const selected = normalizeSelection(currentSelection, multiple, compare);

  const setSelected = useCallback<SelectionState<T>['setSelected']>((next) => {
    setCurrentSelection((current) => {
      const resolved = typeof next === 'function' ? next(normalizeSelection(current, multiple, compare)) : next;
      return normalizeSelection(resolved, multiple, compare);
    });
  }, [compare, multiple, setCurrentSelection]);

  const isSelected = useCallback((item: T) => {
    return isSelectionItemSelected(selected, item, compare);
  }, [compare, selected]);

  const select = useCallback((item: T) => {
    setSelected((current) => selectSelectionItem(current, item, multiple, compare));
  }, [compare, multiple, setSelected]);

  const deselect = useCallback((item: T) => {
    setSelected((current) => deselectSelectionItem(current, item, compare));
  }, [compare, setSelected]);

  const toggle = useCallback((item: T) => {
    setSelected((current) => toggleSelectionItem(current, item, multiple, compare));
  }, [compare, multiple, setSelected]);

  const replace = useCallback((items: readonly T[]) => {
    setSelected(items);
  }, [setSelected]);

  const clear = useCallback(() => {
    setSelected([]);
  }, [setSelected]);

  return {
    selected,
    firstSelected: selected[0],
    multiple,
    setSelected,
    isSelected,
    select,
    deselect,
    toggle,
    replace,
    clear,
  };
}
