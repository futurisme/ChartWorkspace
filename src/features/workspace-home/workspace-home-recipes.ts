import { defineRecipe, defineSyntax } from '@/lib/fadhilweblib';

export const workspaceHeroRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(base)',
      border: 'rgba(34, 211, 238, 0.24)',
      shadow: '0 14px 34px rgba(2, 8, 23, 0.34)',
      radius: 22,
    },
    fx: {
      backdrop: 'blur(12px)',
    },
    spacing: {
      p: 14,
    },
  }),
});

export const workspacePanelRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(elevated)',
      border: 'rgba(129, 140, 248, 0.18)',
      shadow: '0 10px 28px rgba(2, 8, 23, 0.26)',
      radius: 18,
    },
    fx: {
      backdrop: 'blur(12px)',
    },
    spacing: {
      p: 12,
    },
  }),
});

export const workspaceTileRecipe = defineRecipe({
  syntax: defineSyntax({
    surface: {
      bg: 'surface(base)',
      border: 'rgba(148, 163, 184, 0.18)',
      shadow: '0 8px 20px rgba(2, 8, 23, 0.22)',
      radius: 16,
    },
    spacing: {
      p: 10,
    },
  }),
});

export const workspaceButtonRecipe = defineRecipe({
  syntax: defineSyntax('surface(tone:neutral, size:xs, radius:12); spacing(px:10, py:8);'),
});
