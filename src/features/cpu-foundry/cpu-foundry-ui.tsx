'use client';

import type React from 'react';
import {
  composeSyntax,
  defineRecipe,
  mergeRecipes,
  resolveSyntax,
  type FadhilWebRecipe,
  type FadhilWebSyntax,
} from '@/lib/fadhilweblib';
import styles from './cpu-foundry-sim.module.css';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type GameRecipe = FadhilWebRecipe<any, any>;

type HtmlSurfaceElement = 'div' | 'section';

type GameSurfaceProps = React.HTMLAttributes<HTMLElement> & {
  as?: HtmlSurfaceElement;
  recipe?: GameRecipe;
  syntax?: FadhilWebSyntax;
};

type GameButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  recipe?: GameRecipe;
  syntax?: FadhilWebSyntax;
};

type GameDialogProps = {
  open: boolean;
  ariaLabel: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  dismissOnOverlay?: boolean;
  overlayClassName?: string;
  cardClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

type GameScreenFrameProps = {
  open: boolean;
  ariaLabel: string;
  frameName: string;
  subtitle: string;
  onClose: () => void;
  backLabel: string;
  overlayClassName?: string;
  cardClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

type GamePanelSectionProps = {
  label: React.ReactNode;
  title: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

const CARD_SURFACE_RECIPE = defineRecipe({
  syntax: {
    contain: 'layout paint style',
    contentVisibility: 'auto',
    containIntrinsicSize: 120,
  },
  attrs: {
    'data-fwlb-surface': 'cpu-foundry-card',
  },
});

const BUTTON_RECIPE = defineRecipe({
  attrs: {
    'data-fwlb-control': 'cpu-foundry-button',
  },
});

const OVERLAY_RECIPE = defineRecipe({
  attrs: {
    'data-fwlb-layer': 'cpu-foundry-overlay',
  },
});

const PANEL_SECTION_RECIPE = defineRecipe({
  attrs: {
    'data-fwlb-surface': 'cpu-foundry-panel-section',
  },
});

function resolveRecipeBridge(
  baseRecipe: GameRecipe | undefined,
  recipe: GameRecipe | undefined,
  syntax: FadhilWebSyntax | undefined,
  style: React.CSSProperties | undefined,
) {
  const mergedRecipe = recipe ? mergeRecipes(baseRecipe, recipe) : baseRecipe;
  const resolvedSyntax = resolveSyntax(composeSyntax(mergedRecipe?.syntax, syntax));

  return {
    attrs: {
      ...(mergedRecipe?.attrs as Record<string, unknown> | undefined),
      ...(resolvedSyntax.attrs as Record<string, unknown> | undefined),
    },
    style: {
      ...resolvedSyntax.style,
      ...style,
    },
  };
}

export function GameSurface({
  as = 'div',
  recipe,
  syntax,
  style,
  className,
  children,
  ...props
}: GameSurfaceProps) {
  const Component = as as HtmlSurfaceElement;
  const resolved = resolveRecipeBridge(undefined, recipe, syntax, style);

  return (
    <Component
      {...resolved.attrs}
      {...props}
      className={className}
      style={resolved.style}
    >
      {children}
    </Component>
  );
}

export function GameCardSurface({
  recipe,
  ...props
}: GameSurfaceProps) {
  const mergedRecipe = recipe ? mergeRecipes(CARD_SURFACE_RECIPE, recipe) : CARD_SURFACE_RECIPE;
  return <GameSurface recipe={mergedRecipe} {...props} />;
}

export function GameButton({
  recipe,
  syntax,
  style,
  className,
  children,
  type = 'button',
  ...props
}: GameButtonProps) {
  const resolved = resolveRecipeBridge(BUTTON_RECIPE, recipe, syntax, style);

  return (
    <button
      {...resolved.attrs}
      {...props}
      type={type}
      className={className}
      style={resolved.style}
    >
      {children}
    </button>
  );
}

export function GameDialog({
  open,
  ariaLabel,
  eyebrow,
  title,
  onClose,
  closeLabel,
  dismissOnOverlay = true,
  overlayClassName,
  cardClassName,
  bodyClassName,
  children,
}: GameDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <GameSurface
      className={cx(styles.modalOverlay, overlayClassName)}
      recipe={OVERLAY_RECIPE}
      role="presentation"
      onClick={dismissOnOverlay && onClose ? onClose : undefined}
    >
      <GameCardSurface
        as="section"
        className={cx(styles.modalCard, cardClassName)}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        {(eyebrow || title || onClose) ? (
          <GameSurface className={styles.modalHeader}>
            <div>
              {eyebrow ? <p className={styles.panelTag}>{eyebrow}</p> : null}
              <h2>{title}</h2>
            </div>
            {onClose && closeLabel ? (
              <GameButton
                className={styles.closeButton}
                onClick={onClose}
                aria-label={closeLabel}
              >
                {'\u2715'}
              </GameButton>
            ) : null}
          </GameSurface>
        ) : null}
        <GameSurface className={cx(styles.modalBody, bodyClassName)}>
          {children}
        </GameSurface>
      </GameCardSurface>
    </GameSurface>
  );
}

export function GameScreenFrame({
  open,
  ariaLabel,
  frameName,
  subtitle,
  onClose,
  backLabel,
  overlayClassName,
  cardClassName,
  bodyClassName,
  children,
}: GameScreenFrameProps) {
  if (!open) {
    return null;
  }

  return (
    <GameSurface
      className={cx(styles.screenFrameOverlay, overlayClassName)}
      recipe={OVERLAY_RECIPE}
      role="presentation"
      onClick={onClose}
    >
      <GameCardSurface
        as="section"
        className={cx(styles.screenFrameCard, cardClassName)}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <GameSurface className={styles.screenFrameHeader}>
          <div className={styles.frameHeading}>
            <strong className={styles.frameName}>{frameName}</strong>
            <p className={styles.frameSubName}>{subtitle}</p>
          </div>
          <GameButton
            className={styles.closeButton}
            onClick={onClose}
            aria-label={backLabel}
          >
            {'\u2190'}
          </GameButton>
        </GameSurface>
        <GameSurface className={cx(styles.screenFrameBody, bodyClassName)}>
          {children}
        </GameSurface>
      </GameCardSurface>
    </GameSurface>
  );
}

export function GamePanelSection({
  label,
  title,
  open,
  onToggle,
  className,
  bodyClassName,
  children,
}: GamePanelSectionProps) {
  return (
    <GameCardSurface as="section" className={cx(styles.panel, className)} recipe={PANEL_SECTION_RECIPE}>
      <GameButton className={styles.panelToggle} onClick={onToggle}>
        <div>
          <p className={styles.panelTag}>{label}</p>
          <h2>{title}</h2>
        </div>
        <span>{open ? 'Tutup' : 'Buka'}</span>
      </GameButton>
      {open ? (
        <GameSurface className={bodyClassName}>
          {children}
        </GameSurface>
      ) : null}
    </GameCardSurface>
  );
}
