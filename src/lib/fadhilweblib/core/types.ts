import type React from 'react';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type Size = 'xs' | 'sm' | 'md' | 'lg';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type LayoutElement = 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav';
export type LayoutAlign = 'start' | 'center' | 'end' | 'stretch';
export type LayoutJustify = 'start' | 'center' | 'end' | 'between';
export type LayoutGap = Size | number;
export type SyntaxScalar = string | number | boolean;
export type PresenceMode = 'keep' | 'lazy' | 'unmount';
export type AsyncActionStatus = 'idle' | 'running' | 'success' | 'error';
export type FadhilWebStateName = 'hover' | 'active' | 'focus' | 'disabled' | 'loading' | 'open' | 'current';
export type RovingFocusOrientation = 'horizontal' | 'vertical' | 'both';

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
  presence?: PresenceMode;
}

export interface ResolvedSyntax {
  style: React.CSSProperties;
  semantics: ResolvedSyntaxSemantics;
  logic: ResolvedSyntaxLogic;
  attrs: Record<string, SyntaxScalar>;
}

export type ResolvedStateSyntax = Partial<Record<FadhilWebStateName, ResolvedSyntax>>;

export interface FadhilWebSyntaxObject {
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
  aspect?: string | number;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  position?: string;
  inset?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  z?: string | number;
  cursor?: string;
  pointerEvents?: string;
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
  presence?: PresenceMode;
  aria?: Record<`aria-${string}`, SyntaxScalar>;
  data?: Record<`data-${string}`, SyntaxScalar>;
  vars?: Record<`--${string}`, SyntaxScalar>;
}

export interface FadhilWebCompiledSyntax {
  readonly __fwlbType: 'compiled-syntax';
  readonly input: Readonly<FadhilWebSyntaxObject>;
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

export interface ButtonRecipeLogic {
  tone?: Tone;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: React.ReactNode;
  tone?: Tone;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leadingVisual?: React.ReactNode;
  trailingVisual?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'label' | 'leadingVisual' | 'trailingVisual'>;
  recipe?: FadhilWebRecipe<'label' | 'leadingVisual' | 'trailingVisual', ButtonRecipeLogic>;
}

export interface IconButtonRecipeLogic {
  tone?: Tone;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
}

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: React.ReactNode;
  label: string;
  tone?: Tone;
  size?: Size;
  loading?: boolean;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'icon'>;
  recipe?: FadhilWebRecipe<'icon', IconButtonRecipeLogic>;
}

export interface PanelRecipeLogic {
  tone?: Tone;
  density?: Density;
}

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: LayoutElement;
  tone?: Tone;
  density?: Density;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  recipe?: FadhilWebRecipe<never, PanelRecipeLogic>;
}

export interface HeaderShellRecipeLogic {
  compact?: boolean;
}

export interface HeaderShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
  syntax?: FadhilWebSyntax;
  slotSyntax?: SlotSyntax<'content' | 'eyebrow' | 'titleRow' | 'title' | 'meta' | 'subtitle' | 'actions'>;
  recipe?: FadhilWebRecipe<'content' | 'eyebrow' | 'titleRow' | 'title' | 'meta' | 'subtitle' | 'actions', HeaderShellRecipeLogic>;
}

export interface StatusChipRecipeLogic {
  tone?: Tone;
}

export interface StatusChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  value: React.ReactNode;
  tone?: Tone;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'label' | 'value'>;
  recipe?: FadhilWebRecipe<'label' | 'value', StatusChipRecipeLogic>;
}

export interface ActionGroupRecipeLogic {
  direction?: 'row' | 'column';
  wrap?: boolean;
  align?: LayoutAlign;
  justify?: LayoutJustify;
}

export interface ActionGroupProps extends React.HTMLAttributes<HTMLElement> {
  as?: LayoutElement;
  direction?: 'row' | 'column';
  wrap?: boolean;
  gap?: LayoutGap;
  align?: LayoutAlign;
  justify?: LayoutJustify;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  recipe?: FadhilWebRecipe<never, ActionGroupRecipeLogic>;
}

