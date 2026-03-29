import React from 'react';
import type { LayoutElement, ThemeScopeProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';

export function ThemeScope({
  as = 'div',
  theme = 'base',
  syntax,
  recipe,
  className,
  style,
  children,
  ...props
}: ThemeScopeProps) {
  const Component = as as LayoutElement;
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(className)}
      style={{ ...rootSyntax.style, ...style }}
      data-fwlb-theme={theme}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'theme-scope'}
    >
      {children}
    </Component>
  );
}
