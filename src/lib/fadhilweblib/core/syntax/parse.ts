import {
  BOOLEAN_FALSE,
  BOOLEAN_TRUE,
  EMPTY_PARSED_SYNTAX,
  isCompiledSyntax,
  isKnownGroupKey,
  normalizeGroupName,
  normalizeKey,
  parsedObjectSyntaxCache,
  parsedStringSyntaxCache,
  rememberCache,
} from './constants';
import type {
  FadhilWebFlatSyntaxObject,
  FadhilWebSyntax,
  FadhilWebSyntaxObject,
  SyntaxScalar,
} from '../types';
import { resolveSyntax } from './style';

type StructuredGroupName = 'layout' | 'spacing' | 'surface' | 'text' | 'fx' | 'logic';
type SpecialGroupName = 'aria' | 'data' | 'vars' | 'css' | 'attrs';

export class FadhilWebSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FadhilWebSyntaxError';
  }
}

function createSyntaxError(message: string) {
  return new FadhilWebSyntaxError(`fadhilweblib syntax: ${message}`);
}

function isScalarValue(value: unknown): value is SyntaxScalar {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isPlainObject(value: unknown): value is Record<string, SyntaxScalar | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBoolean(value: string | number | boolean | undefined) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase().trim();
  if (BOOLEAN_TRUE.has(normalized)) {
    return true;
  }

  if (BOOLEAN_FALSE.has(normalized)) {
    return false;
  }

  return undefined;
}

function parseNumber(value: string | number | boolean | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseSemantic<T extends string>(value: string | number | boolean | undefined, allowed: readonly T[]) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : undefined;
}

function resolveNumberishValue(value: string | number | boolean | undefined) {
  const parsed = parseNumber(value);
  if (parsed !== undefined) {
    return parsed;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || undefined;
  }

  return undefined;
}

function normalizeVarValue(value: SyntaxScalar) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return value;
}

function normalizeScalarMap<T extends string>(
  value: Record<string, SyntaxScalar | undefined> | string | number | boolean | undefined,
  transformKey: (rawKey: string) => T | undefined,
  context: string,
) {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const normalized: Record<string, SyntaxScalar> = {};

  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    if (!isScalarValue(rawValue)) {
      throw createSyntaxError(`${context} expects scalar values. Key "${rawKey}" is not scalar.`);
    }

    const finalKey = transformKey(rawKey);
    if (!finalKey) {
      continue;
    }

    normalized[finalKey] = rawValue;
  }

  return Object.keys(normalized).length ? Object.freeze(normalized) as Record<T, SyntaxScalar> : undefined;
}

function parseSyntaxVariables(
  value: FadhilWebSyntaxObject['vars'] | string | number | boolean | undefined,
) {
  return normalizeScalarMap(value, (rawKey) => {
    const trimmed = rawKey.trim();
    if (!trimmed) {
      return undefined;
    }

    return (trimmed.startsWith('--') ? trimmed : `--${trimmed}`) as `--${string}`;
  }, 'Syntax group "vars"');
}

function parseSyntaxAttributeMap(
  value: Record<string, SyntaxScalar | undefined> | string | number | boolean | undefined,
  prefix: 'aria' | 'data',
) {
  return normalizeScalarMap(value, (rawKey) => {
    const trimmed = rawKey.trim();
    if (!trimmed) {
      return undefined;
    }

    return (trimmed.startsWith(`${prefix}-`) ? trimmed : `${prefix}-${trimmed}`) as `${typeof prefix}-${string}`;
  }, `Syntax group "${prefix}"`);
}

function parseSyntaxEscapeMap(
  value: Record<string, SyntaxScalar | undefined> | string | number | boolean | undefined,
  context: string,
) {
  return normalizeScalarMap(value, (rawKey) => {
    const trimmed = rawKey.trim();
    return trimmed || undefined;
  }, context);
}

function freezeParsedSyntax(result: FadhilWebFlatSyntaxObject) {
  if (result.vars) {
    result.vars = Object.freeze(result.vars);
  }

  if (result.aria) {
    result.aria = Object.freeze(result.aria);
  }

  if (result.data) {
    result.data = Object.freeze(result.data);
  }

  if (result.css) {
    result.css = Object.freeze(result.css);
  }

  if (result.attrs) {
    result.attrs = Object.freeze(result.attrs);
  }

  return Object.freeze(result) as FadhilWebFlatSyntaxObject;
}

