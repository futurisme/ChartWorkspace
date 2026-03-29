import type { NoticeProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeStateSyntax, createStateStyleVariables, resolveStateSyntax } from '../../core/state-syntax';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './feedback.module.css';

export function Notice({
  title,
  description,
  actions,
  tone,
  children,
  syntax,
  stateSyntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: NoticeProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const resolvedStates = resolveStateSyntax(composeStateSyntax(recipe?.stateSyntax, stateSyntax));
  const titleSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.title, slotSyntax?.title));
  const descriptionSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.description, slotSyntax?.description));
  const actionsSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.actions, slotSyntax?.actions));
  const bodySyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.body, slotSyntax?.body));
  const rootStyle = createStateStyleVariables(rootSyntax.style, resolvedStates);

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.notice, className)}
      style={{ ...rootStyle, ...style }}
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'notice'}
    >
      {title ? <div className={styles.title} style={titleSyntax.style} data-slot="notice-title">{title}</div> : null}
      {description ? (
        <div className={styles.description} style={descriptionSyntax.style} data-slot="notice-description">
          {description}
        </div>
      ) : null}
      {children ? <div className={styles.body} style={bodySyntax.style} data-slot="notice-body">{children}</div> : null}
      {actions ? <div className={styles.actions} style={actionsSyntax.style} data-slot="notice-actions">{actions}</div> : null}
    </div>
  );
}
