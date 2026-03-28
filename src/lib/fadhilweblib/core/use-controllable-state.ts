'use client';

import { useCallback, useState } from 'react';
import { resolveNextState } from './controllable-state';
import type { ControlledStateAction, ControlledStateOptions } from './types';

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: ControlledStateOptions<T>) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const setValue = useCallback((next: ControlledStateAction<T>) => {
    if (isControlled) {
      const resolved = resolveNextState(currentValue, next);

      if (!Object.is(resolved, currentValue)) {
        onChange?.(resolved);
      }

      return;
    }

    setInternalValue((previousValue) => {
      const resolved = resolveNextState(previousValue, next);

      if (!Object.is(resolved, previousValue)) {
        onChange?.(resolved);
      }

      return resolved;
    });
  }, [currentValue, isControlled, onChange]);

  return [currentValue, setValue] as const;
}