function mergeSyntaxMap(
  target: Record<string, SyntaxScalar> | undefined,
  incoming: Record<string, SyntaxScalar> | undefined,
) {
  if (!incoming) {
    return target;
  }

  return {
    ...(target ?? {}),
    ...incoming,
  };
}

function setSpecialEntry(
  result: FadhilWebFlatSyntaxObject,
  group: SpecialGroupName,
  rawKey: string,
  rawValue: SyntaxScalar,
) {
  const trimmedKey = rawKey.trim();
  if (!trimmedKey) {
    throw createSyntaxError(`Syntax group "${group}" encountered an empty key.`);
  }

  if (group === 'vars') {
    const normalizedKey = (trimmedKey.startsWith('--') ? trimmedKey : `--${trimmedKey}`) as `--${string}`;
    result.vars = {
      ...(result.vars ?? {}),
      [normalizedKey]: rawValue,
    };
    return;
  }

  if (group === 'aria') {
    const normalizedKey = (trimmedKey.startsWith('aria-') ? trimmedKey : `aria-${trimmedKey}`) as `aria-${string}`;
    result.aria = {
      ...(result.aria ?? {}),
      [normalizedKey]: rawValue,
    };
    return;
  }

  if (group === 'data') {
    const normalizedKey = (trimmedKey.startsWith('data-') ? trimmedKey : `data-${trimmedKey}`) as `data-${string}`;
    result.data = {
      ...(result.data ?? {}),
      [normalizedKey]: rawValue,
    };
    return;
  }

  if (group === 'css') {
    result.css = {
      ...(result.css ?? {}),
      [trimmedKey]: rawValue,
    };
    return;
  }

  result.attrs = {
    ...(result.attrs ?? {}),
    [trimmedKey]: rawValue,
  };
}

function setFlatEntry(
  result: FadhilWebFlatSyntaxObject,
  rawKey: string,
  rawValue: SyntaxScalar,
  context: string,
  allowedGroup?: StructuredGroupName,
) {
  const trimmedKey = rawKey.trim();
  if (!trimmedKey) {
    throw createSyntaxError(`Encountered an empty syntax key in ${context}.`);
  }

  if (trimmedKey.startsWith('--')) {
    setSpecialEntry(result, 'vars', trimmedKey, rawValue);
    return;
  }

  if (trimmedKey.startsWith('aria-')) {
    setSpecialEntry(result, 'aria', trimmedKey, rawValue);
    return;
  }

  if (trimmedKey.startsWith('data-')) {
    setSpecialEntry(result, 'data', trimmedKey, rawValue);
    return;
  }

  const normalizedKey = normalizeKey(trimmedKey);
  if (!normalizedKey) {
    throw createSyntaxError(`Unknown syntax key "${trimmedKey}" in ${context}.`);
  }

  if (allowedGroup && !isKnownGroupKey(allowedGroup, normalizedKey)) {
    throw createSyntaxError(`Syntax group "${allowedGroup}" does not allow key "${trimmedKey}".`);
  }

  Object.assign(result, { [normalizedKey]: rawValue });
}

function applySpecialGroupObjectSyntax(
  result: FadhilWebFlatSyntaxObject,
  group: SpecialGroupName,
  value: unknown,
) {
  if (!isPlainObject(value)) {
    throw createSyntaxError(`Syntax group "${group}" expects an object map.`);
  }

  if (group === 'vars') {
    result.vars = mergeSyntaxMap(result.vars, parseSyntaxVariables(value as FadhilWebSyntaxObject['vars'])) as FadhilWebFlatSyntaxObject['vars'];
    return;
  }

  if (group === 'aria') {
    result.aria = mergeSyntaxMap(result.aria, parseSyntaxAttributeMap(value as Record<string, SyntaxScalar | undefined>, 'aria')) as FadhilWebFlatSyntaxObject['aria'];
    return;
  }

  if (group === 'data') {
    result.data = mergeSyntaxMap(result.data, parseSyntaxAttributeMap(value as Record<string, SyntaxScalar | undefined>, 'data')) as FadhilWebFlatSyntaxObject['data'];
    return;
  }

  if (group === 'css') {
    result.css = mergeSyntaxMap(result.css, parseSyntaxEscapeMap(value as Record<string, SyntaxScalar | undefined>, 'Syntax group "css"')) as FadhilWebFlatSyntaxObject['css'];
    return;
  }

  result.attrs = mergeSyntaxMap(result.attrs, parseSyntaxEscapeMap(value as Record<string, SyntaxScalar | undefined>, 'Syntax group "attrs"')) as FadhilWebFlatSyntaxObject['attrs'];
}

