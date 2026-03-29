import type { EmptyStateProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './feedback.module.css';

export function EmptyState({
  eyebrow,
  title,
  description,
  visual,
  actions,
  tone,
  syntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: EmptyStateProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const visualSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.visual, slotSyntax?.visual));
  const eyebrowSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.eyebrow, slotSyntax?.eyebrow));
  const titleSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.title, slotSyntax?.title));
  const descriptionSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.description, slotSyntax?.description));
  const actionsSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.actions, slotSyntax?.actions));

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.emptyState, className)}
      style={{ ...rootSyntax.style, ...style }}
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'empty-state'}
    >
      {visual ? <div className={styles.emptyVisual} style={visualSyntax.style} data-slot="empty-state-visual">{visual}</div> : null}
      {eyebrow ? <div className={styles.eyebrow} style={eyebrowSyntax.style} data-slot="empty-state-eyebrow">{eyebrow}</div> : null}
      <div className={styles.title} style={titleSyntax.style} data-slot="empty-state-title">{title}</div>
      {description ? (
        <div className={styles.description} style={descriptionSyntax.style} data-slot="empty-state-description">
          {description}
        </div>
      ) : null}
      {actions ? <div className={styles.actions} style={actionsSyntax.style} data-slot="empty-state-actions">{actions}</div> : null}
    </div>
  );
}
