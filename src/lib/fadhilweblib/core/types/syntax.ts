import type React from 'react';
import type { Density, LayoutAlign, LayoutJustify, PresenceMode, Size, Tone } from './layout';

export type SyntaxScalar = string | number | boolean;
export type FadhilWebStateName = 'hover' | 'active' | 'focus' | 'disabled' | 'loading' | 'open' | 'current';

export interface ResolvedSyntaxSemantics {
  tone?: Tone;
  size?: Size;
  density?: Density;
  direction?: 'row' | 'column';
  align?: LayoutAlign;
  justify?: LayoutJustify;
  compact?: boolean;
  wrap?: boolean;
  full?: boolean;
}

export interface ResolvedSyntaxLogic {
  disabled?: boolean;
  loading?: boolean;
  open?: boolean;
  hidden?: boolean;
  current?: boolean;
  interactive?: boolean;
  focusable?: boolean;
  visuallyHidden?: boolean;
  presence?: PresenceMode;
}

export interface ResolvedSyntax {
  style: React.CSSProperties;
  semantics: ResolvedSyntaxSemantics;
  logic: ResolvedSyntaxLogic;
  attrs: Record<string, SyntaxScalar>;
}

export type ResolvedStateSyntax = Partial<Record<FadhilWebStateName, ResolvedSyntax>>;

export type FadhilWebStyleEscapeMap = Record<string, SyntaxScalar>;
export type FadhilWebAttributeEscapeMap = Record<string, SyntaxScalar>;

export interface FadhilWebFlatSyntaxObject {
  tone?: Tone;
  size?: Size;
  density?: Density;
  compact?: boolean;
  full?: boolean;
  bg?: string;
  gradient?: string;
  gradientText?: string;
  bgImage?: string;
  bgSize?: string;
  bgPosition?: string;
  bgRepeat?: string;
  bgClip?: string;
  bgOrigin?: string;
  fg?: string;
  border?: string;
  borderWidth?: string | number;
  borderStyle?: string;
  shadow?: string;
  ring?: string | number;
  ringColor?: string;
  ringOffset?: string | number;
  ringOffsetColor?: string;
  radius?: string | number;
  outlineColor?: string;
  outlineWidth?: string | number;
  outlineOffset?: string | number;
  gap?: string | number;
  p?: string | number;
  px?: string | number;
  py?: string | number;
  pt?: string | number;
  pr?: string | number;
  pb?: string | number;
  pl?: string | number;
  m?: string | number;
  mx?: string | number;
  my?: string | number;
  mt?: string | number;
  mr?: string | number;
  mb?: string | number;
  ml?: string | number;
  w?: string | number;
  h?: string | number;
  minW?: string | number;
  maxW?: string | number;
  minH?: string | number;
  maxH?: string | number;
  fontSize?: string | number;
  fontFamily?: string;
  weight?: string | number;
  lineHeight?: string | number;
  tracking?: string | number;
  textAlign?: string;
  textTransform?: string;
  whiteSpace?: string;
  textWrap?: string;
  truncate?: boolean;
  clampLines?: string | number;
  opacity?: string | number;
  accent?: string;
  caret?: string;
  display?: string;
  direction?: 'row' | 'column';
  wrap?: boolean | 'wrap' | 'nowrap';
  align?: LayoutAlign | 'baseline';
  justify?: LayoutJustify | 'around' | 'evenly';
  self?: LayoutAlign | 'baseline' | 'auto';
  grow?: string | number;
  shrink?: string | number;
  basis?: string | number;
  order?: string | number;
  cols?: string | number;
  rows?: string | number;
  autoFlow?: string;
  autoCols?: string | number;
  autoRows?: string | number;
  placeItems?: string;
  placeContent?: string;
  justifyItems?: string;
  justifySelf?: string;
  gridColumn?: string;
  gridRow?: string;
  templateAreas?: string;
  area?: string;
  colSpan?: string | number;
  rowSpan?: string | number;
  aspect?: string | number;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  overscroll?: string;
  overscrollX?: string;
  overscrollY?: string;
  scrollBehavior?: string;
  scrollSnapType?: string;
  scrollSnapAlign?: string;
  scrollSnapStop?: string;
  scrollMargin?: string | number;
  scrollMarginX?: string | number;
  scrollMarginY?: string | number;
  scrollPadding?: string | number;
  scrollPaddingX?: string | number;
  scrollPaddingY?: string | number;
  scrollbarGutter?: string;
  position?: string;
  inset?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  z?: string | number;
  sticky?: boolean | string | number;
  pin?: boolean | string | number;
  cursor?: string;
  pointerEvents?: string;
  userSelect?: string;
  filter?: string;
  backdrop?: string;
  blend?: string;
  isolation?: string;
  transform?: string;
  transformOrigin?: string;
  transition?: string;
  duration?: string | number;
  ease?: string;
  delay?: string | number;
  animation?: string;
  animationDuration?: string | number;
  animationDelay?: string | number;
  animationTiming?: string;
  willChange?: string;
  scale?: string | number;
  scaleX?: string | number;
  scaleY?: string | number;
  rotate?: string | number;
  translateX?: string | number;
  translateY?: string | number;
  skewX?: string | number;
  skewY?: string | number;
  blur?: string | number;
  brightness?: string | number;
  contrast?: string | number;
  saturate?: string | number;
  contain?: string;
  contentVisibility?: string;
  containIntrinsicSize?: string | number;
  role?: string;
  tabIndex?: string | number;
  titleText?: string;
  inert?: boolean;
  loading?: boolean;
  disabled?: boolean;
  open?: boolean;
  hidden?: boolean;
  current?: boolean;
  interactive?: boolean;
  focusable?: boolean;
  visuallyHidden?: boolean;
  presence?: PresenceMode;
  aria?: Record<`aria-${string}`, SyntaxScalar>;
  data?: Record<`data-${string}`, SyntaxScalar>;
  vars?: Record<`--${string}`, SyntaxScalar>;
  css?: FadhilWebStyleEscapeMap;
  attrs?: FadhilWebAttributeEscapeMap;
}

