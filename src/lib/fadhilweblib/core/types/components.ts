import type React from 'react';
import type { DialogSide, RovingFocusOrientation } from './hooks';
import type { Density, LayoutAlign, LayoutElement, LayoutGap, LayoutJustify, PresenceMode, Size, ThemeName, Tone } from './layout';
import type { FadhilWebRecipe, FadhilWebStateSyntax, FadhilWebSyntax, SlotSyntax } from './syntax';

export interface ThemeScopeRecipeLogic {
  theme?: ThemeName;
}

export interface ThemeScopeProps extends React.HTMLAttributes<HTMLElement> {
  as?: LayoutElement;
  theme?: ThemeName;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  recipe?: FadhilWebRecipe<never, ThemeScopeRecipeLogic>;
}

export interface SurfaceRecipeLogic {
  tone?: Tone;
  density?: Density;
  variant?: 'solid' | 'soft' | 'outline' | 'elevated';
}

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: LayoutElement;
  tone?: Tone;
  density?: Density;
  variant?: 'solid' | 'soft' | 'outline' | 'elevated';
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  recipe?: FadhilWebRecipe<never, SurfaceRecipeLogic>;
}

export interface PanelRecipeLogic extends SurfaceRecipeLogic {}

export interface PanelProps extends SurfaceProps {}

export interface ContainerRecipeLogic {
  centered?: boolean;
}

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: LayoutElement;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | number | string;
  centered?: boolean;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  recipe?: FadhilWebRecipe<never, ContainerRecipeLogic>;
}

export interface SectionRecipeLogic {
  tone?: Tone;
  density?: Density;
  surface?: boolean;
}

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  as?: LayoutElement;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: Tone;
  density?: Density;
  surface?: boolean;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  slotSyntax?: SlotSyntax<'header' | 'eyebrow' | 'title' | 'description' | 'meta' | 'actions' | 'body'>;
  recipe?: FadhilWebRecipe<'header' | 'eyebrow' | 'title' | 'description' | 'meta' | 'actions' | 'body', SectionRecipeLogic>;
}

export interface GridRecipeLogic {
  align?: LayoutAlign;
  justify?: LayoutJustify;
}

export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  as?: LayoutElement;
  columns?: number | string;
  minItemWidth?: number | string;
  gap?: LayoutGap;
  align?: LayoutAlign;
  justify?: LayoutJustify;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  recipe?: FadhilWebRecipe<never, GridRecipeLogic>;
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

export interface FieldRecipeLogic {
  tone?: Tone;
  invalid?: boolean;
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  optionalLabel?: React.ReactNode;
  htmlFor?: string;
  tone?: Tone;
  invalid?: boolean;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  slotSyntax?: SlotSyntax<'header' | 'labelRow' | 'label' | 'meta' | 'description' | 'content' | 'hint' | 'error'>;
  recipe?: FadhilWebRecipe<'header' | 'labelRow' | 'label' | 'meta' | 'description' | 'content' | 'hint' | 'error', FieldRecipeLogic>;
}

export interface InputRecipeLogic {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  recipe?: FadhilWebRecipe<never, InputRecipeLogic>;
}

export interface TextareaRecipeLogic {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  recipe?: FadhilWebRecipe<never, TextareaRecipeLogic>;
}

export interface SelectRecipeLogic {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  recipe?: FadhilWebRecipe<never, SelectRecipeLogic>;
}

export interface CheckboxRecipeLogic {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
}

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'control' | 'label' | 'description'>;
  recipe?: FadhilWebRecipe<'control' | 'label' | 'description', CheckboxRecipeLogic>;
}

export interface SwitchRecipeLogic {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
}

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'track' | 'thumb' | 'label' | 'description'>;
  recipe?: FadhilWebRecipe<'track' | 'thumb' | 'label' | 'description', SwitchRecipeLogic>;
}

export interface RangeRecipeLogic {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
}

export interface RangeProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  tone?: Tone;
  size?: Size;
  invalid?: boolean;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'label' | 'value'>;
  recipe?: FadhilWebRecipe<'label' | 'value', RangeRecipeLogic>;
}

export interface NoticeRecipeLogic {
  tone?: Tone;
}

export interface NoticeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: Tone;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'title' | 'description' | 'actions' | 'body'>;
  recipe?: FadhilWebRecipe<'title' | 'description' | 'actions' | 'body', NoticeRecipeLogic>;
}

export interface EmptyStateRecipeLogic {
  tone?: Tone;
}

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  visual?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: Tone;
  syntax?: FadhilWebSyntax;
  slotSyntax?: SlotSyntax<'visual' | 'eyebrow' | 'title' | 'description' | 'actions'>;
  recipe?: FadhilWebRecipe<'visual' | 'eyebrow' | 'title' | 'description' | 'actions', EmptyStateRecipeLogic>;
}

