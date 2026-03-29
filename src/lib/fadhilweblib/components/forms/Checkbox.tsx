import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { cx } from '../../core/cx';
import type { CheckboxProps } from '../../core/types';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './choice.module.css';

export function Checkbox({
  label,
  description,
  tone,
  size: _size,
  invalid,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  checked,
  defaultChecked,
  disabled,
  ...props
}: CheckboxProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStateSyntax = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const controlSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.control, slotSyntax?.control));
  const labelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.label, slotSyntax?.label));
  const descriptionSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.description, slotSyntax?.description));
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStateSyntax);
  const isChecked = checked ?? defaultChecked ?? false;
  const isDisabled = rootSyntax.logic.disabled ?? disabled ?? false;

  return (
    <label
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      className={cx(styles.root, className)}
      style={{ ...rootStyle, ...style }}
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-checked={isChecked ? 'true' : 'false'}
      data-disabled={isDisabled ? 'true' : 'false'}
      data-invalid={invalid ? 'true' : 'false'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'checkbox'}
    >
      <input
        {...props}
        className={styles.input}
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={isDisabled}
      />
      <span className={styles.control} style={controlSyntax.style} aria-hidden="true" data-slot="checkbox-control" />
      <span className={styles.content}>
        <span className={styles.label} style={labelSyntax.style} data-slot="checkbox-label">{label}</span>
        {description ? (
          <span className={styles.description} style={descriptionSyntax.style} data-slot="checkbox-description">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
