const SPACE_TOKEN_MAP: Record<string, string> = {
  xs: 'var(--fwlb-space-1)',
  sm: 'var(--fwlb-space-2)',
  md: 'var(--fwlb-space-3)',
  lg: 'var(--fwlb-space-4)',
  xl: 'var(--fwlb-space-5)',
};

function normalizeTokenName(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '').replace(/^[.$]+/, '').replace(/[._\s]+/g, '-');
}

function resolveLengthTokenExpression(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('$')) {
    return `var(--fwlb-${normalizeTokenName(trimmed.slice(1))})`;
  }

  const match = /^([a-zA-Z][\w-]*)\((.*)\)$/.exec(trimmed);
  if (!match) {
    return undefined;
  }

  const name = match[1].toLowerCase();
  const args = match[2]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  switch (name) {
    case 'token':
      return args[0] ? `var(--fwlb-${normalizeTokenName(args[0])})` : undefined;
    case 'space':
      return args[0] ? `var(--fwlb-space-${normalizeTokenName(args[0])})` : undefined;
    case 'radius':
      return args[0] ? `var(--fwlb-radius-${normalizeTokenName(args[0])})` : undefined;
    case 'tone':
      return args[0] ? `var(--fwlb-tone-${normalizeTokenName(args[0])}-${normalizeTokenName(args[1] ?? 'bg')})` : undefined;
    default:
      return undefined;
  }
}

export function resolveLengthValue(value: string | number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return `${value}px`;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const expressionValue = resolveLengthTokenExpression(normalized);
  if (expressionValue) {
    return expressionValue;
  }

  const lowerCased = normalized.toLowerCase();
  if (lowerCased in SPACE_TOKEN_MAP) {
    return SPACE_TOKEN_MAP[lowerCased];
  }

  if (lowerCased === 'full') {
    return '100%';
  }

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return `${normalized}px`;
  }

  return normalized;
}

export function resolveSpaceValue(value: string | number | undefined) {
  return resolveLengthValue(value) ?? SPACE_TOKEN_MAP.md;
}
