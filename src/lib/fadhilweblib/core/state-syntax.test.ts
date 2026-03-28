import assert from 'node:assert/strict';
import test from 'node:test';
import { defineStateSyntax, resolveStateSyntax, createStateStyleVariables } from './state-syntax';
import { resolveSyntax } from './syntax';

test('defineStateSyntax compiles reusable hover and current visual states', () => {
  const stateSyntax = defineStateSyntax({
    hover: 'bg:tone(brand, bg); fg:tone(brand, fg); translateY:-2;',
    current: {
      border: 'tone(info, border)',
      shadow: 'shadow(panel)',
    },
  });
  const resolved = resolveStateSyntax(stateSyntax);

  assert.equal(resolved.hover?.style.background, 'var(--fwlb-tone-brand-bg)');
  assert.equal(resolved.hover?.style.color, 'var(--fwlb-tone-brand-fg)');
  assert.equal(resolved.hover?.style.transform, 'translateY(-2px)');
  assert.equal(resolved.current?.style.borderColor, 'var(--fwlb-tone-info-border)');
  assert.equal(resolved.current?.style.boxShadow, 'var(--fwlb-shadow-panel)');
});

test('createStateStyleVariables moves dynamic root styles into CSS variables', () => {
  const base = resolveSyntax('bg:surface(base); border:tone(brand, border); radius:radius(panel);');
  const states = resolveStateSyntax(defineStateSyntax({
    hover: 'bg:surface(elevated);',
    loading: 'opacity:0.72;',
  }));
  const style = createStateStyleVariables(base.style, states) as Record<string, string | number | undefined>;

  assert.equal(style['--fwlb-base-background'], 'var(--fwlb-surface-base)');
  assert.equal(style['--fwlb-base-border-color'], 'var(--fwlb-tone-brand-border)');
  assert.equal(style['--fwlb-base-border-radius'], 'var(--fwlb-radius-panel)');
  assert.equal(style['--fwlb-hover-background'], 'var(--fwlb-surface-elevated)');
  assert.equal(style['--fwlb-loading-opacity'], 0.72);
  assert.equal(style.background, undefined);
});
