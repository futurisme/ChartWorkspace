import type { HeaderShellProps } from '../core/types';
import { cx } from '../core/cx';
import { composeSyntax, resolveSyntax } from '../core/syntax';
import styles from './header-shell.module.css';

export function HeaderShell({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  compact,
  syntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: HeaderShellProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const contentSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.content, slotSyntax?.content));
  const eyebrowSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.eyebrow, slotSyntax?.eyebrow));
  const titleRowSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.titleRow, slotSyntax?.titleRow));
  const titleSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.title, slotSyntax?.title));
  const metaSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.meta, slotSyntax?.meta));
  const subtitleSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.subtitle, slotSyntax?.subtitle));
  const actionsSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.actions, slotSyntax?.actions));
  const finalCompact = rootSyntax.semantics.compact ?? compact ?? recipe?.logic?.compact ?? false;

  return (
    <div
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.root, className)}
      style={{ ...rootSyntax.style, ...style }}
      data-slot="header-shell"
      data-compact={finalCompact ? 'true' : 'false'}
      data-state="idle"
    >
      <div className={styles.content} style={contentSyntax.style} data-slot="header-shell-content">
        {eyebrow ? (
          <div className={styles.eyebrow} style={eyebrowSyntax.style} data-slot="header-shell-eyebrow">
            {eyebrow}
          </div>
        ) : null}
        <div className={styles.titleRow} style={titleRowSyntax.style} data-slot="header-shell-title-row">
          <div className={styles.title} style={titleSyntax.style} data-slot="header-shell-title">{title}</div>
          {meta ? (
            <div className={styles.meta} style={metaSyntax.style} data-slot="header-shell-meta">
              {meta}
            </div>
          ) : null}
        </div>
        {subtitle ? (
          <div className={styles.subtitle} style={subtitleSyntax.style} data-slot="header-shell-subtitle">
            {subtitle}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className={styles.actions} style={actionsSyntax.style} data-slot="header-shell-actions">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
