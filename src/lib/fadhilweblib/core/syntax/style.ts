import type React from 'react';
import { resolveLengthValue } from '../space';
import type {
  Density,
  FadhilWebNormalizedSyntaxObject,
  FadhilWebSyntax,
  LayoutAlign,
  LayoutJustify,
  PresenceMode,
  ResolvedSyntax,
  ResolvedSyntaxLogic,
  ResolvedSyntaxSemantics,
  Size,
  SyntaxScalar,
  Tone,
} from '../types';
import { EMPTY_RESOLVED_SYNTAX, freezeResolvedSyntax, isCompiledSyntax, resolvedObjectSyntaxCache, resolvedStringSyntaxCache, rememberCache } from './constants';
import { resolveSyntaxString } from './expression';
import { parseBoolean, parseNumber, parseSemantic, parseSyntaxInput, resolveNumberishValue as parseNumberishValue } from './parse';

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

function normalizeVarValue(value: SyntaxScalar) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return value;
}

function normalizeStyleEscapeValue(value: SyntaxScalar) {
  if (typeof value === 'string') {
    return resolveSyntaxString(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return value;
}

function normalizeStylePropertyName(property: string) {
  const trimmed = property.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('--')) {
    return trimmed;
  }

  if (!trimmed.includes('-')) {
    return trimmed;
  }

  return trimmed
    .replace(/^-webkit-/, 'Webkit-')
    .replace(/^-moz-/, 'Moz-')
    .replace(/^-ms-/, 'ms-')
    .replace(/^-o-/, 'O-')
    .replace(/-([a-zA-Z])/g, (_, letter: string) => letter.toUpperCase());
}

function buildTransformValue(syntax: FadhilWebNormalizedSyntaxObject) {
  const segments: string[] = [];

  if (syntax.translateX !== undefined) segments.push(`translateX(${resolveLengthValue(syntax.translateX)})`);
  if (syntax.translateY !== undefined) segments.push(`translateY(${resolveLengthValue(syntax.translateY)})`);
  if (syntax.scale !== undefined) segments.push(`scale(${parseNumberishValue(syntax.scale)})`);
  if (syntax.scaleX !== undefined) segments.push(`scaleX(${parseNumberishValue(syntax.scaleX)})`);
  if (syntax.scaleY !== undefined) segments.push(`scaleY(${parseNumberishValue(syntax.scaleY)})`);
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

function buildFilterValue(syntax: FadhilWebNormalizedSyntaxObject) {
  const segments: string[] = [];

  if (syntax.blur !== undefined) segments.push(`blur(${resolveLengthValue(syntax.blur)})`);
  if (syntax.brightness !== undefined) segments.push(`brightness(${parseNumberishValue(syntax.brightness)})`);
  if (syntax.contrast !== undefined) segments.push(`contrast(${parseNumberishValue(syntax.contrast)})`);
  if (syntax.saturate !== undefined) segments.push(`saturate(${parseNumberishValue(syntax.saturate)})`);
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

function buildGridSpanValue(value: string | number | boolean | undefined) {
  const parsed = parseNumber(value);
  if (parsed !== undefined) {
    return `span ${parsed} / span ${parsed}`;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    return /^\d+$/.test(normalized) ? `span ${normalized} / span ${normalized}` : resolveSyntaxString(normalized);
  }

  return undefined;
}

function applyStickyStyle(style: React.CSSProperties, syntax: FadhilWebNormalizedSyntaxObject) {
  if (syntax.sticky === undefined) {
    return;
  }

  const enabled = typeof syntax.sticky === 'boolean' ? syntax.sticky : true;
  if (!enabled) {
    return;
  }

  style.position = 'sticky';
  style.top = style.top ?? (typeof syntax.sticky === 'boolean' ? '0px' : resolveLengthValue(syntax.sticky));
}

function applyPinStyle(style: React.CSSProperties, syntax: FadhilWebNormalizedSyntaxObject) {
  if (syntax.pin === undefined) {
    return;
  }

  const pinValue = typeof syntax.pin === 'boolean' ? (syntax.pin ? 'full' : '') : String(syntax.pin).trim().toLowerCase();
  if (!pinValue) {
    return;
  }

  style.position = style.position ?? 'absolute';

  switch (pinValue) {
    case 'full':
      style.inset = '0px';
      return;
    case 'x':
    case 'inline':
      style.left = '0px';
      style.right = '0px';
      return;
    case 'y':
    case 'block':
      style.top = '0px';
      style.bottom = '0px';
      return;
    case 'top':
      style.top = '0px';
      style.left = '0px';
      style.right = '0px';
      return;
    case 'right':
      style.top = '0px';
      style.right = '0px';
      style.bottom = '0px';
      return;
    case 'bottom':
      style.left = '0px';
      style.right = '0px';
      style.bottom = '0px';
      return;
    case 'left':
      style.top = '0px';
      style.left = '0px';
      style.bottom = '0px';
      return;
    default:
      style.inset = resolveLengthValue(pinValue);
  }
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

function applyTruncateStyle(style: React.CSSProperties) {
  style.overflow = style.overflow ?? 'hidden';
  style.textOverflow = style.textOverflow ?? 'ellipsis';
  style.whiteSpace = style.whiteSpace ?? 'nowrap';
}

function applyClampStyle(styleMap: Record<string, string | number | undefined>, lineCount: string | number | boolean | undefined) {
  const parsed = parseNumber(lineCount) ?? (typeof lineCount === 'string' ? lineCount.trim() : undefined);
  if (parsed === undefined || parsed === '') {
    return;
  }

  styleMap.display = '-webkit-box';
  styleMap.overflow = styleMap.overflow ?? 'hidden';
  styleMap.WebkitBoxOrient = 'vertical';
  styleMap.WebkitLineClamp = parsed;
}

function applyVisuallyHiddenStyle(styleMap: Record<string, string | number | undefined>) {
  styleMap.position = 'absolute';
  styleMap.width = '1px';
  styleMap.height = '1px';
  styleMap.padding = '0';
  styleMap.margin = '-1px';
  styleMap.overflow = 'hidden';
  styleMap.clip = 'rect(0, 0, 0, 0)';
  styleMap.whiteSpace = 'nowrap';
  styleMap.border = '0';
}

function resolveParsedSyntax(syntax: FadhilWebNormalizedSyntaxObject) {
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

  if (syntax.attrs) {
    for (const [name, value] of Object.entries(syntax.attrs) as Array<[string, SyntaxScalar]>) {
      attrs[name] = value;
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
  if (syntax.lineHeight !== undefined) style.lineHeight = parseNumberishValue(syntax.lineHeight);
  if (syntax.tracking !== undefined) style.letterSpacing = resolveLengthValue(syntax.tracking);
  if (syntax.textAlign) style.textAlign = syntax.textAlign as React.CSSProperties['textAlign'];
  if (syntax.textTransform) style.textTransform = syntax.textTransform as React.CSSProperties['textTransform'];
  if (syntax.whiteSpace) style.whiteSpace = syntax.whiteSpace as React.CSSProperties['whiteSpace'];
  if (syntax.textWrap) styleMap.textWrap = resolveSyntaxString(syntax.textWrap);
  if (parseBoolean(syntax.truncate)) applyTruncateStyle(style);
  if (syntax.clampLines !== undefined) applyClampStyle(styleMap, syntax.clampLines);
  if (syntax.opacity !== undefined) style.opacity = parseNumber(syntax.opacity) ?? undefined;
  if (syntax.accent) style.accentColor = resolveSyntaxString(syntax.accent);
  if (syntax.caret) style.caretColor = resolveSyntaxString(syntax.caret);
  if (syntax.display) style.display = resolveSyntaxString(syntax.display);
  if (syntax.grow !== undefined) style.flexGrow = parseNumber(syntax.grow);
  if (syntax.shrink !== undefined) style.flexShrink = parseNumber(syntax.shrink);
  if (syntax.basis !== undefined) style.flexBasis = resolveLengthValue(syntax.basis);
  if (syntax.order !== undefined) style.order = parseNumberishValue(syntax.order);
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
  if (syntax.templateAreas) style.gridTemplateAreas = resolveSyntaxString(syntax.templateAreas);
  if (syntax.area) style.gridArea = resolveSyntaxString(syntax.area);
  if (syntax.colSpan !== undefined) style.gridColumn = buildGridSpanValue(syntax.colSpan);
  if (syntax.rowSpan !== undefined) style.gridRow = buildGridSpanValue(syntax.rowSpan);
  if (syntax.aspect !== undefined) style.aspectRatio = parseNumberishValue(syntax.aspect);
  if (syntax.overflow) style.overflow = syntax.overflow as React.CSSProperties['overflow'];
  if (syntax.overflowX) style.overflowX = syntax.overflowX as React.CSSProperties['overflowX'];
  if (syntax.overflowY) style.overflowY = syntax.overflowY as React.CSSProperties['overflowY'];
  if (syntax.overscroll) styleMap.overscrollBehavior = resolveSyntaxString(syntax.overscroll);
  if (syntax.overscrollX) styleMap.overscrollBehaviorX = resolveSyntaxString(syntax.overscrollX);
  if (syntax.overscrollY) styleMap.overscrollBehaviorY = resolveSyntaxString(syntax.overscrollY);
  if (syntax.scrollBehavior) styleMap.scrollBehavior = resolveSyntaxString(syntax.scrollBehavior);
  if (syntax.scrollSnapType) styleMap.scrollSnapType = resolveSyntaxString(syntax.scrollSnapType);
  if (syntax.scrollSnapAlign) styleMap.scrollSnapAlign = resolveSyntaxString(syntax.scrollSnapAlign);
  if (syntax.scrollSnapStop) styleMap.scrollSnapStop = resolveSyntaxString(syntax.scrollSnapStop);
  if (syntax.scrollMargin !== undefined) styleMap.scrollMargin = resolveLengthValue(syntax.scrollMargin);
  if (syntax.scrollMarginX !== undefined) styleMap.scrollMarginInline = resolveLengthValue(syntax.scrollMarginX);
  if (syntax.scrollMarginY !== undefined) styleMap.scrollMarginBlock = resolveLengthValue(syntax.scrollMarginY);
  if (syntax.scrollPadding !== undefined) styleMap.scrollPadding = resolveLengthValue(syntax.scrollPadding);
  if (syntax.scrollPaddingX !== undefined) styleMap.scrollPaddingInline = resolveLengthValue(syntax.scrollPaddingX);
  if (syntax.scrollPaddingY !== undefined) styleMap.scrollPaddingBlock = resolveLengthValue(syntax.scrollPaddingY);
  if (syntax.scrollbarGutter) styleMap.scrollbarGutter = resolveSyntaxString(syntax.scrollbarGutter);
  if (syntax.position) style.position = syntax.position as React.CSSProperties['position'];
  if (syntax.inset !== undefined) style.inset = resolveLengthValue(syntax.inset);
  if (syntax.top !== undefined) style.top = resolveLengthValue(syntax.top);
  if (syntax.right !== undefined) style.right = resolveLengthValue(syntax.right);
  if (syntax.bottom !== undefined) style.bottom = resolveLengthValue(syntax.bottom);
  if (syntax.left !== undefined) style.left = resolveLengthValue(syntax.left);
  if (syntax.z !== undefined) style.zIndex = parseNumberishValue(syntax.z);
  applyStickyStyle(style, syntax);
  applyPinStyle(style, syntax);
  if (syntax.cursor) style.cursor = resolveSyntaxString(syntax.cursor);
  if (syntax.pointerEvents) style.pointerEvents = syntax.pointerEvents as React.CSSProperties['pointerEvents'];
  if (syntax.userSelect) style.userSelect = resolveSyntaxString(syntax.userSelect) as React.CSSProperties['userSelect'];
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

  const interactive = parseBoolean(syntax.interactive);
  if (interactive !== undefined) {
    logic.interactive = interactive;
    if (interactive) {
      style.cursor = style.cursor ?? 'pointer';
      style.pointerEvents = style.pointerEvents ?? 'auto';
    }
  }

  const focusable = parseBoolean(syntax.focusable);
  if (focusable !== undefined) {
    logic.focusable = focusable;
    if (focusable && attrs.tabIndex === undefined) {
      attrs.tabIndex = 0;
    }
  }

  const visuallyHidden = parseBoolean(syntax.visuallyHidden);
  if (visuallyHidden !== undefined) {
    logic.visuallyHidden = visuallyHidden;
    if (visuallyHidden) {
      applyVisuallyHiddenStyle(styleMap);
    }
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
    const resolvedTabIndex = parseNumber(syntax.tabIndex) ?? parseNumberishValue(syntax.tabIndex);
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

  if (syntax.css) {
    for (const [rawProperty, rawValue] of Object.entries(syntax.css)) {
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        continue;
      }

      const property = normalizeStylePropertyName(rawProperty);
      if (!property) {
        continue;
      }

      styleMap[property] = normalizeStyleEscapeValue(rawValue);
    }
  }

  return freezeResolvedSyntax(style, semantics, logic, attrs);
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

    const resolved = resolveParsedSyntax(parseSyntaxInput(input));
    rememberCache(resolvedStringSyntaxCache, input, resolved);
    return resolved;
  }

  const cached = resolvedObjectSyntaxCache.get(input);
  if (cached) {
    return cached;
  }

  const resolved = resolveParsedSyntax(parseSyntaxInput(input));
  resolvedObjectSyntaxCache.set(input, resolved);
  return resolved;
}
