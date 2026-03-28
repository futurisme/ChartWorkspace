import type React from 'react';
import { resolveLengthValue } from './space';
import type {
  Density,
  FadhilWebCompiledSyntax,
  FadhilWebSyntax,
  FadhilWebSyntaxObject,
  LayoutAlign,
  LayoutJustify,
  PresenceMode,
  ResolvedSyntax,
  ResolvedSyntaxLogic,
  ResolvedSyntaxSemantics,
  Size,
  SyntaxScalar,
  Tone,
} from './types';

const MAX_CACHE_SIZE = 250;
const parsedStringSyntaxCache = new Map<string, FadhilWebSyntaxObject>();
const resolvedStringSyntaxCache = new Map<string, ResolvedSyntax>();
const parsedObjectSyntaxCache = new WeakMap<object, FadhilWebSyntaxObject>();
const resolvedObjectSyntaxCache = new WeakMap<object, ResolvedSyntax>();

const EMPTY_PARSED_SYNTAX = Object.freeze({}) as FadhilWebSyntaxObject;
const EMPTY_STYLE = Object.freeze({}) as React.CSSProperties;
const EMPTY_SEMANTICS = Object.freeze({}) as ResolvedSyntaxSemantics;
const EMPTY_LOGIC = Object.freeze({}) as ResolvedSyntaxLogic;
const EMPTY_ATTRS = Object.freeze({}) as Record<string, SyntaxScalar>;
const EMPTY_RESOLVED_SYNTAX = Object.freeze({
  style: EMPTY_STYLE,
  semantics: EMPTY_SEMANTICS,
  logic: EMPTY_LOGIC,
  attrs: EMPTY_ATTRS,
}) as ResolvedSyntax;

type CanonicalSyntaxKey = keyof FadhilWebSyntaxObject;

