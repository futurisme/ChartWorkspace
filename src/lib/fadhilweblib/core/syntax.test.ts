import assert from 'node:assert/strict';
import test from 'node:test';
import { FadhilWebSyntaxError, compileSyntax, composeSyntax, defineSyntax, mergeSyntax, parseSyntaxInput, resolveSyntax } from './syntax';

function expectSyntaxError(callback: () => unknown, pattern: RegExp) {
  let thrown: unknown;

  try {
    callback();
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof FadhilWebSyntaxError);
  assert.match(thrown.message, pattern);

  return thrown;
}

test('parseSyntaxInput parses semicolon syntax declarations', () => {
  const parsed = parseSyntaxInput('tone:brand; size:lg; px:20; py:12; bg:#08111d; wrap:on;');

  assert.equal(parsed.tone, 'brand');
  assert.equal(parsed.size, 'lg');
  assert.equal(parsed.px, '20');
  assert.equal(parsed.py, '12');
  assert.equal(parsed.bg, '#08111d');
  assert.equal(parsed.wrap, 'on');
});

test('mergeSyntax applies later syntax fragments last', () => {
  const merged = mergeSyntax(
    'tone:brand; px:12; py:8;',
    { tone: 'danger', px: 22, radius: 18 },
  );

  assert.equal(merged.tone, 'danger');
  assert.equal(merged.px, 22);
  assert.equal(merged.py, '8');
  assert.equal(merged.radius, 18);
});

test('resolveSyntax converts syntax into style and semantic overrides', () => {
  const resolved = resolveSyntax('tone:success; size:lg; full:true; px:20; gap:sm; justify:between; align:end;');

  assert.equal(resolved.semantics.tone, 'success');
  assert.equal(resolved.semantics.size, 'lg');
  assert.equal(resolved.semantics.full, true);
  assert.equal(resolved.semantics.justify, 'between');
  assert.equal(resolved.semantics.align, 'end');
  assert.equal(resolved.style.width, '100%');
  assert.equal(resolved.style.paddingInline, '20px');
  assert.equal(resolved.style.gap, 'var(--fwlb-space-2)');
  assert.equal(resolved.style.justifyContent, 'space-between');
  assert.equal(resolved.style.alignItems, 'flex-end');
});

test('resolveSyntax supports advanced color expressions, attrs, and logic semantics', () => {
  const resolved = resolveSyntax(
    'bg:gradient(135deg, alpha($brand-500, 0.22), darken($brand-500, 18%)); fg:text(accent); border:tone(brand, border); shadow:shadow(panel); ring:2; ringColor:alpha($brand-500, 0.35); duration:180; ease:cubic-bezier(0.2,0.8,0.2,1); loading:true; aria-live:polite; data-track:hero;',
  );

  assert.equal(resolved.style.background, 'linear-gradient(135deg, color-mix(in oklab, var(--fwlb-brand-500) 22%, transparent), color-mix(in oklab, var(--fwlb-brand-500) 82%, black))');
  assert.equal(resolved.style.color, 'var(--fwlb-text-accent)');
  assert.equal(resolved.style.borderColor, 'var(--fwlb-tone-brand-border)');
  assert.equal(resolved.style.boxShadow, '0 0 0 2px color-mix(in oklab, var(--fwlb-brand-500) 35%, transparent), var(--fwlb-shadow-panel)');
  assert.match(String(resolved.style.boxShadow), /color-mix\(in oklab, var\(--fwlb-brand-500\) 35%, transparent\)/);
  assert.equal(resolved.style.transitionDuration, '180ms');
  assert.equal(resolved.logic.loading, true);
  assert.equal(resolved.attrs['aria-live'], 'polite');
  assert.equal(resolved.attrs['data-track'], 'hero');
});

test('defineSyntax compiles hoisted syntax into reusable resolved output', () => {
  const syntax = defineSyntax('tone:brand; px:18; --fwlb-focus-ring: rgba(34,211,238,0.42);');
  const resolved = resolveSyntax(syntax);

  assert.equal(syntax.__fwlbType, 'compiled-syntax');
  assert.equal(resolved.semantics.tone, 'brand');
  assert.equal(resolved.style.paddingInline, '18px');
  assert.equal((resolved.style as Record<string, string>)['--fwlb-focus-ring'], 'rgba(34,211,238,0.42)');
  assert.equal(resolveSyntax(syntax), resolved);
});

