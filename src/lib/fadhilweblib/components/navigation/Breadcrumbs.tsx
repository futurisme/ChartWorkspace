import type { BreadcrumbsProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import styles from './navigation.module.css';

export function Breadcrumbs({
  items,
  separator = '/',
  tone,
  syntax,
  slotSyntax,
  recipe,
  className,
  style,
  ...props
}: BreadcrumbsProps) {
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const itemSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.item, slotSyntax?.item));
  const linkSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.link, slotSyntax?.link));
  const separatorSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.separator, slotSyntax?.separator));

  return (
    <nav
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(styles.breadcrumbs, className)}
      style={{ ...rootSyntax.style, ...style }}
      aria-label="Breadcrumb"
      data-tone={rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral'}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'breadcrumbs'}
    >
      {items.map((item, index) => (
        <span key={index} className={styles.breadcrumbItem} style={itemSyntax.style} data-slot="breadcrumbs-item">
          {item.href && !item.current ? (
            <a href={item.href} className={styles.breadcrumbLink} style={linkSyntax.style} data-slot="breadcrumbs-link">
              {item.label}
            </a>
          ) : (
            <span className={styles.breadcrumbCurrent} style={linkSyntax.style} data-slot="breadcrumbs-current">{item.label}</span>
          )}
          {index < items.length - 1 ? <span style={separatorSyntax.style} data-slot="breadcrumbs-separator">{separator}</span> : null}
        </span>
      ))}
    </nav>
  );
}