export type FadhilWebLayoutSyntaxKey =
  | 'display'
  | 'direction'
  | 'wrap'
  | 'align'
  | 'justify'
  | 'self'
  | 'gap'
  | 'grow'
  | 'shrink'
  | 'basis'
  | 'order'
  | 'cols'
  | 'rows'
  | 'autoFlow'
  | 'autoCols'
  | 'autoRows'
  | 'placeItems'
  | 'placeContent'
  | 'justifyItems'
  | 'justifySelf'
  | 'gridColumn'
  | 'gridRow'
  | 'templateAreas'
  | 'area'
  | 'colSpan'
  | 'rowSpan'
  | 'aspect'
  | 'w'
  | 'h'
  | 'minW'
  | 'maxW'
  | 'minH'
  | 'maxH'
  | 'overflow'
  | 'overflowX'
  | 'overflowY'
  | 'overscroll'
  | 'overscrollX'
  | 'overscrollY'
  | 'scrollBehavior'
  | 'scrollSnapType'
  | 'scrollSnapAlign'
  | 'scrollSnapStop'
  | 'scrollMargin'
  | 'scrollMarginX'
  | 'scrollMarginY'
  | 'scrollPadding'
  | 'scrollPaddingX'
  | 'scrollPaddingY'
  | 'scrollbarGutter'
  | 'position'
  | 'inset'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'z'
  | 'sticky'
  | 'pin';

export type FadhilWebSpacingSyntaxKey =
  | 'gap'
  | 'p'
  | 'px'
  | 'py'
  | 'pt'
  | 'pr'
  | 'pb'
  | 'pl'
  | 'm'
  | 'mx'
  | 'my'
  | 'mt'
  | 'mr'
  | 'mb'
  | 'ml';

export type FadhilWebSurfaceSyntaxKey =
  | 'tone'
  | 'size'
  | 'density'
  | 'compact'
  | 'full'
  | 'bg'
  | 'gradient'
  | 'gradientText'
  | 'bgImage'
  | 'bgSize'
  | 'bgPosition'
  | 'bgRepeat'
  | 'bgClip'
  | 'bgOrigin'
  | 'fg'
  | 'border'
  | 'borderWidth'
  | 'borderStyle'
  | 'shadow'
  | 'ring'
  | 'ringColor'
  | 'ringOffset'
  | 'ringOffsetColor'
  | 'radius'
  | 'outlineColor'
  | 'outlineWidth'
  | 'outlineOffset'
  | 'opacity';

