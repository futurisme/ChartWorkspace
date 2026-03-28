function defaultCompare<T>(left: T, right: T) {
  return Object.is(left, right);
}

export function normalizeSelection<T>(
  values: readonly T[] | undefined,
  multiple: boolean,
  compare: (left: T, right: T) => boolean = defaultCompare,
) {
  if (!values?.length) {
    return [] as readonly T[];
  }

  const deduped: T[] = [];

  for (const value of values) {
    if (!deduped.some((entry) => compare(entry, value))) {
      deduped.push(value);
    }
  }

  return multiple ? deduped : deduped.slice(0, 1);
}

export function isSelectionItemSelected<T>(
  values: readonly T[],
  item: T,
  compare: (left: T, right: T) => boolean = defaultCompare,
) {
  return values.some((entry) => compare(entry, item));
}

export function selectSelectionItem<T>(
  values: readonly T[],
  item: T,
  multiple: boolean,
  compare: (left: T, right: T) => boolean = defaultCompare,
) {
  if (isSelectionItemSelected(values, item, compare)) {
    return normalizeSelection(values, multiple, compare);
  }

  if (!multiple) {
    return [item] as readonly T[];
  }

  return normalizeSelection([...values, item], true, compare);
}

export function deselectSelectionItem<T>(
  values: readonly T[],
  item: T,
  compare: (left: T, right: T) => boolean = defaultCompare,
) {
  return values.filter((entry) => !compare(entry, item));
}

export function toggleSelectionItem<T>(
  values: readonly T[],
  item: T,
  multiple: boolean,
  compare: (left: T, right: T) => boolean = defaultCompare,
) {
  if (isSelectionItemSelected(values, item, compare)) {
    return deselectSelectionItem(values, item, compare);
  }

  return selectSelectionItem(values, item, multiple, compare);
}