function applyStructuredGroupObjectSyntax(
  result: FadhilWebFlatSyntaxObject,
  group: StructuredGroupName,
  value: unknown,
  rawGroup: string,
) {
  if (!isPlainObject(value)) {
    throw createSyntaxError(`Syntax group "${rawGroup}" expects an object map.`);
  }

  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    if (nestedValue === undefined || nestedValue === null || nestedValue === '') {
      continue;
    }

    if (typeof nestedValue === 'object') {
      throw createSyntaxError(`Syntax group "${rawGroup}" expects scalar values. Key "${nestedKey}" is not scalar.`);
    }

    setFlatEntry(result, nestedKey, nestedValue, `syntax group "${rawGroup}"`, group);
  }
}

function applyGroupObjectSyntax(
  result: FadhilWebFlatSyntaxObject,
  rawGroup: string,
  value: unknown,
) {
  const group = normalizeGroupName(rawGroup);
  if (!group) {
    throw createSyntaxError(`Unknown syntax group "${rawGroup}".`);
  }

  if (group === 'aria' || group === 'data' || group === 'vars' || group === 'css' || group === 'attrs') {
    applySpecialGroupObjectSyntax(result, group, value);
    return;
  }

  applyStructuredGroupObjectSyntax(result, group, value, rawGroup);
}

function findTopLevelSeparator(input: string, separator = ':') {
  let depth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const previous = input[index - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === '[') {
      bracketDepth += 1;
      continue;
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }

    if (char === separator && depth === 0 && bracketDepth === 0 && braceDepth === 0) {
      return index;
    }
  }

  return -1;
}

function splitTopLevelArgs(input: string, separator = ',') {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const previous = input[index - 1];

    if (quote) {
      current += char;
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === '[') {
      bracketDepth += 1;
      current += char;
      continue;
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += char;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      current += char;
      continue;
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      current += char;
      continue;
    }

    if (char === separator && depth === 0 && bracketDepth === 0 && braceDepth === 0) {
      const trimmed = current.trim();
      if (trimmed) {
        parts.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    parts.push(tail);
  }

  return parts;
}

function applyGroupStringSyntax(
  result: FadhilWebFlatSyntaxObject,
  rawGroup: string,
  body: string,
) {
  const group = normalizeGroupName(rawGroup);
  if (!group) {
    throw createSyntaxError(`Unknown syntax group "${rawGroup}".`);
  }

  const entries = splitTopLevelArgs(body, ',');
  if (entries.length === 0) {
    throw createSyntaxError(`Syntax group "${rawGroup}" cannot be empty.`);
  }

  for (const entry of entries) {
    const separatorIndex = findTopLevelSeparator(entry, ':');
    if (separatorIndex < 1) {
      throw createSyntaxError(`Malformed syntax entry "${entry}" inside group "${rawGroup}". Expected key:value.`);
    }

    const rawKey = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!value) {
      throw createSyntaxError(`Syntax entry "${entry}" inside group "${rawGroup}" is missing a value.`);
    }

    if (group === 'aria' || group === 'data' || group === 'vars' || group === 'css' || group === 'attrs') {
      setSpecialEntry(result, group, rawKey, value);
      continue;
    }

    setFlatEntry(result, rawKey, value, `syntax group "${rawGroup}"`, group);
  }
}

function parseObjectSyntax(input: FadhilWebSyntaxObject) {
  const cached = parsedObjectSyntaxCache.get(input);
  if (cached) {
    return cached;
  }

  const result: FadhilWebFlatSyntaxObject = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    const normalizedGroup = normalizeGroupName(rawKey);
    if (normalizedGroup) {
      applyGroupObjectSyntax(result, rawKey, rawValue);
      continue;
    }

    if (typeof rawValue === 'object') {
      throw createSyntaxError(`Syntax key "${rawKey}" does not accept nested objects.`);
    }

    setFlatEntry(result, rawKey, rawValue, 'syntax object');
  }

  const normalized = freezeParsedSyntax(result);
  parsedObjectSyntaxCache.set(input, normalized);
  return normalized;
}

