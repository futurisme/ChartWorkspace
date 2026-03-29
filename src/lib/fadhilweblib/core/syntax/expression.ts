function splitTopLevelArgs(input: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of input) {
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function unwrapFunctionExpression(value: string) {
  const trimmed = value.trim();
  const match = /^([a-zA-Z][\w-]*)\((.*)\)$/.exec(trimmed);
  if (!match) {
    return undefined;
  }

  let depth = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0 && index !== trimmed.length - 1) {
        return undefined;
      }
    }
  }

  return {
    name: match[1].toLowerCase(),
    args: splitTopLevelArgs(match[2]),
  };
}

function normalizeTokenName(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '').replace(/^[.$]+/, '').replace(/[._\s]+/g, '-');
}

function resolveTokenReference(prefix: string, value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return `var(--fwlb-${prefix}-${normalizeTokenName(value)})`;
}

function resolveToneReference(toneName: string | undefined, channel: string | undefined) {
  if (!toneName) {
    return undefined;
  }

  const normalizedTone = normalizeTokenName(toneName);
  const normalizedChannel = normalizeTokenName(channel ?? 'bg');
  return `var(--fwlb-tone-${normalizedTone}-${normalizedChannel})`;
}

function toPercent(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    return trimmed;
  }

  const numeric = Number(trimmed);
  if (Number.isNaN(numeric)) {
    return undefined;
  }

  if (Math.abs(numeric) <= 1) {
    return `${numeric * 100}%`;
  }

  return `${numeric}%`;
}

function invertPercent(value: string | undefined) {
  const percent = toPercent(value);
  if (!percent) {
    return undefined;
  }

  const numeric = Number(percent.slice(0, -1));
  if (Number.isNaN(numeric)) {
    return undefined;
  }

  return `${100 - numeric}%`;
}

export function resolveExpressionValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const resolvedWithTokens = trimmed.replace(/\$([a-zA-Z0-9_.-]+)/g, (_, token: string) => `var(--fwlb-${normalizeTokenName(token)})`);
  const expression = unwrapFunctionExpression(resolvedWithTokens);
  if (!expression) {
    return resolvedWithTokens;
  }

  const resolvedArgs = expression.args.map((entry) => resolveExpressionValue(entry));

  switch (expression.name) {
    case 'token':
      return expression.args[0] ? `var(--fwlb-${normalizeTokenName(expression.args[0])})` : resolvedWithTokens;
    case 'space':
      return resolveTokenReference('space', expression.args[0]) ?? resolvedWithTokens;
    case 'radius':
      return resolveTokenReference('radius', expression.args[0]) ?? resolvedWithTokens;
    case 'surface':
      return resolveTokenReference('surface', expression.args[0]) ?? resolvedWithTokens;
    case 'text':
      return resolveTokenReference('text', expression.args[0]) ?? resolvedWithTokens;
    case 'shadow':
      return resolveTokenReference('shadow', expression.args[0]) ?? resolvedWithTokens;
    case 'tone':
      return resolveToneReference(expression.args[0], expression.args[1]) ?? resolvedWithTokens;
    case 'alpha': {
      const opacity = toPercent(expression.args[1]);
      if (!resolvedArgs[0] || !opacity) {
        return resolvedWithTokens;
      }

      return `color-mix(in oklab, ${resolvedArgs[0]} ${opacity}, transparent)`;
    }
    case 'mix': {
      if (!resolvedArgs[0] || !resolvedArgs[1]) {
        return resolvedWithTokens;
      }

      return `color-mix(in oklab, ${resolvedArgs[0]} ${toPercent(expression.args[2]) ?? '50%'}, ${resolvedArgs[1]})`;
    }
    case 'lighten': {
      if (!resolvedArgs[0]) {
        return resolvedWithTokens;
      }

      return `color-mix(in oklab, ${resolvedArgs[0]} ${invertPercent(expression.args[1]) ?? '80%'}, white)`;
    }
    case 'darken': {
      if (!resolvedArgs[0]) {
        return resolvedWithTokens;
      }

      return `color-mix(in oklab, ${resolvedArgs[0]} ${invertPercent(expression.args[1]) ?? '80%'}, black)`;
    }
    case 'gradient':
      return `linear-gradient(${resolvedArgs.join(', ')})`;
    case 'radial':
      return `radial-gradient(${resolvedArgs.join(', ')})`;
    case 'conic':
      return `conic-gradient(${resolvedArgs.join(', ')})`;
    default:
      return resolvedWithTokens;
  }
}

export function resolveSyntaxString(value: string | undefined) {
  if (!value) {
    return value;
  }

  return resolveExpressionValue(value);
}
