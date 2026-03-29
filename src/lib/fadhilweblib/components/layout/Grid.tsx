import type React from 'react';
import type { GridProps, LayoutElement } from '../../core/types';
import { cx } from '../../core/cx';
import { resolveLengthValue, resolveSpaceValue } from '../../core/space';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './grid.module.css';

function resolveGridColumns(columns: GridProps['columns']) {
  if (typeof columns === 'number') {
    return `repeat(${columns}, minmax(0, 1fr))`;
  }

  return columns;
}

export function Grid({
  as = 'div',
  columns,
  minItemWidth,
  gap = 'md',
  align,
  justify,
  syntax,
  recipe,
  className,
  style,
  children,
  ...props
}: GridProps) {
  const Component = as as LayoutElement;
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const finalAlign = rootSyntax.semantics.align ?? align ?? recipe?.logic?.align ?? 'stretch';
  const finalJustify = rootSyntax.semantics.justify ?? justify ?? recipe?.logic?.justify ?? 'start';
  const templateColumns = minItemWidth
    ? `repeat(auto-fit, minmax(${resolveLengthValue(minItemWidth)}, 1fr))`
    : resolveGridColumns(columns) ?? 'repeat(1, minmax(0, 1fr))';

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{
        '--fwlb-gap': resolveSpaceValue(gap),
        gridTemplateColumns: templateColumns,
        ...rootSyntax.style,
        ...style,
      } as React.CSSProperties}
      data-align={finalAlign}
      data-justify={finalJustify}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'grid'}
    >
      {children}
    </Component>
  );
}
