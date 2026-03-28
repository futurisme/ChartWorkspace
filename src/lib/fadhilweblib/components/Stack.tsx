import type React from 'react';
import type { LayoutElement, StackProps } from '../core/types';
import { cx } from '../core/cx';
import { resolveSpaceValue } from '../core/space';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './layout.module.css';

export function Stack({
  as = 'div',
  gap = 'md',
  align,
  syntax,
  recipe,
  className,
  style,
  children,
  ...props
}: StackProps) {
  const Component = as as LayoutElement;
  const resolvedSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const finalAlign = resolvedSyntax.semantics.align ?? align ?? recipe?.logic?.align ?? 'stretch';

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(resolvedSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.stack, className)}
      style={{
        '--fwlb-gap': resolveSpaceValue(gap),
        ...resolvedSyntax.style,
        ...style,
      } as React.CSSProperties}
      data-slot="stack"
      data-align={finalAlign}
      data-state="idle"
    >
      {children}
    </Component>
  );
}