function parseStringSyntax(input: string) {
  const cached = parsedStringSyntaxCache.get(input);
  if (cached) {
    return cached;
  }

  const result: FadhilWebFlatSyntaxObject = {};

  for (const segment of splitTopLevelArgs(input, ';')) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = findTopLevelSeparator(trimmed, ':');
    if (separatorIndex === -1) {
      const groupStartIndex = trimmed.indexOf('(');
      if (groupStartIndex > 0 && trimmed.endsWith(')')) {
        const rawGroup = trimmed.slice(0, groupStartIndex).trim();
        const body = trimmed.slice(groupStartIndex + 1, -1).trim();
        applyGroupStringSyntax(result, rawGroup, body);
        continue;
      }

      throw createSyntaxError(`Malformed syntax segment "${trimmed}". Expected key:value or group(...).`);
    }

    const rawKey = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!value) {
      throw createSyntaxError(`Syntax key "${rawKey}" is missing a value.`);
    }

    setFlatEntry(result, rawKey, value, `syntax segment "${trimmed}"`);
  }

  const normalized = freezeParsedSyntax(result);
  rememberCache(parsedStringSyntaxCache, input, normalized);
  return normalized;
}

export function parseSyntaxInput(input?: FadhilWebSyntax): FadhilWebFlatSyntaxObject {
  if (!input) {
    return EMPTY_PARSED_SYNTAX;
  }

  if (isCompiledSyntax(input)) {
    return input.input;
  }

  if (typeof input === 'string') {
    return parseStringSyntax(input);
  }

  return parseObjectSyntax(input);
}

export function mergeSyntax(...inputs: Array<FadhilWebSyntax | undefined>) {
  const merged: FadhilWebFlatSyntaxObject = {};
  let hasEntries = false;

  for (const input of inputs) {
    const parsed = parseSyntaxInput(input);

    if (parsed.vars) {
      merged.vars = {
        ...(merged.vars ?? {}),
        ...parsed.vars,
      };
      hasEntries = true;
    }

    if (parsed.aria) {
      merged.aria = {
        ...(merged.aria ?? {}),
        ...parsed.aria,
      };
      hasEntries = true;
    }

    if (parsed.data) {
      merged.data = {
        ...(merged.data ?? {}),
        ...parsed.data,
      };
      hasEntries = true;
    }

    if (parsed.css) {
      merged.css = {
        ...(merged.css ?? {}),
        ...parsed.css,
      };
      hasEntries = true;
    }

    if (parsed.attrs) {
      merged.attrs = {
        ...(merged.attrs ?? {}),
        ...parsed.attrs,
      };
      hasEntries = true;
    }

    for (const [rawKey, rawValue] of Object.entries(parsed)) {
      if (rawKey === 'vars' || rawKey === 'aria' || rawKey === 'data' || rawKey === 'css' || rawKey === 'attrs') {
        continue;
      }

      Object.assign(merged, { [rawKey]: rawValue });
      hasEntries = true;
    }
  }

  if (!hasEntries) {
    return EMPTY_PARSED_SYNTAX;
  }

  return freezeParsedSyntax(merged);
}

export function composeSyntax(...inputs: Array<FadhilWebSyntax | undefined>) {
  const active = inputs.filter(Boolean) as FadhilWebSyntax[];

  if (active.length === 0) {
    return undefined;
  }

  if (active.length === 1) {
    return active[0];
  }

  return mergeSyntax(...active);
}

export function compileSyntax(input?: FadhilWebSyntax) {
  const parsed = parseSyntaxInput(input);
  const resolved = resolveSyntax(parsed);

  return Object.freeze({
    __fwlbType: 'compiled-syntax' as const,
    input: parsed,
    resolved,
  });
}

export function defineSyntax(...inputs: Array<FadhilWebSyntax | undefined>) {
  return compileSyntax(composeSyntax(...inputs));
}

export {
  parseBoolean,
  parseNumber,
  parseSemantic,
  resolveNumberishValue,
  normalizeVarValue,
  parseSyntaxAttributeMap,
  parseSyntaxEscapeMap,
  parseSyntaxVariables,
  splitTopLevelArgs,
};