const KEY_ALIASES: Record<string, CanonicalSyntaxKey> = {
  tone: 'tone',
  size: 'size',
  density: 'density',
  compact: 'compact',
  full: 'full',
  fullwidth: 'full',
  bg: 'bg',
  background: 'bg',
  gradient: 'gradient',
  gradienttext: 'gradientText',
  gtext: 'gradientText',
  bgimage: 'bgImage',
  bgsize: 'bgSize',
  bgposition: 'bgPosition',
  bgpos: 'bgPosition',
  bgrepeat: 'bgRepeat',
  bgclip: 'bgClip',
  bgorigin: 'bgOrigin',
  fg: 'fg',
  color: 'fg',
  border: 'border',
  bordercolor: 'border',
  bw: 'borderWidth',
  borderwidth: 'borderWidth',
  bs: 'borderStyle',
  borderstyle: 'borderStyle',
  shadow: 'shadow',
  ring: 'ring',
  ringcolor: 'ringColor',
  ringoffset: 'ringOffset',
  ringoffsetcolor: 'ringOffsetColor',
  radius: 'radius',
  r: 'radius',
  outlinecolor: 'outlineColor',
  outlinewidth: 'outlineWidth',
  outlineoffset: 'outlineOffset',
  gap: 'gap',
  p: 'p',
  px: 'px',
  py: 'py',
  pt: 'pt',
  pr: 'pr',
  pb: 'pb',
  pl: 'pl',
  m: 'm',
  mx: 'mx',
  my: 'my',
  mt: 'mt',
  mr: 'mr',
  mb: 'mb',
  ml: 'ml',
  w: 'w',
  width: 'w',
  h: 'h',
  height: 'h',
  minw: 'minW',
  maxw: 'maxW',
  minh: 'minH',
  maxh: 'maxH',
  fs: 'fontSize',
  fontsize: 'fontSize',
  font: 'fontSize',
  ff: 'fontFamily',
  fontfamily: 'fontFamily',
  fw: 'weight',
  weight: 'weight',
  lh: 'lineHeight',
  lineheight: 'lineHeight',
  tracking: 'tracking',
  ls: 'tracking',
  textalign: 'textAlign',
  ta: 'textAlign',
  texttransform: 'textTransform',
  transform: 'transform',
  whitespace: 'whiteSpace',
  ws: 'whiteSpace',
  opacity: 'opacity',
  accent: 'accent',
  accentcolor: 'accent',
  caret: 'caret',
  caretcolor: 'caret',
  display: 'display',
  direction: 'direction',
  dir: 'direction',
  wrap: 'wrap',
  align: 'align',
  justify: 'justify',
  self: 'self',
  grow: 'grow',
  shrink: 'shrink',
  basis: 'basis',
  order: 'order',
  ord: 'order',
  cols: 'cols',
  columns: 'cols',
  rows: 'rows',
  autoflow: 'autoFlow',
  autocols: 'autoCols',
  autorows: 'autoRows',
  placeitems: 'placeItems',
  placecontent: 'placeContent',
  justifyitems: 'justifyItems',
  justifyself: 'justifySelf',
  gridcolumn: 'gridColumn',
  gridrow: 'gridRow',
  aspect: 'aspect',
  aspectratio: 'aspect',
  overflow: 'overflow',
  overflowx: 'overflowX',
  ox: 'overflowX',
  overflowy: 'overflowY',
  oy: 'overflowY',
  position: 'position',
  pos: 'position',
  inset: 'inset',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
  z: 'z',
  zindex: 'z',
  cursor: 'cursor',
  pointerevents: 'pointerEvents',
  pe: 'pointerEvents',
  filter: 'filter',
  backdrop: 'backdrop',
  backdropfilter: 'backdrop',
  blend: 'blend',
  mixblendmode: 'blend',
  isolation: 'isolation',
  transformorigin: 'transformOrigin',
  origin: 'transformOrigin',
  transition: 'transition',
  duration: 'duration',
  ease: 'ease',
  delay: 'delay',
  animation: 'animation',
  animationduration: 'animationDuration',
  animationdelay: 'animationDelay',
  animationtiming: 'animationTiming',
  willchange: 'willChange',
  scale: 'scale',
  scalex: 'scaleX',
  scaley: 'scaleY',
  rotate: 'rotate',
  translatex: 'translateX',
  tx: 'translateX',
  translatey: 'translateY',
  ty: 'translateY',
  skewx: 'skewX',
  skewy: 'skewY',
  blur: 'blur',
  brightness: 'brightness',
  contrast: 'contrast',
  saturate: 'saturate',
  contain: 'contain',
  contentvisibility: 'contentVisibility',
  cv: 'contentVisibility',
  containintrinsicsize: 'containIntrinsicSize',
  cis: 'containIntrinsicSize',
  role: 'role',
  tabindex: 'tabIndex',
  title: 'titleText',
  titletext: 'titleText',
  inert: 'inert',
  loading: 'loading',
  disabled: 'disabled',
  open: 'open',
  hidden: 'hidden',
  current: 'current',
  presence: 'presence',
  aria: 'aria',
  data: 'data',
  vars: 'vars',
};

const BOOLEAN_TRUE = new Set(['true', '1', 'yes', 'on', 'wrap']);
const BOOLEAN_FALSE = new Set(['false', '0', 'no', 'off', 'nowrap']);

function rememberCache<T>(cache: Map<string, T>, key: string, value: T) {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }

  cache.set(key, value);
}

function normalizeKey(rawKey: string) {
  return KEY_ALIASES[rawKey.trim().toLowerCase()];
}

function isCompiledSyntax(input: FadhilWebSyntax): input is FadhilWebCompiledSyntax {
  return typeof input === 'object' && input !== null && '__fwlbType' in input && input.__fwlbType === 'compiled-syntax';
}

function freezeResolvedSyntax(
  style: React.CSSProperties,
  semantics: ResolvedSyntaxSemantics,
  logic: ResolvedSyntaxLogic,
  attrs: Record<string, SyntaxScalar>,
) {
  return Object.freeze({
    style: Object.freeze(style) as React.CSSProperties,
    semantics: Object.freeze(semantics) as ResolvedSyntaxSemantics,
    logic: Object.freeze(logic) as ResolvedSyntaxLogic,
    attrs: Object.freeze(attrs) as Record<string, SyntaxScalar>,
  }) as ResolvedSyntax;
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

function parseSyntaxVariables(
  value: FadhilWebSyntaxObject['vars'] | string | number | boolean | undefined,
) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const vars: Record<`--${string}`, SyntaxScalar> = {};

  for (const [rawName, rawValue] of Object.entries(value) as Array<[`--${string}`, SyntaxScalar | undefined]>) {
    if (!rawName.startsWith('--')) {
      continue;
    }

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    vars[rawName] = rawValue;
  }

  return Object.keys(vars).length ? Object.freeze(vars) : undefined;
}

