import type { FieldProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './field.module.css';

export function Field({
  label,
  description,
  hint,
  error,
  required,
  optionalLabel,
  htmlFor,
  tone,
  invalid,
  syntax,
  slotSyntax,
  recipe,
  className,
  style,
  children,
  ...props
}: FieldProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const headerSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.header, slotSyntax?.header));
  const labelRowSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.labelRow, slotSyntax?.labelRow));
  const labelSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.label, slotSyntax?.label));
  const metaSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.meta, slotSyntax?.meta));
  const descriptionSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.description, slotSyntax?.description));
  const contentSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.content, slotSyntax?.content));
  const hintSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.hint, slotSyntax?.hint));
  const errorSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.error, slotSyntax?.error));
  const finalTone = rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const finalInvalid = invalid ?? recipe?.logic?.invalid ?? false;

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{ ...rootSyntax.style, ...style }}
      data-tone={finalTone}
      data-invalid={finalInvalid ? 'true' : 'false'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'field'}
    >
      {(label || description) ? (
        <div className={styles.header} style={headerSyntax.style} data-slot="field-header">
          {label ? (
            <div className={styles.labelRow} style={labelRowSyntax.style} data-slot="field-label-row">
              <label className={styles.label} htmlFor={htmlFor} style={labelSyntax.style} data-slot="field-label">
                {label}
              </label>
              <span className={styles.meta} style={metaSyntax.style} data-slot="field-meta">
                {required ? 'Required' : optionalLabel ?? null}
              </span>
            </div>
          ) : null}
          {description ? (
            <div className={styles.description} style={descriptionSyntax.style} data-slot="field-description">
              {description}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={styles.content} style={contentSyntax.style} data-slot="field-content">
        {children}
      </div>
      {error ? (
        <div className={styles.error} style={errorSyntax.style} data-slot="field-error">
          {error}
        </div>
      ) : hint ? (
        <div className={styles.hint} style={hintSyntax.style} data-slot="field-hint">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
