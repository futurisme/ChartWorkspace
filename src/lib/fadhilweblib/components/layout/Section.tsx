import type { LayoutElement, SectionProps } from '../../core/types';
import { cx } from '../../core/cx';
import { composeSyntax, resolveSyntax } from '../../core/syntax';
import { Surface } from './Surface';
import styles from './section.module.css';

export function Section({
  as = 'section',
  eyebrow,
  title,
  description,
  meta,
  actions,
  tone,
  density,
  surface = true,
  syntax,
  slotSyntax,
  recipe,
  className,
  style,
  children,
  ...props
}: SectionProps) {
  const Component = as as LayoutElement;
  const rootSyntax = resolveSyntax(composeSyntax(recipe?.syntax, syntax));
  const headerSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.header, slotSyntax?.header));
  const eyebrowSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.eyebrow, slotSyntax?.eyebrow));
  const titleSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.title, slotSyntax?.title));
  const descriptionSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.description, slotSyntax?.description));
  const metaSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.meta, slotSyntax?.meta));
  const actionsSyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.actions, slotSyntax?.actions));
  const bodySyntax = resolveSyntax(composeSyntax(recipe?.slotSyntax?.body, slotSyntax?.body));
  const finalTone = rootSyntax.semantics.tone ?? tone ?? recipe?.logic?.tone ?? 'neutral';
  const finalDensity = rootSyntax.semantics.density ?? density ?? recipe?.logic?.density ?? 'comfortable';
  const finalSurface = recipe?.logic?.surface ?? surface;

  const content = (
    <div className={styles.root}>
      {(eyebrow || title || description || meta || actions) ? (
        <div className={styles.header} style={headerSyntax.style} data-slot="section-header">
          <div className={styles.content}>
            {eyebrow ? <div className={styles.eyebrow} style={eyebrowSyntax.style} data-slot="section-eyebrow">{eyebrow}</div> : null}
            {title ? <div className={styles.title} style={titleSyntax.style} data-slot="section-title">{title}</div> : null}
            {description ? (
              <div className={styles.description} style={descriptionSyntax.style} data-slot="section-description">
                {description}
              </div>
            ) : null}
            {meta ? <div className={styles.meta} style={metaSyntax.style} data-slot="section-meta">{meta}</div> : null}
          </div>
          {actions ? <div className={styles.actions} style={actionsSyntax.style} data-slot="section-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={styles.body} style={bodySyntax.style} data-slot="section-body">
        {children}
      </div>
    </div>
  );

  if (finalSurface) {
    return (
      <Surface
        as={as}
        tone={finalTone}
        density={finalDensity}
        className={className}
        style={{ ...rootSyntax.style, ...style }}
        {...(recipe?.attrs as Record<string, unknown> | undefined)}
        {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
        {...props}
        data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'section'}
      >
        {content}
      </Surface>
    );
  }

  return (
    <Component
      {...(recipe?.attrs as Record<string, unknown> | undefined)}
      {...(rootSyntax.attrs as Record<string, unknown> | undefined)}
      {...props}
      className={cx(className)}
      style={{ ...rootSyntax.style, ...style }}
      data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'section'}
    >
      {content}
    </Component>
  );
}
