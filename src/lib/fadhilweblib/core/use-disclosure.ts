'use client';

import type React from 'react';
import { useCallback, useId } from 'react';
import { buildDisclosureAttributes } from './disclosure';
import { useControllableState } from './use-controllable-state';
import type { DisclosureState, UseDisclosureOptions } from './types';

function normalizeId(value: string) {
  return value.replace(/[:]/g, '');
}

function mergeClassNames(base?: string, next?: string) {
  if (!base) {
    return next;
  }

  if (!next) {
    return base;
  }

  return `${base} ${next}`;
}

function mergeStyles(base?: React.CSSProperties, next?: React.CSSProperties) {
  if (!base) {
    return next;
  }

  if (!next) {
    return base;
  }

  return { ...base, ...next };
}

export function useDisclosure({
  id,
  open,
  defaultOpen = false,
  disabled = false,
  onOpenChange,
}: UseDisclosureOptions = {}): DisclosureState {
  const generatedId = useId();
  const baseId = id ?? `fwlb-disclosure-${normalizeId(generatedId)}`;
  const [currentOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const toggle = useCallback(() => {
    if (!disabled) {
      setOpen((previous) => !previous);
    }
  }, [disabled, setOpen]);

  const { triggerProps, contentProps } = buildDisclosureAttributes({
    idBase: baseId,
    open: currentOpen,
    disabled,
  });
  const baseTriggerProps = triggerProps as DisclosureState['triggerProps'];
  const baseContentProps = contentProps as DisclosureState['contentProps'];

  const getTriggerProps = useCallback<DisclosureState['getTriggerProps']>((props = {}) => {
    const {
      onClick,
      className,
      style,
      type,
      ...rest
    } = props;

    return {
      ...rest,
      ...baseTriggerProps,
      type: type ?? baseTriggerProps.type,
      className: mergeClassNames(baseTriggerProps.className as string | undefined, className),
      style: mergeStyles(baseTriggerProps.style as React.CSSProperties | undefined, style),
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);

        if (!event.defaultPrevented && !disabled) {
          toggle();
        }
      },
    };
  }, [baseTriggerProps, disabled, toggle]);

  const getContentProps = useCallback<DisclosureState['getContentProps']>((props = {}) => {
    const { className, style, ...rest } = props;

    return {
      ...rest,
      ...baseContentProps,
      className: mergeClassNames(baseContentProps.className as string | undefined, className),
      style: mergeStyles(baseContentProps.style as React.CSSProperties | undefined, style),
    };
  }, [baseContentProps]);

  return {
    open: currentOpen,
    setOpen,
    toggle,
    triggerProps: baseTriggerProps,
    contentProps: baseContentProps,
    getTriggerProps,
    getContentProps,
  };
}