test('composeSyntax preserves single entries and merges multiple fragments', () => {
  const base = defineSyntax({ tone: 'neutral', px: 12 });

  assert.equal(composeSyntax(base), base);

  const combined = composeSyntax(base, 'tone:info; py:10;');
  const resolved = resolveSyntax(combined);

  assert.equal(resolved.semantics.tone, 'info');
  assert.equal(resolved.style.paddingInline, '12px');
  assert.equal(resolved.style.paddingBlock, '10px');
});

test('compileSyntax supports advanced containment and typography properties', () => {
  const compiled = compileSyntax({
    contain: 'layout paint style',
    contentVisibility: 'auto',
    containIntrinsicSize: 320,
    lineHeight: 1.4,
    textAlign: 'center',
    fontFamily: 'IBM Plex Sans, sans-serif',
    cols: 3,
    aspect: '16 / 9',
  });

  assert.equal(compiled.__fwlbType, 'compiled-syntax');
  const resolved = resolveSyntax(compiled);

  assert.equal(resolved.style.contain, 'layout paint style');
  assert.equal(resolved.style.contentVisibility, 'auto');
  assert.equal(resolved.style.containIntrinsicSize, '320px');
  assert.equal(resolved.style.lineHeight, 1.4);
  assert.equal(resolved.style.textAlign, 'center');
  assert.equal(resolved.style.fontFamily, 'IBM Plex Sans, sans-serif');
  assert.equal(resolved.style.gridTemplateColumns, 'repeat(3, minmax(0, 1fr))');
  assert.equal(resolved.style.aspectRatio, '16 / 9');
});

test('parseSyntaxInput supports grouped namespace syntax and escape hatches', () => {
  const parsed = parseSyntaxInput(
    'layout(display:grid, cols:1.4fr 1fr, gap:lg, templateAreas:"hero stats", sticky:12); spacing(px:20, py:14); surface(bg:surface(base), border:tone(brand, border), radius:24); text(fs:18, weight:700, clamp:2); fx(duration:180, ease:cubic-bezier(0.2,0.8,0.2,1), translateY:-1); logic(open:true, focusable:true); attrs(draggable:true, title:Workspace card); aria(label:Workspace card); data(track:hero); vars(card-shadow:shadow(panel)); css(scrollbar-gutter:stable both-edges, grid-template-columns:subgrid);',
  );

  assert.equal(parsed.display, 'grid');
  assert.equal(parsed.cols, '1.4fr 1fr');
  assert.equal(parsed.templateAreas, '"hero stats"');
  assert.equal(parsed.sticky, '12');
  assert.equal(parsed.px, '20');
  assert.equal(parsed.py, '14');
  assert.equal(parsed.bg, 'surface(base)');
  assert.equal(parsed.border, 'tone(brand, border)');
  assert.equal(parsed.radius, '24');
  assert.equal(parsed.fontSize, '18');
  assert.equal(parsed.weight, '700');
  assert.equal(parsed.clampLines, '2');
  assert.equal(parsed.duration, '180');
  assert.equal(parsed.ease, 'cubic-bezier(0.2,0.8,0.2,1)');
  assert.equal(parsed.translateY, '-1');
  assert.equal(parsed.open, 'true');
  assert.equal(parsed.focusable, 'true');
  assert.equal(parsed.attrs?.draggable, 'true');
  assert.equal(parsed.attrs?.title, 'Workspace card');
  assert.equal(parsed.aria?.['aria-label'], 'Workspace card');
  assert.equal(parsed.data?.['data-track'], 'hero');
  assert.equal(parsed.vars?.['--card-shadow'], 'shadow(panel)');
  assert.equal(parsed.css?.['scrollbar-gutter'], 'stable both-edges');
  assert.equal(parsed.css?.['grid-template-columns'], 'subgrid');
});

