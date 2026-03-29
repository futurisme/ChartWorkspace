import type React from 'react';
import type { ContainerProps, LayoutElement } from '../../core/types';
import { cx } from '../../core/cx';
import { resolveLengthValue } from '../../core/space';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './container.module.css';

function resolveContainerMaxWidth(value: ContainerProps['maxWidth']) {
  if (value === 'sm') return '40rem';
  if (value === 'md') return '56rem';
  if (value === 'lg' || value === undefined) return '72rem';
  if (value === 'xl') return '88rem';
  if (value === 'full') return '100%';
  if (value !== undefined) return resolveLengthValue(value);
  return '72rem';
}

export function Container({
  as = 'div',
  maxWidth = 'lg',
  centered = true,
  syntax,
  recipe,
  className,
  style,
  children,
  ...props
}: ContainerProps) {
  const Component = as as LayoutElement;
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const finalCentered = rootSyntax.semantics.full ? false : centered;

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{
        '--fwlb-container-max': resolveContainerMaxWidth(maxWidth),
        ...rootSyntax.style,
        ...style,
      } as React.CSSProperties}
      data-centered={finalCentered ? 'true' : 'false'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'container'}
    >
      {children}
    </Component>
  );
}
