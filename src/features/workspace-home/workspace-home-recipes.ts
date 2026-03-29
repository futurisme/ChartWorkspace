import { defineRecipe, defineSyntax } from '@/lib/fadhilweblib';

export const workspaceHeroRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(base)',
      border: 'rgba(34, 211, 238, 0.24)',
      shadow: '0 20px 54px rgba(2, 8, 23, 0.38)',
      radius: 24,
    },
    fx: {
      backdrop: 'blur(16px)',
    },
    spacing: {
      p: 'lg',
    },
  }),
});

export const workspacePanelRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(elevated)',
      border: 'rgba(129, 140, 248, 0.18)',
      shadow: '0 14px 40px rgba(2, 8, 23, 0.3)',
      radius: 20,
    },
    fx: {
      backdrop: 'blur(14px)',
    },
    spacing: {
      p: 'md',
    },
  }),
});

export const workspaceTileRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(base)',
      border: 'rgba(148, 163, 184, 0.18)',
      shadow: 'shadow(soft)',
      radius: 18,
    },
    spacing: {
      p: 'md',
    },
  }),
});

export const workspaceButtonRecipe = defineRecipe({
  syntax: defineSyntax('surface(tone:neutral, size:sm, radius:14); spacing(px:12, py:9);'),
});
