import { defineRecipe, mergeRecipes } from '../core/recipe';
import { defineStateSyntax } from '../core/state-syntax';
import { defineSyntax } from '../core/syntax';
import type { ThemeName } from '../core/types';

export const FADHILWEBLIB_THEME_PRESETS = ['base', 'commercial', 'game', 'utility', 'portfolio'] as const satisfies readonly ThemeName[];

const sharedHeroState = defineStateSyntax({
  hover: 'translateY:-1; shadow:shadow(floating);',
  focus: 'outlineColor:alpha($brand-500, 0.24); outlineWidth:2; outlineOffset:2;',
});

export const commercialPreset = {
  heroSection: defineRecipe({
    syntax: defineSyntax({
      surface: {
        bg: 'surface(base)',
        border: 'tone(brand, border)',
        shadow: 'shadow(panel)',
        radius: 'radius(panel)',
      },
      spacing: {
        p: 'xl',
      },
    }),
  }),
  accentButton: defineRecipe({
    syntax: defineSyntax('surface(tone:brand, size:lg, radius:18); spacing(px:22, py:13);'),
    stateSyntax: sharedHeroState,
  }),
};

export const gamePreset = {
  controlPanel: defineRecipe({
    syntax: defineSyntax({
      surface: {
        border: 'tone(info, border)',
        shadow: '0 24px 60px rgba(2, 8, 23, 0.42)',
        radius: 24,
        bg: 'surface(base)',
      },
      fx: {
        backdrop: 'blur(18px)',
      },
    }),
  }),
  modalSurface: defineRecipe({
    syntax: defineSyntax({
      surface: {
        border: 'tone(brand, border)',
        shadow: 'shadow(floating)',
        radius: 26,
        bg: 'surface(elevated)',
      },
    }),
  }),
};

export const utilityPreset = {
  dashboardPanel: defineRecipe({
    syntax: defineSyntax({
      surface: {
        border: 'rgba(37, 99, 235, 0.22)',
        radius: 20,
        shadow: 'shadow(panel)',
        bg: 'surface(elevated)',
      },
    }),
  }),
  toolbarButton: defineRecipe({
    syntax: defineSyntax('surface(tone:neutral, size:sm, radius:14); spacing(px:16, py:10);'),
    stateSyntax: defineStateSyntax({
      current: 'border:tone(brand, border); bg:alpha(tone(brand, bg), 0.14);',
    }),
  }),
};

export const portfolioPreset = {
  projectCard: defineRecipe({
    syntax: defineSyntax({
      surface: {
        border: 'tone(brand, border)',
        radius: 24,
        shadow: 'shadow(floating)',
        bg: 'surface(base)',
      },
      spacing: {
        p: 'lg',
      },
    }),
  }),
  highlightMetric: mergeRecipes(
    utilityPreset.dashboardPanel,
    defineRecipe({
      syntax: defineSyntax({
        surface: {
          border: 'rgba(244, 114, 182, 0.28)',
        },
      }),
    }),
  ),
};

export const fadhilWebPresets = {
  commercial: commercialPreset,
  game: gamePreset,
  utility: utilityPreset,
  portfolio: portfolioPreset,
};