function parseSyntaxAttributeMap(
  value: Record<string, SyntaxScalar | undefined> | string | number | boolean | undefined,
  prefix: 'aria' | 'data',
) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const attrs: Record<`${typeof prefix}-${string}`, SyntaxScalar> = {} as Record<`${typeof prefix}-${string}`, SyntaxScalar>;

  for (const [rawName, rawValue] of Object.entries(value) as Array<[string, SyntaxScalar | undefined]>) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    const normalizedName = rawName.startsWith(`${prefix}-`) ? rawName : `${prefix}-${rawName}`;
    attrs[normalizedName as `${typeof prefix}-${string}`] = rawValue;
  }

  return Object.keys(attrs).length ? Object.freeze(attrs) : undefined;
}

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

function resolveExpressionValue(value: string): string {
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

function resolveSyntaxString(value: string | undefined) {
  if (!value) {
    return value;
  }

  return resolveExpressionValue(value);
}

function resolveTimeValue(value: string | number | boolean | undefined) {
  const parsed = parseNumber(value);
  if (parsed !== undefined) {
    return `${parsed}ms`;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || undefined;
  }

  return undefined;
}

function resolveAngleValue(value: string | number | boolean | undefined) {
  const parsed = parseNumber(value);
  if (parsed !== undefined) {
    return `${parsed}deg`;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || undefined;
  }

  return undefined;
}

function buildTransformValue(syntax: FadhilWebSyntaxObject) {
  const segments: string[] = [];

  if (syntax.translateX !== undefined) segments.push(`translateX(${resolveLengthValue(syntax.translateX)})`);
  if (syntax.translateY !== undefined) segments.push(`translateY(${resolveLengthValue(syntax.translateY)})`);
  if (syntax.scale !== undefined) segments.push(`scale(${resolveNumberishValue(syntax.scale)})`);
  if (syntax.scaleX !== undefined) segments.push(`scaleX(${resolveNumberishValue(syntax.scaleX)})`);
  if (syntax.scaleY !== undefined) segments.push(`scaleY(${resolveNumberishValue(syntax.scaleY)})`);
  if (syntax.rotate !== undefined) segments.push(`rotate(${resolveAngleValue(syntax.rotate)})`);
  if (syntax.skewX !== undefined) segments.push(`skewX(${resolveAngleValue(syntax.skewX)})`);
  if (syntax.skewY !== undefined) segments.push(`skewY(${resolveAngleValue(syntax.skewY)})`);
  if (syntax.transform) {
    const transform = resolveSyntaxString(syntax.transform);
    if (transform) {
      segments.push(transform);
    }
  }

  return segments.length ? segments.join(' ') : undefined;
}

function buildFilterValue(syntax: FadhilWebSyntaxObject) {
  const segments: string[] = [];

  if (syntax.blur !== undefined) segments.push(`blur(${resolveLengthValue(syntax.blur)})`);
  if (syntax.brightness !== undefined) segments.push(`brightness(${resolveNumberishValue(syntax.brightness)})`);
  if (syntax.contrast !== undefined) segments.push(`contrast(${resolveNumberishValue(syntax.contrast)})`);
  if (syntax.saturate !== undefined) segments.push(`saturate(${resolveNumberishValue(syntax.saturate)})`);
  if (syntax.filter) {
    const filter = resolveSyntaxString(syntax.filter);
    if (filter) {
      segments.push(filter);
    }
  }

  return segments.length ? segments.join(' ') : undefined;
}

function buildGridTrackValue(value: string | number | boolean | undefined) {
  const parsed = parseNumber(value);
  if (parsed !== undefined) {
    return `repeat(${parsed}, minmax(0, 1fr))`;
  }

  if (typeof value === 'string') {
    return resolveSyntaxString(value);
  }

  return undefined;
}

function buildRingShadow(
  ringWidth: string | number | boolean | undefined,
  ringColor: string | undefined,
  ringOffset: string | number | boolean | undefined,
  ringOffsetColor: string | undefined,
  existingShadow: string | undefined,
) {
  const segments: string[] = [];
  const width = typeof ringWidth === 'boolean' ? undefined : resolveLengthValue(ringWidth);
  const offset = typeof ringOffset === 'boolean' ? undefined : resolveLengthValue(ringOffset);

  if (width && ringOffsetColor) {
    const offsetWidth = offset ? `calc(${width} + ${offset})` : width;
    segments.push(`0 0 0 ${offsetWidth} ${resolveSyntaxString(ringOffsetColor)}`);
  }

  if (width && ringColor) {
    segments.push(`0 0 0 ${width} ${resolveSyntaxString(ringColor)}`);
  }

  if (existingShadow) {
    segments.push(existingShadow);
  }

  return segments.length ? segments.join(', ') : undefined;
}

function parseObjectSyntax(input: FadhilWebSyntaxObject) {
  const cached = parsedObjectSyntaxCache.get(input);
  if (cached) {
    return cached;
  }

  const result: FadhilWebSyntaxObject = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (rawKey === 'vars') {
      const vars = parseSyntaxVariables(rawValue as FadhilWebSyntaxObject['vars']);
      if (vars) {
        result.vars = vars;
      }

      continue;
    }

    if (rawKey === 'aria') {
      const aria = parseSyntaxAttributeMap(rawValue as Record<string, SyntaxScalar | undefined>, 'aria');
      if (aria) {
        result.aria = aria;
      }

      continue;
    }

    if (rawKey === 'data') {
      const data = parseSyntaxAttributeMap(rawValue as Record<string, SyntaxScalar | undefined>, 'data');
      if (data) {
        result.data = data;
      }

      continue;
    }

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    Object.assign(result, { [rawKey]: rawValue });
  }

  const normalized = Object.freeze(result) as FadhilWebSyntaxObject;
  parsedObjectSyntaxCache.set(input, normalized);
  return normalized;
}

