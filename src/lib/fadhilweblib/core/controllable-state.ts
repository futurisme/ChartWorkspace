import type { ControlledStateAction } from './types';

export function resolveNextState<T>(current: T, next: ControlledStateAction<T>) {
  return typeof next === 'function' ? (next as (value: T) => T)(current) : next;
}
