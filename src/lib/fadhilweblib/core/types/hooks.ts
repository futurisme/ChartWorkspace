import type React from 'react';

export type AsyncActionStatus = 'idle' | 'running' | 'success' | 'error';
export type RovingFocusOrientation = 'horizontal' | 'vertical' | 'both';
export type DialogSide = 'left' | 'right';

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

export interface UseDialogOptions {
  id?: string;
  open?: boolean;
  defaultOpen?: boolean;
  dismissOnOverlay?: boolean;
  closeOnEscape?: boolean;
  restoreFocus?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DialogState {
  open: boolean;
  setOpen: (next: ControlledStateAction<boolean>) => void;
  openDialog: () => void;
  closeDialog: () => void;
  toggle: () => void;
  dialogId: string;
  titleId: string;
  descriptionId: string;
  getTriggerProps: (
    props?: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>,
  ) => React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  getOverlayProps: (
    props?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  getDialogProps: (
    props?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  getTitleProps: (
    props?: React.HTMLAttributes<HTMLElement> & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  getDescriptionProps: (
    props?: React.HTMLAttributes<HTMLElement> & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
}

export interface UseTabsOptions<T extends string> {
  items: readonly {
    value: T;
    disabled?: boolean;
  }[];
  value?: T;
  defaultValue?: T;
  orientation?: RovingFocusOrientation;
  loop?: boolean;
  onValueChange?: (value: T) => void;
}

export interface TabsState<T extends string> {
  value: T | undefined;
  selectedIndex: number;
  orientation: RovingFocusOrientation;
  getListProps: (
    props?: React.HTMLAttributes<HTMLElement> & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  getTabProps: (
    value: T,
    props?: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>,
  ) => React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  getPanelProps: (
    value: T,
    props?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
  ) => React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  setValue: (value: T) => void;
}