function parseStringSyntax(input: string) {
  const cached = parsedStringSyntaxCache.get(input);
  if (cached) {
    return cached;
  }

  const result: FadhilWebSyntaxObject = {};

  for (const segment of input.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex < 1) {
      continue;
    }

    const rawKey = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!value) {
      continue;
    }

    if (rawKey.startsWith('--')) {
      result.vars = {
        ...(result.vars ?? {}),
        [rawKey]: value,
      } as Record<`--${string}`, SyntaxScalar>;
      continue;
    }

    if (rawKey.startsWith('aria-')) {
      result.aria = {
        ...(result.aria ?? {}),
        [rawKey]: value,
      } as Record<`aria-${string}`, SyntaxScalar>;
      continue;
    }

    if (rawKey.startsWith('data-')) {
      result.data = {
        ...(result.data ?? {}),
        [rawKey]: value,
      } as Record<`data-${string}`, SyntaxScalar>;
      continue;
    }

    const key = normalizeKey(rawKey);
    if (!key) {
      continue;
    }

    if (key === 'vars') {
      continue;
    }

    Object.assign(result, { [key]: value });
  }

  if (result.vars) {
    result.vars = Object.freeze(result.vars);
  }

  if (result.aria) {
    result.aria = Object.freeze(result.aria);
  }

  if (result.data) {
    result.data = Object.freeze(result.data);
  }

  const normalized = Object.freeze(result) as FadhilWebSyntaxObject;
  rememberCache(parsedStringSyntaxCache, input, normalized);
  return normalized;
}