export interface StackRecipeLogic {
  align?: LayoutAlign;
}

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  as?: LayoutElement;
  gap?: LayoutGap;
  align?: LayoutAlign;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  recipe?: FadhilWebRecipe<never, StackRecipeLogic>;
}

export interface InlineRecipeLogic {
  align?: LayoutAlign;
  justify?: LayoutJustify;
  wrap?: boolean;
}

export interface InlineProps extends React.HTMLAttributes<HTMLElement> {
  as?: LayoutElement;
  gap?: LayoutGap;
  align?: LayoutAlign;
  justify?: LayoutJustify;
  wrap?: boolean;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  recipe?: FadhilWebRecipe<never, InlineRecipeLogic>;
}

export interface ControlledStateOptions<T> {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}

export type ControlledStateAction<T> = T | ((current: T) => T);

export interface UseDisclosureOptions {
  id?: string;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DisclosureState {
  open: boolean;
  setOpen: (next: ControlledStateAction<boolean>) => void;
  toggle: () => void;
  triggerProps: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  contentProps: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown> & {
    id: string;
    hidden: boolean;
    'aria-labelledby': string;
  };
  getTriggerProps: (
    props?: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>,
  ) => React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  getContentProps: (
    props?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLDivElement> & Record<string, unknown> & {
    id: string;
    hidden: boolean;
    'aria-labelledby': string;
  };
}

export interface UseSelectionStateOptions<T> {
  value?: readonly T[];
  defaultValue?: readonly T[];
  multiple?: boolean;
  compare?: (left: T, right: T) => boolean;
  onChange?: (value: readonly T[]) => void;
}

export interface SelectionState<T> {
  selected: readonly T[];
  firstSelected: T | undefined;
  multiple: boolean;
  setSelected: (next: ControlledStateAction<readonly T[]>) => void;
  isSelected: (item: T) => boolean;
  select: (item: T) => void;
  deselect: (item: T) => void;
  toggle: (item: T) => void;
  replace: (items: readonly T[]) => void;
  clear: () => void;
}

export interface UseStepperOptions<T> {
  items: readonly T[];
  value?: number;
  defaultValue?: number;
  loop?: boolean;
  onChange?: (index: number) => void;
}

export interface StepperState<T> {
  index: number;
  item: T | undefined;
  count: number;
  hasItems: boolean;
  isFirst: boolean;
  isLast: boolean;
  loop: boolean;
  setIndex: (next: ControlledStateAction<number>) => void;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
}

export interface UseAsyncActionOptions<TResult> {
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
}

export interface AsyncActionState<TArgs extends unknown[], TResult> {
  status: AsyncActionStatus;
  pending: boolean;
  data: TResult | undefined;
  error: unknown;
  run: (...args: TArgs) => Promise<TResult>;
  reset: () => void;
}

export interface CollapsiblePanelRecipeLogic {
  tone?: Tone;
  disabled?: boolean;
  presence?: PresenceMode;
}

export interface CollapsiblePanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  id?: string;
  title: React.ReactNode;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: Tone;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  presence?: PresenceMode;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'header' | 'trigger' | 'heading' | 'titleRow' | 'title' | 'summary' | 'actions' | 'indicator' | 'content'>;
  recipe?: FadhilWebRecipe<'header' | 'trigger' | 'heading' | 'titleRow' | 'title' | 'summary' | 'actions' | 'indicator' | 'content', CollapsiblePanelRecipeLogic>;
}

export interface UseRovingFocusOptions {
  count: number;
  value?: number;
  defaultValue?: number;
  loop?: boolean;
  orientation?: RovingFocusOrientation;
  disabledIndices?: readonly number[];
  onChange?: (index: number) => void;
}

export interface RovingFocusState {
  index: number;
  count: number;
  loop: boolean;
  orientation: RovingFocusOrientation;
  setIndex: (next: ControlledStateAction<number>) => void;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
  getContainerProps: (
    props?: React.HTMLAttributes<HTMLElement> & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  getItemProps: (
    index: number,
    props?: React.HTMLAttributes<HTMLElement> & {
      disabled?: boolean;
    } & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLElement> & Record<string, unknown> & {
    tabIndex: number;
    'data-current': 'true' | 'false';
    'data-disabled': 'true' | 'false';
  };
}
