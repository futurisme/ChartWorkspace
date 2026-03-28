import type { LayoutElement, PanelProps } from '../core/types';
import { cx } from '../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../core/state-syntax';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './panel.module.css';

export function Panel({
  as = 'div',
  tone,
  density,
  syntax,
  stateSyntax,
  recipe,
  className,
  style,
  children,
  ...props
}: PanelProps) {
  const Component = as as LayoutElement;
  const resolvedSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const finalTone = resolvedSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const finalDensity = resolvedSyntax.semantics.density ?? density ?? recipe?.logic?.density ?? 'comfortable';
  const rootStyle = createStateStyleVariables(resolvedSyntax.style, resolvedStateSyntax);

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(resolvedSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{ ...rootStyle, ...style }}
      data-slot="panel"
      data-tone={finalTone}
      data-density={finalDensity}
      data-state={resolvedSyntax.logic.current ? 'current' : resolvedSyntax.logic.open ? 'open' : resolvedSyntax.logic.loading ? 'loading' : resolvedSyntax.logic.disabled ? 'disabled' : 'idle'}
      data-disabled={resolvedSyntax.logic.disabled ? 'true' : 'false'}
      data-loading={resolvedSyntax.logic.loading ? 'true' : 'false'}
      data-open={resolvedSyntax.logic.open ? 'true' : 'false'}
      data-current={resolvedSyntax.logic.current ? 'true' : 'false'}
    >
      {children}
    </Component>
  );
}