export type FadhilWebTextSyntaxKey =
  | 'fontSize'
  | 'fontFamily'
  | 'weight'
  | 'lineHeight'
  | 'tracking'
  | 'textAlign'
  | 'textTransform'
  | 'whiteSpace'
  | 'textWrap'
  | 'truncate'
  | 'clampLines'
  | 'accent'
  | 'caret';

export type FadhilWebFxSyntaxKey =
  | 'cursor'
  | 'pointerEvents'
  | 'userSelect'
  | 'filter'
  | 'backdrop'
  | 'blend'
  | 'isolation'
  | 'transform'
  | 'transformOrigin'
  | 'transition'
  | 'duration'
  | 'ease'
  | 'delay'
  | 'animation'
  | 'animationDuration'
  | 'animationDelay'
  | 'animationTiming'
  | 'willChange'
  | 'scale'
  | 'scaleX'
  | 'scaleY'
  | 'rotate'
  | 'translateX'
  | 'translateY'
  | 'skewX'
  | 'skewY'
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'contain'
  | 'contentVisibility'
  | 'containIntrinsicSize';

export type FadhilWebLogicSyntaxKey =
  | 'role'
  | 'tabIndex'
  | 'titleText'
  | 'inert'
  | 'loading'
  | 'disabled'
  | 'open'
  | 'hidden'
  | 'current'
  | 'interactive'
  | 'focusable'
  | 'visuallyHidden'
  | 'presence';

export type FadhilWebUiSyntaxKey =
  | 'tone'
  | 'size'
  | 'density'
  | 'compact'
  | 'full';

type FadhilWebSyntaxGroup<TKey extends keyof FadhilWebFlatSyntaxObject> = Partial<Pick<FadhilWebFlatSyntaxObject, TKey>>;

export interface FadhilWebSyntaxObject extends FadhilWebFlatSyntaxObject {
  ui?: FadhilWebSyntaxGroup<FadhilWebUiSyntaxKey>;
  layout?: FadhilWebSyntaxGroup<FadhilWebLayoutSyntaxKey>;
  spacing?: FadhilWebSyntaxGroup<FadhilWebSpacingSyntaxKey>;
  space?: FadhilWebSyntaxGroup<FadhilWebSpacingSyntaxKey>;
  surface?: FadhilWebSyntaxGroup<FadhilWebSurfaceSyntaxKey>;
  box?: FadhilWebSyntaxGroup<FadhilWebSurfaceSyntaxKey>;
  text?: FadhilWebSyntaxGroup<FadhilWebTextSyntaxKey>;
  fx?: FadhilWebSyntaxGroup<FadhilWebFxSyntaxKey>;
  motion?: FadhilWebSyntaxGroup<FadhilWebFxSyntaxKey>;
  logic?: FadhilWebSyntaxGroup<FadhilWebLogicSyntaxKey>;
  behavior?: FadhilWebSyntaxGroup<FadhilWebLogicSyntaxKey>;
}

export type FadhilWebNormalizedSyntaxObject = FadhilWebFlatSyntaxObject;

export interface FadhilWebCompiledSyntax {
  readonly __fwlbType: 'compiled-syntax';
  readonly input: Readonly<FadhilWebFlatSyntaxObject>;
  readonly resolved: Readonly<ResolvedSyntax>;
}

export type FadhilWebSyntax = string | FadhilWebSyntaxObject | FadhilWebCompiledSyntax;
export type FadhilWebStateSyntaxMap = Partial<Record<FadhilWebStateName, FadhilWebSyntax>>;

export interface FadhilWebCompiledStateSyntax {
  readonly __fwlbType: 'compiled-state-syntax';
  readonly input: Readonly<FadhilWebStateSyntaxMap>;
  readonly resolved: Readonly<ResolvedStateSyntax>;
}

export type FadhilWebStateSyntax = FadhilWebStateSyntaxMap | FadhilWebCompiledStateSyntax;
export type SlotSyntax<T extends string> = Partial<Record<T, FadhilWebSyntax>>;

export interface FadhilWebRecipe<TSlots extends string = never, TLogic extends object = {}> {
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<TSlots>;
  logic?: Partial<TLogic>;
  attrs?: Record<string, SyntaxScalar | undefined>;
}
