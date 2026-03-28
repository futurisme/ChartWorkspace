import type React from 'react';
import type { InlineProps, LayoutElement } from '../core/types';
import { cx } from '../core/cx';
import { resolveSpaceValue } from '../core/space';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './layout.module.css';

export function Inline({
  as = 'div',
  gap = 'sm',
  align,
  justify,
  wrap,
  syntax,
  recipe,
  className,
  style,
  children,
  ...props
}: InlineProps) {
  const Component = as as LayoutElement;
  const resolvedSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const finalAlign = resolvedSyntax.semantics.align ?? align ?? recipe?.logic?.align ?? 'center';
  const finalJustify = resolvedSyntax.semantics.justify ?? justify ?? recipe?.logic?.justify ?? 'start';
  const finalWrap = resolvedSyntax.semantics.wrap ?? wrap ?? recipe?.logic?.wrap ?? false;

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(resolvedSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.inline, className)}
      style={{
        '--fwlb-gap': resolveSpaceValue(gap),
        ...resolvedSyntax.style,
        ...style,
      } as React.CSSProperties}
      data-slot="inline"
      data-align={finalAlign}
      data-justify={finalJustify}
      data-wrap={finalWrap ? 'true' : 'false'}
      data-state="idle"
    >
      {children}
    </Component>
  );
}
