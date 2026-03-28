import type React from 'react';
import { composeSyntax, defineSyntax, resolveSyntax } from './syntax';
import type {
  FadhilWebCompiledStateSyntax,
  FadhilWebStateName,
  FadhilWebStateSyntax,
  FadhilWebStateSyntaxMap,
  ResolvedStateSyntax,
} from './types';

const STATE_NAMES = ['hover', 'active', 'focus', 'disabled', 'loading', 'open', 'current'] as const satisfies readonly FadhilWebStateName[];
const EMPTY_STATE_SYNTAX = Object.freeze({}) as ResolvedStateSyntax;

const STATEFUL_STYLE_PROPERTIES = {
  background: 'background',
  backgroundImage: 'background-image',
  backgroundSize: 'background-size',
  backgroundPosition: 'background-position',
  backgroundRepeat: 'background-repeat',
  color: 'color',
  borderColor: 'border-color',
  borderWidth: 'border-width',
  borderStyle: 'border-style',
  borderRadius: 'border-radius',
  boxShadow: 'box-shadow',
  opacity: 'opacity',
  transform: 'transform',
  filter: 'filter',
  backdropFilter: 'backdrop-filter',
  outlineColor: 'outline-color',
  outlineWidth: 'outline-width',
  outlineOffset: 'outline-offset',
  cursor: 'cursor',
  pointerEvents: 'pointer-events',
} as const;

type StatefulStyleProperty = keyof typeof STATEFUL_STYLE_PROPERTIES;
type StyleMap = Record<string, string | number | undefined>;

function isCompiledStateSyntax(input: FadhilWebStateSyntax): input is FadhilWebCompiledStateSyntax {
  return typeof input === 'object' && input !== null && '__fwlbType' in input && input.__fwlbType === 'compiled-state-syntax';
}

function toStateSyntaxMap(input?: FadhilWebStateSyntax): FadhilWebStateSyntaxMap | undefined {
  if (!input) {
    return undefined;
  }

  return isCompiledStateSyntax(input) ? input.input : input;
}

export function composeStateSyntax(...inputs: Array<FadhilWebStateSyntax | undefined>) {
  const merged: FadhilWebStateSyntaxMap = {};
  let hasEntries = false;

  for (const input of inputs) {
    const current = toStateSyntaxMap(input);
    if (!current) {
      continue;
    }

    for (const stateName of STATE_NAMES) {
      const stateSyntax = current[stateName];
      if (!stateSyntax) {
        continue;
      }

      merged[stateName] = composeSyntax(merged[stateName], stateSyntax);
      hasEntries = true;
    }
  }

  return hasEntries ? Object.freeze(merged) : undefined;
}

export function resolveStateSyntax(input?: FadhilWebStateSyntax): ResolvedStateSyntax {
  if (!input) {
    return EMPTY_STATE_SYNTAX;
  }

  if (isCompiledStateSyntax(input)) {
    return input.resolved;
  }

  const result: ResolvedStateSyntax = {};
  let hasEntries = false;

  for (const stateName of STATE_NAMES) {
    const stateSyntax = input[stateName];
    if (!stateSyntax) {
      continue;
    }

    result[stateName] = resolveSyntax(stateSyntax);
    hasEntries = true;
  }

  return hasEntries ? Object.freeze(result) : EMPTY_STATE_SYNTAX;
}

export function defineStateSyntax(...inputs: Array<FadhilWebStateSyntax | undefined>) {
  const merged = composeStateSyntax(...inputs);
  const normalized: FadhilWebStateSyntaxMap = {};

  if (merged) {
    for (const stateName of STATE_NAMES) {
      const stateSyntax = merged[stateName];
      if (!stateSyntax) {
        continue;
      }

      normalized[stateName] = defineSyntax(stateSyntax);
    }
  }

  const input = Object.freeze(normalized) as FadhilWebStateSyntaxMap;
  const resolved = resolveStateSyntax(input);

  return Object.freeze({
    __fwlbType: 'compiled-state-syntax' as const,
    input,
    resolved,
  }) as FadhilWebCompiledStateSyntax;
}

export function createStateStyleVariables(
  baseStyle: React.CSSProperties,
  resolvedStates?: ResolvedStateSyntax,
) {
  if ((!resolvedStates || Object.keys(resolvedStates).length === 0) && Object.keys(baseStyle).length === 0) {
    return baseStyle;
  }

  const inlineStyle = { ...baseStyle } as StyleMap;
  const variableStyle: StyleMap = {};
  let hasVariables = false;

  for (const [property, suffix] of Object.entries(STATEFUL_STYLE_PROPERTIES) as Array<[StatefulStyleProperty, string]>) {
    const baseValue = inlineStyle[property];
    if (baseValue !== undefined) {
      variableStyle[`--fwlb-base-${suffix}`] = baseValue;
      delete inlineStyle[property];
      hasVariables = true;
    }

    if (!resolvedStates) {
      continue;
    }

    for (const stateName of STATE_NAMES) {
      const stateStyle = resolvedStates[stateName]?.style as StyleMap | undefined;
      const stateValue = stateStyle?.[property];
      if (stateValue === undefined) {
        continue;
      }

      variableStyle[`--fwlb-${stateName}-${suffix}`] = stateValue;
      hasVariables = true;
    }
  }

  if (!hasVariables) {
    return baseStyle;
  }

  return {
    ...inlineStyle,
    ...variableStyle,
  } as React.CSSProperties;
}