test('resolveSyntax supports grouped object syntax and css overrides', () => {
  const resolved = resolveSyntax({
    layout: {
      display: 'grid',
      cols: '1fr 320px',
      gap: 'lg',
      scrollbarGutter: 'stable both-edges',
      scrollBehavior: 'smooth',
    },
    surface: {
      bg: 'surface(base)',
      border: 'tone(brand, border)',
      radius: 24,
    },
    text: {
      fontSize: 18,
      clampLines: 2,
    },
    fx: {
      translateY: -2,
      duration: 180,
    },
    logic: {
      open: true,
      focusable: true,
    },
    attrs: {
      draggable: true,
    },
    css: {
      gridTemplateAreas: '"main aside"',
      WebkitMaskImage: 'linear-gradient(black, transparent)',
    },
  });

  assert.equal(resolved.style.display, 'grid');
  assert.equal(resolved.style.gridTemplateColumns, '1fr 320px');
  assert.equal(resolved.style.gap, 'var(--fwlb-space-4)');
  assert.equal((resolved.style as Record<string, string>)['scrollbarGutter'], 'stable both-edges');
  assert.equal((resolved.style as Record<string, string>)['scrollBehavior'], 'smooth');
  assert.equal(resolved.style.background, 'var(--fwlb-surface-base)');
  assert.equal(resolved.style.borderColor, 'var(--fwlb-tone-brand-border)');
  assert.equal(resolved.style.borderRadius, '24px');
  assert.equal(resolved.style.fontSize, '18px');
  assert.equal((resolved.style as Record<string, string | number>).WebkitLineClamp, 2);
  assert.equal(resolved.style.transform, 'translateY(-2px)');
  assert.equal(resolved.style.transitionDuration, '180ms');
  assert.equal((resolved.style as Record<string, string>)['gridTemplateAreas'], '"main aside"');
  assert.equal((resolved.style as Record<string, string>)['WebkitMaskImage'], 'linear-gradient(black, transparent)');
  assert.equal(resolved.logic.open, true);
  assert.equal(resolved.logic.focusable, true);
  assert.equal(resolved.attrs.tabIndex, 0);
  assert.equal(resolved.attrs.draggable, true);
});

test('resolveSyntax supports positioning, truncation, and visually-hidden behavior helpers', () => {
  const resolved = resolveSyntax(
    'layout(pin:full, sticky:24, overscroll:contain, scrollBehavior:smooth); text(truncate:true); logic(interactive:true, visuallyHidden:true); attrs(id:hero-banner);',
  );

  assert.equal(resolved.style.position, 'absolute');
  assert.equal(resolved.style.inset, '0px');
  assert.equal((resolved.style as Record<string, string>).overscrollBehavior, 'contain');
  assert.equal((resolved.style as Record<string, string>).scrollBehavior, 'smooth');
  assert.equal(resolved.style.textOverflow, 'ellipsis');
  assert.equal(resolved.style.whiteSpace, 'nowrap');
  assert.equal(resolved.style.cursor, 'pointer');
  assert.equal(resolved.logic.interactive, true);
  assert.equal(resolved.logic.visuallyHidden, true);
  assert.equal(resolved.attrs.id, 'hero-banner');
  assert.equal((resolved.style as Record<string, string>).clip, 'rect(0, 0, 0, 0)');
});

test('parseSyntaxInput throws on unknown keys and invalid group usage', () => {
  expectSyntaxError(() => parseSyntaxInput('freedom:full;'), /Unknown syntax key "freedom"/);
  expectSyntaxError(() => parseSyntaxInput('layout(shadow:shadow\\(panel\\));'), /does not allow key "shadow"/);
  expectSyntaxError(() => parseSyntaxInput({ layout: 'grid' } as never), /expects an object map/);
  expectSyntaxError(() => parseSyntaxInput('css();'), /cannot be empty/);
  expectSyntaxError(() => parseSyntaxInput({ sticky: { top: 0 } } as never), /does not accept nested objects/);
  expectSyntaxError(() => parseSyntaxInput({ css: { mask: { alpha: true } } } as never), /Syntax group "css" expects scalar values/);
});