function resolveParsedSyntax(syntax: FadhilWebSyntaxObject) {
  const style: React.CSSProperties = {};
  const semantics: ResolvedSyntaxSemantics = {};
  const logic: ResolvedSyntaxLogic = {};
  const attrs: Record<string, SyntaxScalar> = {};
  const styleMap = style as Record<string, string | number | undefined>;

  if (syntax.vars) {
    for (const [name, value] of Object.entries(syntax.vars) as Array<[`--${string}`, SyntaxScalar]>) {
      styleMap[name] = normalizeVarValue(value);
    }
  }

  if (syntax.bg) style.background = resolveSyntaxString(syntax.bg);
  if (syntax.gradient) style.backgroundImage = resolveSyntaxString(syntax.gradient);
  if (syntax.bgImage) style.backgroundImage = resolveSyntaxString(syntax.bgImage);
  if (syntax.bgSize) style.backgroundSize = resolveSyntaxString(syntax.bgSize);
  if (syntax.bgPosition) style.backgroundPosition = resolveSyntaxString(syntax.bgPosition);
  if (syntax.bgRepeat) style.backgroundRepeat = resolveSyntaxString(syntax.bgRepeat) as React.CSSProperties['backgroundRepeat'];
  if (syntax.bgClip) style.backgroundClip = resolveSyntaxString(syntax.bgClip) as React.CSSProperties['backgroundClip'];
  if (syntax.bgOrigin) style.backgroundOrigin = resolveSyntaxString(syntax.bgOrigin) as React.CSSProperties['backgroundOrigin'];
  if (syntax.fg) style.color = resolveSyntaxString(syntax.fg);
  if (syntax.gradientText) {
    style.backgroundImage = resolveSyntaxString(syntax.gradientText);
    style.backgroundClip = 'text';
    styleMap.WebkitBackgroundClip = 'text';
    style.color = 'transparent';
    styleMap.WebkitTextFillColor = 'transparent';
  }
  if (syntax.border) style.borderColor = resolveSyntaxString(syntax.border);
  if (syntax.borderWidth !== undefined) style.borderWidth = resolveLengthValue(syntax.borderWidth);
  if (syntax.borderStyle) style.borderStyle = resolveSyntaxString(syntax.borderStyle);
  const shadowValue = syntax.shadow ? resolveSyntaxString(syntax.shadow) : undefined;
  style.boxShadow = buildRingShadow(syntax.ring, syntax.ringColor, syntax.ringOffset, syntax.ringOffsetColor, shadowValue);
  if (syntax.radius !== undefined) style.borderRadius = resolveLengthValue(syntax.radius);
  if (syntax.outlineColor) style.outlineColor = resolveSyntaxString(syntax.outlineColor);
  if (syntax.outlineWidth !== undefined) style.outlineWidth = resolveLengthValue(syntax.outlineWidth);
  if (syntax.outlineOffset !== undefined) style.outlineOffset = resolveLengthValue(syntax.outlineOffset);
  if (syntax.gap !== undefined) style.gap = resolveLengthValue(syntax.gap);
  if (syntax.p !== undefined) style.padding = resolveLengthValue(syntax.p);
  if (syntax.px !== undefined) style.paddingInline = resolveLengthValue(syntax.px);
  if (syntax.py !== undefined) style.paddingBlock = resolveLengthValue(syntax.py);
  if (syntax.pt !== undefined) style.paddingTop = resolveLengthValue(syntax.pt);
  if (syntax.pr !== undefined) style.paddingRight = resolveLengthValue(syntax.pr);
  if (syntax.pb !== undefined) style.paddingBottom = resolveLengthValue(syntax.pb);
  if (syntax.pl !== undefined) style.paddingLeft = resolveLengthValue(syntax.pl);
  if (syntax.m !== undefined) style.margin = resolveLengthValue(syntax.m);
  if (syntax.mx !== undefined) style.marginInline = resolveLengthValue(syntax.mx);
  if (syntax.my !== undefined) style.marginBlock = resolveLengthValue(syntax.my);
  if (syntax.mt !== undefined) style.marginTop = resolveLengthValue(syntax.mt);
  if (syntax.mr !== undefined) style.marginRight = resolveLengthValue(syntax.mr);
  if (syntax.mb !== undefined) style.marginBottom = resolveLengthValue(syntax.mb);
  if (syntax.ml !== undefined) style.marginLeft = resolveLengthValue(syntax.ml);
  if (syntax.w !== undefined) style.width = resolveLengthValue(syntax.w);
  if (syntax.h !== undefined) style.height = resolveLengthValue(syntax.h);
  if (syntax.minW !== undefined) style.minWidth = resolveLengthValue(syntax.minW);
  if (syntax.maxW !== undefined) style.maxWidth = resolveLengthValue(syntax.maxW);
  if (syntax.minH !== undefined) style.minHeight = resolveLengthValue(syntax.minH);
  if (syntax.maxH !== undefined) style.maxHeight = resolveLengthValue(syntax.maxH);
  if (syntax.fontSize !== undefined) style.fontSize = resolveLengthValue(syntax.fontSize);
  if (syntax.fontFamily) style.fontFamily = syntax.fontFamily;
  if (syntax.weight !== undefined) style.fontWeight = parseNumber(syntax.weight) ?? String(syntax.weight);
  if (syntax.lineHeight !== undefined) style.lineHeight = resolveNumberishValue(syntax.lineHeight);
  if (syntax.tracking !== undefined) style.letterSpacing = resolveLengthValue(syntax.tracking);
  if (syntax.textAlign) style.textAlign = syntax.textAlign as React.CSSProperties['textAlign'];
  if (syntax.textTransform) style.textTransform = syntax.textTransform as React.CSSProperties['textTransform'];
  if (syntax.whiteSpace) style.whiteSpace = syntax.whiteSpace as React.CSSProperties['whiteSpace'];
  if (syntax.opacity !== undefined) style.opacity = parseNumber(syntax.opacity) ?? undefined;
  if (syntax.accent) style.accentColor = resolveSyntaxString(syntax.accent);
  if (syntax.caret) style.caretColor = resolveSyntaxString(syntax.caret);
  if (syntax.display) style.display = resolveSyntaxString(syntax.display);
  if (syntax.grow !== undefined) style.flexGrow = parseNumber(syntax.grow);
  if (syntax.shrink !== undefined) style.flexShrink = parseNumber(syntax.shrink);
  if (syntax.basis !== undefined) style.flexBasis = resolveLengthValue(syntax.basis);
  if (syntax.order !== undefined) style.order = resolveNumberishValue(syntax.order);
  if (syntax.cols !== undefined) style.gridTemplateColumns = buildGridTrackValue(syntax.cols);
  if (syntax.rows !== undefined) style.gridTemplateRows = buildGridTrackValue(syntax.rows);
  if (syntax.autoFlow) style.gridAutoFlow = resolveSyntaxString(syntax.autoFlow) as React.CSSProperties['gridAutoFlow'];
  if (syntax.autoCols !== undefined) style.gridAutoColumns = resolveLengthValue(syntax.autoCols);
  if (syntax.autoRows !== undefined) style.gridAutoRows = resolveLengthValue(syntax.autoRows);
  if (syntax.placeItems) style.placeItems = resolveSyntaxString(syntax.placeItems);
  if (syntax.placeContent) style.placeContent = resolveSyntaxString(syntax.placeContent);
  if (syntax.justifyItems) style.justifyItems = resolveSyntaxString(syntax.justifyItems) as React.CSSProperties['justifyItems'];
  if (syntax.justifySelf) style.justifySelf = resolveSyntaxString(syntax.justifySelf) as React.CSSProperties['justifySelf'];
  if (syntax.gridColumn) style.gridColumn = resolveSyntaxString(syntax.gridColumn);
  if (syntax.gridRow) style.gridRow = resolveSyntaxString(syntax.gridRow);
  if (syntax.aspect !== undefined) style.aspectRatio = resolveNumberishValue(syntax.aspect);
  if (syntax.overflow) style.overflow = syntax.overflow as React.CSSProperties['overflow'];
  if (syntax.overflowX) style.overflowX = syntax.overflowX as React.CSSProperties['overflowX'];
  if (syntax.overflowY) style.overflowY = syntax.overflowY as React.CSSProperties['overflowY'];
  if (syntax.position) style.position = syntax.position as React.CSSProperties['position'];
  if (syntax.inset !== undefined) style.inset = resolveLengthValue(syntax.inset);
  if (syntax.top !== undefined) style.top = resolveLengthValue(syntax.top);
  if (syntax.right !== undefined) style.right = resolveLengthValue(syntax.right);
  if (syntax.bottom !== undefined) style.bottom = resolveLengthValue(syntax.bottom);
  if (syntax.left !== undefined) style.left = resolveLengthValue(syntax.left);
  if (syntax.z !== undefined) style.zIndex = resolveNumberishValue(syntax.z);
  if (syntax.cursor) style.cursor = resolveSyntaxString(syntax.cursor);
  if (syntax.pointerEvents) style.pointerEvents = syntax.pointerEvents as React.CSSProperties['pointerEvents'];
  const filterValue = buildFilterValue(syntax);
  if (filterValue) style.filter = filterValue;
  if (syntax.backdrop) style.backdropFilter = resolveSyntaxString(syntax.backdrop);
  if (syntax.blend) style.mixBlendMode = resolveSyntaxString(syntax.blend) as React.CSSProperties['mixBlendMode'];
  if (syntax.isolation) style.isolation = resolveSyntaxString(syntax.isolation) as React.CSSProperties['isolation'];
  const transformValue = buildTransformValue(syntax);
  if (transformValue) style.transform = transformValue;
  if (syntax.transformOrigin) style.transformOrigin = resolveSyntaxString(syntax.transformOrigin);
  if (syntax.transition) style.transition = resolveSyntaxString(syntax.transition);
  if (syntax.duration !== undefined) style.transitionDuration = resolveTimeValue(syntax.duration);
  if (syntax.ease) style.transitionTimingFunction = resolveSyntaxString(syntax.ease);
  if (syntax.delay !== undefined) style.transitionDelay = resolveTimeValue(syntax.delay);
  if (syntax.animation) style.animation = resolveSyntaxString(syntax.animation);
  if (syntax.animationDuration !== undefined) style.animationDuration = resolveTimeValue(syntax.animationDuration);
  if (syntax.animationDelay !== undefined) style.animationDelay = resolveTimeValue(syntax.animationDelay);
  if (syntax.animationTiming) style.animationTimingFunction = resolveSyntaxString(syntax.animationTiming);
  if (syntax.willChange) style.willChange = resolveSyntaxString(syntax.willChange);
  if (syntax.contain) style.contain = syntax.contain as React.CSSProperties['contain'];
  if (syntax.contentVisibility) style.contentVisibility = syntax.contentVisibility as React.CSSProperties['contentVisibility'];
  if (syntax.containIntrinsicSize !== undefined) {
    style.containIntrinsicSize = resolveLengthValue(syntax.containIntrinsicSize) as React.CSSProperties['containIntrinsicSize'];
  }

  const direction = parseSemantic(syntax.direction, ['row', 'column'] as const);
  if (direction) {
    semantics.direction = direction;
    style.flexDirection = direction;
  }

  const wrap = parseBoolean(syntax.wrap);
  if (wrap !== undefined) {
    semantics.wrap = wrap;
    style.flexWrap = wrap ? 'wrap' : 'nowrap';
  }

  const align = parseSemantic(syntax.align, ['start', 'center', 'end', 'stretch', 'baseline'] as const);
  if (align) {
    if (align === 'start') style.alignItems = 'flex-start';
    else if (align === 'end') style.alignItems = 'flex-end';
    else style.alignItems = align;

    if (align !== 'baseline') {
      semantics.align = align as LayoutAlign;
    }
  }

  const justify = parseSemantic(syntax.justify, ['start', 'center', 'end', 'between', 'around', 'evenly'] as const);
  if (justify) {
    if (justify === 'start') style.justifyContent = 'flex-start';
    else if (justify === 'end') style.justifyContent = 'flex-end';
    else if (justify === 'between') style.justifyContent = 'space-between';
    else if (justify === 'around') style.justifyContent = 'space-around';
    else if (justify === 'evenly') style.justifyContent = 'space-evenly';
    else style.justifyContent = justify;

    if (justify === 'start' || justify === 'center' || justify === 'end' || justify === 'between') {
      semantics.justify = justify as LayoutJustify;
    }
  }

  const self = parseSemantic(syntax.self, ['start', 'center', 'end', 'stretch', 'baseline', 'auto'] as const);
  if (self) {
    if (self === 'start') style.alignSelf = 'flex-start';
    else if (self === 'end') style.alignSelf = 'flex-end';
    else style.alignSelf = self;
  }

  const tone = parseSemantic(syntax.tone, ['neutral', 'brand', 'success', 'warning', 'danger', 'info'] as const);
  if (tone) semantics.tone = tone;

  const size = parseSemantic(syntax.size, ['xs', 'sm', 'md', 'lg'] as const);
  if (size) semantics.size = size;

  const density = parseSemantic(syntax.density, ['compact', 'comfortable', 'spacious'] as const);
  if (density) semantics.density = density;

  const compact = parseBoolean(syntax.compact);
  if (compact !== undefined) semantics.compact = compact;

  const full = parseBoolean(syntax.full);
  if (full !== undefined) {
    semantics.full = full;
    if (full) {
      style.width = style.width ?? '100%';
    }
  }

  const disabled = parseBoolean(syntax.disabled);
  if (disabled !== undefined) logic.disabled = disabled;

  const loading = parseBoolean(syntax.loading);
  if (loading !== undefined) logic.loading = loading;

  const open = parseBoolean(syntax.open);
  if (open !== undefined) logic.open = open;

  const hidden = parseBoolean(syntax.hidden);
  if (hidden !== undefined) {
    logic.hidden = hidden;
    attrs.hidden = hidden;
  }

  const current = parseBoolean(syntax.current);
  if (current !== undefined) {
    logic.current = current;
  }

  const inert = parseBoolean(syntax.inert);
  if (inert !== undefined) {
    attrs.inert = inert;
  }

  const presence = parseSemantic(syntax.presence, ['keep', 'lazy', 'unmount'] as const);
  if (presence) {
    logic.presence = presence as PresenceMode;
  }

  if (syntax.role) attrs.role = syntax.role;

  if (syntax.tabIndex !== undefined) {
    const resolvedTabIndex = parseNumber(syntax.tabIndex) ?? resolveNumberishValue(syntax.tabIndex);
    if (resolvedTabIndex !== undefined) {
      attrs.tabIndex = resolvedTabIndex;
    }
  }

  if (syntax.titleText) attrs.title = syntax.titleText;

  if (syntax.aria) {
    for (const [key, value] of Object.entries(syntax.aria) as Array<[`aria-${string}`, SyntaxScalar]>) {
      attrs[key] = value;
    }
  }

  if (syntax.data) {
    for (const [key, value] of Object.entries(syntax.data) as Array<[`data-${string}`, SyntaxScalar]>) {
      attrs[key] = value;
    }
  }

  return freezeResolvedSyntax(style, semantics, logic, attrs);
}

