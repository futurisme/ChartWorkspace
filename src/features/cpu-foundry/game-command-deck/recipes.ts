import { defineRecipe, defineSyntax } from '@/lib/fadhilweblib';

export const deckSectionRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(base)',
      border: 'tone(info, border)',
      shadow: '0 24px 72px rgba(15, 23, 42, 0.42)',
      radius: 28,
    },
    spacing: {
      p: 'lg',
    },
  }),
});

export const deckPanelRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(elevated)',
      border: 'tone(info, border)',
      shadow: '0 18px 48px rgba(15, 23, 42, 0.28)',
      radius: 22,
    },
    spacing: {
      p: 'md',
    },
  }),
});

export const densePanelRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(base)',
      border: 'tone(neutral, border)',
      shadow: 'shadow(panel)',
      radius: 18,
    },
    spacing: {
      p: 'sm',
    },
  }),
});

export const dockButtonRecipe = defineRecipe({
  syntax: defineSyntax('surface(tone:brand, size:sm, radius:16); spacing(px:16, py:12);'),
});

export const utilityButtonRecipe = defineRecipe({
  syntax: defineSyntax('surface(tone:neutral, size:sm, radius:14); spacing(px:14, py:10);'),
});
