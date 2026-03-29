import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { cx } from '../../core/cx';
import type { TextareaProps } from '../../core/types';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './controls.module.css';

export function Textarea({
  tone,
  size,
  invalid,
  syntax,
  stateSyntax,
  recipe,
  className,
  style,
  ...props
}: TextareaProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const finalTone = rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const finalSize = rootSyntax.semantics.size ?? size ?? recipe?.logic?.size ?? 'md';
  const finalInvalid = invalid ?? recipe?.logic?.invalid ?? false;
  const finalDisabled = rootSyntax.logic.disabled ?? props.disabled ?? false;
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStateSyntax);

  return (
    <textarea
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      disabled={finalDisabled}
      className={cx(styles.control, styles.textarea, className)}
      style={{ ...rootStyle, ...style }}
      data-tone={finalTone}
      data-size={finalSize}
      data-invalid={finalInvalid ? 'true' : 'false'}
      data-disabled={finalDisabled ? 'true' : 'false'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'textarea'}
    />
  );
}