export function parseSyntaxInput(input?: FadhilWebSyntax): FadhilWebSyntaxObject {
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
  const merged: FadhilWebSyntaxObject = {};
  let hasEntries = false;

  for (const input of inputs) {
    const parsed = parseSyntaxInput(input);

    if ('vars' in parsed && parsed.vars) {
      merged.vars = {
        ...(merged.vars ?? {}),
        ...parsed.vars,
      };
      hasEntries = true;
    }

    if ('aria' in parsed && parsed.aria) {
      merged.aria = {
        ...(merged.aria ?? {}),
        ...parsed.aria,
      };
      hasEntries = true;
    }

    if ('data' in parsed && parsed.data) {
      merged.data = {
        ...(merged.data ?? {}),
        ...parsed.data,
      };
      hasEntries = true;
    }

    for (const [rawKey, rawValue] of Object.entries(parsed)) {
      if (rawKey === 'vars' || rawKey === 'aria' || rawKey === 'data') {
        continue;
      }

      Object.assign(merged, { [rawKey]: rawValue });
      hasEntries = true;
    }
  }

  if (!hasEntries) {
    return {};
  }

  if (merged.vars) {
    merged.vars = Object.freeze(merged.vars);
  }

  if (merged.aria) {
    merged.aria = Object.freeze(merged.aria);
  }

  if (merged.data) {
    merged.data = Object.freeze(merged.data);
  }

  return merged;
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
  const resolved = resolveParsedSyntax(parsed);

  return Object.freeze({
    __fwlbType: 'compiled-syntax' as const,
    input: parsed,
    resolved,
  }) as FadhilWebCompiledSyntax;
}

export function defineSyntax(...inputs: Array<FadhilWebSyntax | undefined>) {
  return compileSyntax(composeSyntax(...inputs));
}

export function resolveSyntax(input?: FadhilWebSyntax): ResolvedSyntax {
  if (!input) {
    return EMPTY_RESOLVED_SYNTAX;
  }

  if (isCompiledSyntax(input)) {
    return input.resolved;
  }

  if (typeof input === 'string') {
    const cached = resolvedStringSyntaxCache.get(input);
    if (cached) {
      return cached;
    }

    const resolved = resolveParsedSyntax(parseStringSyntax(input));
    rememberCache(resolvedStringSyntaxCache, input, resolved);
    return resolved;
  }

  const cached = resolvedObjectSyntaxCache.get(input);
  if (cached) {
    return cached;
  }

  const resolved = resolveParsedSyntax(parseObjectSyntax(input));
  resolvedObjectSyntaxCache.set(input, resolved);
  return resolved;
}
