import type React from 'react';
import type { SkeletonProps } from '../../core/types';
import { cx } from '../../core/cx';
import { resolveLengthValue } from '../../core/space';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './feedback.module.css';

export function Skeleton({
  shape = 'line',
  animated = true,
  width,
  height,
  syntax,
  recipe,
  className,
  style,
  ...props
}: SkeletonProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.skeleton, className)}
      style={{
        width: width !== undefined ? resolveLengthValue(width) : undefined,
        height: height !== undefined ? resolveLengthValue(height) : undefined,
        ...rootSyntax.style,
        ...style,
      } as React.CSSProperties}
      data-shape={shape}
      data-animated={animated ? 'true' : 'false'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'skeleton'}
      aria-hidden="true"
    />
  );
}