export interface SkeletonRecipeLogic {
  tone?: Tone;
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: 'line' | 'block' | 'circle';
  animated?: boolean;
  width?: string | number;
  height?: string | number;
  tone?: Tone;
  syntax?: FadhilWebSyntax;
  recipe?: FadhilWebRecipe<never, SkeletonRecipeLogic>;
}

export interface ProgressBarRecipeLogic {
  tone?: Tone;
}

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: React.ReactNode;
  showValue?: boolean;
  tone?: Tone;
  syntax?: FadhilWebSyntax;
  slotSyntax?: SlotSyntax<'track' | 'fill' | 'label' | 'value'>;
  recipe?: FadhilWebRecipe<'track' | 'fill' | 'label' | 'value', ProgressBarRecipeLogic>;
}

export interface MetricRecipeLogic {
  tone?: Tone;
}

export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  change?: React.ReactNode;
  description?: React.ReactNode;
  tone?: Tone;
  syntax?: FadhilWebSyntax;
  slotSyntax?: SlotSyntax<'label' | 'value' | 'change' | 'description'>;
  recipe?: FadhilWebRecipe<'label' | 'value' | 'change' | 'description', MetricRecipeLogic>;
}

export interface KeyValueItem {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: Tone;
}

export interface KeyValueListRecipeLogic {
  tone?: Tone;
}

export interface KeyValueListProps extends React.HTMLAttributes<HTMLDListElement> {
  items: readonly KeyValueItem[];
  tone?: Tone;
  syntax?: FadhilWebSyntax;
  slotSyntax?: SlotSyntax<'item' | 'label' | 'value'>;
  recipe?: FadhilWebRecipe<'item' | 'label' | 'value', KeyValueListRecipeLogic>;
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

export interface TabItem {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsRecipeLogic {
  tone?: Tone;
  keepMounted?: boolean;
  orientation?: RovingFocusOrientation;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: readonly TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  tone?: Tone;
  keepMounted?: boolean;
  orientation?: RovingFocusOrientation;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'list' | 'tab' | 'tabLabel' | 'tabBadge' | 'panel'>;
  recipe?: FadhilWebRecipe<'list' | 'tab' | 'tabLabel' | 'tabBadge' | 'panel', TabsRecipeLogic>;
}

export interface SegmentedItem {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlRecipeLogic {
  tone?: Tone;
  fullWidth?: boolean;
}

export interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: readonly SegmentedItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  tone?: Tone;
  fullWidth?: boolean;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'item' | 'itemLabel'>;
  recipe?: FadhilWebRecipe<'item' | 'itemLabel', SegmentedControlRecipeLogic>;
}

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsRecipeLogic {
  tone?: Tone;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: readonly BreadcrumbItem[];
  separator?: React.ReactNode;
  tone?: Tone;
  syntax?: FadhilWebSyntax;
  slotSyntax?: SlotSyntax<'list' | 'item' | 'link' | 'separator'>;
  recipe?: FadhilWebRecipe<'list' | 'item' | 'link' | 'separator', BreadcrumbsRecipeLogic>;
}

export interface DialogRecipeLogic {
  tone?: Tone;
  size?: Size;
  dismissOnOverlay?: boolean;
}

export interface DialogProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  trigger?: React.ReactNode;
  dismissOnOverlay?: boolean;
  closeOnEscape?: boolean;
  closeLabel?: string;
  tone?: Tone;
  size?: Size;
  portal?: boolean;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'overlay' | 'panel' | 'header' | 'title' | 'description' | 'body' | 'actions' | 'close'>;
  recipe?: FadhilWebRecipe<'overlay' | 'panel' | 'header' | 'title' | 'description' | 'body' | 'actions' | 'close', DialogRecipeLogic>;
}

export interface DrawerRecipeLogic {
  tone?: Tone;
  side?: DialogSide;
}

export interface DrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  trigger?: React.ReactNode;
  dismissOnOverlay?: boolean;
  closeOnEscape?: boolean;
  closeLabel?: string;
  tone?: Tone;
  side?: DialogSide;
  width?: string | number;
  portal?: boolean;
  children?: React.ReactNode;
  syntax?: FadhilWebSyntax;
  stateSyntax?: FadhilWebStateSyntax;
  slotSyntax?: SlotSyntax<'overlay' | 'panel' | 'header' | 'title' | 'description' | 'body' | 'actions' | 'close'>;
  recipe?: FadhilWebRecipe<'overlay' | 'panel' | 'header' | 'title' | 'description' | 'body' | 'actions' | 'close', DrawerRecipeLogic>;
}
