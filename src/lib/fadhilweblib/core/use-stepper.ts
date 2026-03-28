'use client';

import { useCallback } from 'react';
import { clampStepperIndex, moveStepperIndex } from './stepper';
import { useControllableState } from './use-controllable-state';
import type { StepperState, UseStepperOptions } from './types';

export function useStepper<T>({
  items,
  value,
  defaultValue = 0,
  loop = false,
  onChange,
}: UseStepperOptions<T>): StepperState<T> {
  const count = items.length;
  const [currentIndex, setCurrentIndex] = useControllableState({
    value,
    defaultValue: clampStepperIndex(defaultValue, count),
    onChange,
  });
  const index = clampStepperIndex(currentIndex, count);

  const setIndex = useCallback<StepperState<T>['setIndex']>((next) => {
    setCurrentIndex((current) => {
      const resolved = typeof next === 'function' ? next(clampStepperIndex(current, count)) : next;
      return clampStepperIndex(resolved, count);
    });
  }, [count, setCurrentIndex]);

  const goTo = useCallback((nextIndex: number) => {
    setIndex(nextIndex);
  }, [setIndex]);

  const next = useCallback(() => {
    setCurrentIndex((current) => moveStepperIndex(clampStepperIndex(current, count), count, 1, loop));
  }, [count, loop, setCurrentIndex]);

  const previous = useCallback(() => {
    setCurrentIndex((current) => moveStepperIndex(clampStepperIndex(current, count), count, -1, loop));
  }, [count, loop, setCurrentIndex]);

  const first = useCallback(() => {
    setIndex(0);
  }, [setIndex]);

  const last = useCallback(() => {
    setIndex(Math.max(0, count - 1));
  }, [count, setIndex]);

  return {
    index,
    item: items[index],
    count,
    hasItems: count > 0,
    isFirst: count > 0 && index === 0,
    isLast: count > 0 && index === count - 1,
    loop,
    setIndex,
    goTo,
    next,
    previous,
    first,
    last,
  };
}
