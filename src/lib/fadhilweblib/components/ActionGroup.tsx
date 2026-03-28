import type React from 'react';
import type { ActionGroupProps, LayoutElement } from '../core/types';
import { cx } from '../core/cx';
import { resolveSpaceValue } from '../core/space';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './action-group.module.css';

export function ActionGroup({
  as = 'div',
  direction,
  wrap,
  gap = 'sm',
  align,
  justify,
  syntax,
  recipe,
  className,
  style,
  children,
  ...props
}: ActionGroupProps) {
  const Component = as as LayoutElement;
  const resolvedSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const finalDirection = resolvedSyntax.semantics.direction ?? direction ?? recipe?.logic?.direction ?? 'row';
  const finalWrap = resolvedSyntax.semantics.wrap ?? wrap ?? recipe?.logic?.wrap ?? true;
  const finalAlign = resolvedSyntax.semantics.align ?? align ?? recipe?.logic?.align ?? 'center';
  const finalJustify = resolvedSyntax.semantics.justify ?? justify ?? recipe?.logic?.justify ?? 'start';

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(resolvedSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{
        '--fwlb-gap': resolveSpaceValue(gap),
        ...resolvedSyntax.style,
        ...style,
      } as React.CSSProperties}
      data-slot="action-group"
      data-direction={finalDirection}
      data-wrap={finalWrap ? 'true' : 'false'}
      data-align={finalAlign}
      data-justify={finalJustify}
      data-state="idle"
    >
      {children}
    </Component>
  );
}
