import assert from 'node:assert/strict';
import test from 'node:test';
import { defineRecipe, mergeRecipes } from './recipe';
import { resolveSyntax } from './syntax';

test('defineRecipe compiles root and slot syntax while keeping logic and attrs', () => {
  const recipe = defineRecipe({
    syntax: 'tone:brand; px:18;',
    slotSyntax: {
      label: 'tracking:0.04em;',
    },
    logic: {
      loading: true,
      fullWidth: true,
    },
    attrs: {
      'data-surface': 'hero',
      'aria-live': 'polite',
    },
  });
  const recipeSyntax = recipe.syntax as { __fwlbType?: string } | undefined;
  const recipeLabelSyntax = recipe.slotSyntax?.label as { __fwlbType?: string } | undefined;

  assert.equal(recipeSyntax?.__fwlbType, 'compiled-syntax');
  assert.equal(recipeLabelSyntax?.__fwlbType, 'compiled-syntax');
  assert.equal(recipe.logic?.loading, true);
  assert.equal(recipe.logic?.fullWidth, true);
  assert.equal(recipe.attrs?.['data-surface'], 'hero');
  assert.equal(resolveSyntax(recipe.syntax).style.paddingInline, '18px');
});

test('mergeRecipes applies later logic, attrs, and syntax last', () => {
  const merged = mergeRecipes<'title', { presence: 'keep' | 'lazy' }>(
    defineRecipe<'title', { presence: 'keep' | 'lazy' }>({
      syntax: 'tone:neutral; px:12;',
      slotSyntax: { title: 'fg:#dbeafe;' },
      logic: { presence: 'keep' as const },
      attrs: { 'data-mode': 'base' },
    }),
    defineRecipe<'title', { presence: 'keep' | 'lazy' }>({
      syntax: 'tone:info; py:10;',
      slotSyntax: { title: 'fg:#eef2ff; fs:18;' },
      logic: { presence: 'lazy' as const },
      attrs: { 'data-mode': 'merged' },
    }),
  );

  const root = resolveSyntax(merged.syntax);
  const title = resolveSyntax(merged.slotSyntax?.title);

  assert.equal(root.semantics.tone, 'info');
  assert.equal(root.style.paddingInline, '12px');
  assert.equal(root.style.paddingBlock, '10px');
  assert.equal(title.style.color, '#eef2ff');
  assert.equal(title.style.fontSize, '18px');
  assert.equal(merged.logic?.presence, 'lazy');
  assert.equal(merged.attrs?.['data-mode'], 'merged');
});
