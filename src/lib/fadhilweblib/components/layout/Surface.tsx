import type { LayoutElement, SurfaceProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './surface.module.css';

export function Surface({
  as = 'div',
  tone,
  density,
  variant,
  syntax,
  stateSyntax,
  recipe,
  className,
  style,
  children,
  ...props
}: SurfaceProps) {
  const Component = as as LayoutElement;
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const finalTone = rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const finalDensity = rootSyntax.semantics.density ?? density ?? recipe?.logic?.density ?? 'comfortable';
  const finalVariant = variant ?? recipe?.logic?.variant ?? 'solid';
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStateSyntax);

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{ ...rootStyle, ...style }}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'surface'}
      data-tone={finalTone}
      data-density={finalDensity}
      data-variant={finalVariant}
      data-state={rootSyntax.logic.current ? 'current' : rootSyntax.logic.open ? 'open' : rootSyntax.logic.loading ? 'loading' : rootSyntax.logic.disabled ? 'disabled' : 'idle'}
      data-disabled={rootSyntax.logic.disabled ? 'true' : 'false'}
      data-loading={rootSyntax.logic.loading ? 'true' : 'false'}
      data-open={rootSyntax.logic.open ? 'true' : 'false'}
      data-current={rootSyntax.logic.current ? 'true' : 'false'}
    >
      {children}
    </Component>
  );
}
