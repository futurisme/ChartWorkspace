import type { RovingFocusOrientation } from './types';

function isDisabled(index: number, disabledIndices: readonly number[]) {
  return disabledIndices.includes(index);
}

export function clampRovingFocusIndex(index: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), count - 1);
}

export function findFirstEnabledRovingIndex(count: number, disabledIndices: readonly number[]) {
  for (let index = 0; index < count; index += 1) {
    if (!isDisabled(index, disabledIndices)) {
      return index;
    }
  }

  return 0;
}

export function findLastEnabledRovingIndex(count: number, disabledIndices: readonly number[]) {
  for (let index = count - 1; index >= 0; index -= 1) {
    if (!isDisabled(index, disabledIndices)) {
      return index;
    }
  }

  return 0;
}

export function resolveRovingFocusIndex(
  index: number,
  count: number,
  disabledIndices: readonly number[],
  loop = false,
) {
  if (count <= 0) {
    return 0;
  }

  const clamped = clampRovingFocusIndex(index, count);
  if (!isDisabled(clamped, disabledIndices)) {
    return clamped;
  }

  return moveRovingFocusIndex(clamped, count, 1, loop, disabledIndices);
}

export function moveRovingFocusIndex(
  index: number,
  count: number,
  delta: number,
  loop: boolean,
  disabledIndices: readonly number[],
) {
  if (count <= 0) {
    return 0;
  }

  if (disabledIndices.length >= count) {
    return 0;
  }

  let candidate = clampRovingFocusIndex(index, count);

  for (let step = 0; step < count; step += 1) {
    candidate += delta;

    if (loop) {
      candidate = ((candidate % count) + count) % count;
    } else if (candidate < 0 || candidate >= count) {
      return clampRovingFocusIndex(candidate, count);
    }

    if (!isDisabled(candidate, disabledIndices)) {
      return candidate;
    }
  }

  return clampRovingFocusIndex(index, count);
}

export function getRovingFocusKeyAction(key: string, orientation: RovingFocusOrientation) {
  switch (key) {
    case 'ArrowRight':
      return orientation === 'vertical' ? undefined : 'next';
    case 'ArrowLeft':
      return orientation === 'vertical' ? undefined : 'previous';
    case 'ArrowDown':
      return orientation === 'horizontal' ? undefined : 'next';
    case 'ArrowUp':
      return orientation === 'horizontal' ? undefined : 'previous';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return undefined;
  }
}
