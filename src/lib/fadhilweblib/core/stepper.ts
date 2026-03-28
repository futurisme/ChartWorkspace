export function clampStepperIndex(index: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), count - 1);
}

export function moveStepperIndex(
  index: number,
  count: number,
  delta: number,
  loop: boolean,
) {
  if (count <= 0) {
    return 0;
  }

  const nextIndex = index + delta;
  if (!loop) {
    return clampStepperIndex(nextIndex, count);
  }

  return ((nextIndex % count) + count) % count;
}
