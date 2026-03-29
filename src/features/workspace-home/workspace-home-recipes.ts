import { defineRecipe, defineSyntax } from '@/lib/fadhilweblib';

export const workspaceHeroRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(base)',
      border: 'tone(brand, border)',
      shadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
      radius: 30,
    },
    spacing: {
      p: 'xl',
    },
  }),
});

export const workspacePanelRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(elevated)',
      border: 'tone(info, border)',
      shadow: '0 18px 48px rgba(15, 23, 42, 0.14)',
      radius: 24,
    },
    spacing: {
      p: 'lg',
    },
  }),
});

export const workspaceTileRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(base)',
      border: 'tone(neutral, border)',
      shadow: 'shadow(panel)',
      radius: 18,
    },
    spacing: {
      p: 'md',
    },
  }),
});

export const workspaceButtonRecipe = defineRecipe({
  syntax: defineSyntax('surface(tone:neutral, size:sm, radius:16); spacing(px:15, py:11);'),
});
