'use client';

import type React from 'react';
import { useCallback } from 'react';
import {
  clampRovingFocusIndex,
  findFirstEnabledRovingIndex,
  findLastEnabledRovingIndex,
  getRovingFocusKeyAction,
  moveRovingFocusIndex,
  resolveRovingFocusIndex,
} from './roving-focus';
import type { RovingFocusState, UseRovingFocusOptions } from './types';
import { useControllableState } from './use-controllable-state';

export function useRovingFocus({
  count,
  value,
  defaultValue = 0,
  loop = false,
  orientation = 'both',
  disabledIndices = [],
  onChange,
}: UseRovingFocusOptions): RovingFocusState {
  const normalizedDefaultIndex = resolveRovingFocusIndex(defaultValue, count, disabledIndices, loop);
  const [currentIndex, setCurrentIndex] = useControllableState({
    value,
    defaultValue: normalizedDefaultIndex,
    onChange,
  });
  const index = resolveRovingFocusIndex(currentIndex, count, disabledIndices, loop);

  const setIndex = useCallback<RovingFocusState['setIndex']>((next) => {
    setCurrentIndex((current) => {
      const resolvedCurrent = resolveRovingFocusIndex(current, count, disabledIndices, loop);
      const nextIndex = typeof next === 'function' ? next(resolvedCurrent) : next;
      return resolveRovingFocusIndex(nextIndex, count, disabledIndices, loop);
    });
  }, [count, disabledIndices, loop, setCurrentIndex]);

  const goTo = useCallback((nextIndex: number) => {
    setIndex(nextIndex);
  }, [setIndex]);

  const next = useCallback(() => {
    setIndex((current) => moveRovingFocusIndex(current, count, 1, loop, disabledIndices));
  }, [count, disabledIndices, loop, setIndex]);

  const previous = useCallback(() => {
    setIndex((current) => moveRovingFocusIndex(current, count, -1, loop, disabledIndices));
  }, [count, disabledIndices, loop, setIndex]);

  const first = useCallback(() => {
    setIndex(findFirstEnabledRovingIndex(count, disabledIndices));
  }, [count, disabledIndices, setIndex]);

  const last = useCallback(() => {
    setIndex(findLastEnabledRovingIndex(count, disabledIndices));
  }, [count, disabledIndices, setIndex]);

  const getContainerProps = useCallback<RovingFocusState['getContainerProps']>((props = {}) => {
    const { className, style, ...rest } = props;

    return {
      ...rest,
      className,
      style,
      'data-roving-focus': 'true',
      'data-orientation': orientation,
      'aria-orientation': orientation === 'both' ? undefined : orientation,
    };
  }, [orientation]);

  const getItemProps = useCallback<RovingFocusState['getItemProps']>((itemIndex, props = {}) => {
    const { disabled = false, onFocus, onKeyDown, className, style, ...rest } = props;
    const clampedIndex = clampRovingFocusIndex(itemIndex, count);
    const itemDisabled = disabled || disabledIndices.includes(clampedIndex);
    const current = !itemDisabled && clampedIndex === index;

    return {
      ...rest,
      className,
      style,
      tabIndex: itemDisabled ? -1 : current ? 0 : -1,
      'data-current': current ? 'true' : 'false',
      'data-disabled': itemDisabled ? 'true' : 'false',
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        onFocus?.(event);

        if (!event.defaultPrevented && !itemDisabled) {
          setIndex(clampedIndex);
        }
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(event);

        if (event.defaultPrevented || itemDisabled) {
          return;
        }

        const action = getRovingFocusKeyAction(event.key, orientation);
        if (!action) {
          return;
        }

        event.preventDefault();

        if (action === 'next') next();
        else if (action === 'previous') previous();
        else if (action === 'first') first();
        else last();
      },
    };
  }, [count, disabledIndices, first, index, last, next, orientation, previous, setIndex]);

  return {
    index,
    count,
    loop,
    orientation,
    setIndex,
    goTo,
    next,
    previous,
    first,
    last,
    getContainerProps,
    getItemProps,
  };
}
