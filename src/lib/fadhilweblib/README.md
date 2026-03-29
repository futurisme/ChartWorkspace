# fadhilweblib

`fadhilweblib` is the internal, zero-dependency website foundation for this workspace. The library is built for three things:

1. Fewer repeated lines of UI code.
2. Full control over markup, state, and visual output.
3. A syntax layer that stays compact, readable, and strict enough to reject hidden mistakes.

## Import Map

- `@/lib/fadhilweblib`
  Server-safe primitives, shared types, theme scope, syntax helpers, recipes, and non-interactive components.
- `@/lib/fadhilweblib/client`
  Interactive primitives and hooks.
- `@/lib/fadhilweblib/presets`
  Theme-neutral preset packs for `commercial`, `game`, `utility`, and `portfolio`.

## Core Principle

Use semantic primitives first. Use syntax only when you need instance-level control without building a one-off component.

- Components handle structure.
- `syntax` handles root visuals and behavior.
- `slotSyntax` handles internal element styling.
- `stateSyntax` handles hover, focus, active, disabled, loading, open, and current visuals.
- `recipe` packages all of that into one reusable contract.

## Syntax Modes

`fadhilweblib` now supports two first-class syntax authoring modes.

### 1. Grouped Syntax

Use grouped syntax when readability matters.

```tsx
const heroSyntax = defineSyntax(`
  layout(display:grid, cols:1.2fr 0.8fr, gap:lg, templateAreas:"content media");
  spacing(px:24, py:20);
  surface(bg:surface(base), border:tone(brand, border), radius:24, shadow:shadow(panel));
  text(fs:18, clamp:2);
  fx(duration:180, ease:cubic-bezier(0.2,0.8,0.2,1), translateY:-1);
  logic(focusable:true, interactive:true);
  attrs(draggable:true, title:Hero card);
  data(track:landing-hero);
`);
```

Supported grouped namespaces:

- `layout(...)`
  Flex, grid, positioning, pinning, sticky placement, overflow, and scroll behavior.
- `spacing(...)` or `space(...)`
  Margin and padding shorthands.
- `surface(...)` or `box(...)`
  Tone, size, density, background, borders, radius, ring, and shadow.
- `text(...)`
  Typography, wrapping, truncation, and line clamp.
- `fx(...)` or `motion(...)`
  Transform, filter, animation, transition, blend, and low-level display effects.
- `logic(...)` or `behavior(...)`
  Role, tab index, loading, disabled, presence, focusability, and visually-hidden behavior.
- `aria(...)`
  ARIA attributes without manually typing the `aria-` prefix.
- `data(...)`
  Data attributes without manually typing the `data-` prefix.
- `vars(...)`
  Custom CSS variables without manually typing the `--` prefix.
- `css(...)`
  Direct CSS property escape hatch.
- `attrs(...)`
  Direct DOM attribute escape hatch.

### 2. Flat Syntax

Use flat syntax when you want the shortest possible inline fragment.

```tsx
const chipSyntax = defineSyntax(
  'tone:info; px:12; py:8; radius:999; border:tone(info, border); shadow:shadow(panel); current:true;'
);
```

Flat syntax remains first-class. It is not deprecated. Grouped syntax is the readability path; flat syntax is the terse path.

## Strict Parsing

The syntax engine no longer silently drops malformed input.

- Unknown keys throw `FadhilWebSyntaxError`.
- Unknown groups throw `FadhilWebSyntaxError`.
- Keys used in the wrong namespace throw `FadhilWebSyntaxError`.
- Empty grouped syntax like `css()` throws `FadhilWebSyntaxError`.
- Object group values must be object maps, not arbitrary nested values.
- Special maps such as `aria`, `data`, `vars`, `css`, and `attrs` only accept scalar values.

This is deliberate. Hidden syntax mistakes are more expensive than explicit failures.

```tsx
import { FadhilWebSyntaxError, parseSyntaxInput } from '@/lib/fadhilweblib';

try {
  parseSyntaxInput('freedom:full;');
} catch (error) {
  if (error instanceof FadhilWebSyntaxError) {
    console.error(error.message);
  }
}
```

## Escape Hatches

`fadhilweblib` is strict about known syntax, but it still leaves room for advanced control when required.

- `vars(...)`
  Adds CSS custom properties.
- `css(...)`
  Writes raw CSS properties directly into the inline style object. Values must stay scalar.
- `attrs(...)`
  Writes raw DOM attributes directly into the attribute map. Values must stay scalar.

Example:

```tsx
defineSyntax(`
  layout(display:grid, cols:1fr 20rem, gap:lg);
  surface(bg:surface(base), radius:24);
  css(grid-template-areas:"main aside", scrollbar-gutter:stable both-edges);
  attrs(id:workspace-shell, draggable:true);
`);
```

## Expression Layer

The syntax DSL stays lightweight by reusing expression helpers instead of creating dozens of one-off tokens.

- `space(md)`
- `radius(panel)`
- `surface(base)`
- `text(muted)`
- `shadow(floating)`
- `tone(brand, border)`
- `alpha($brand-500, 0.24)`
- `lighten(...)`
- `darken(...)`
- `mix(...)`
- `gradient(...)`
- `radial(...)`
- `conic(...)`

## Common Patterns

### Layout Shell

```tsx
const shellSyntax = defineSyntax(`
  layout(display:grid, cols:18rem 1fr, gap:lg, minH:100vh);
  spacing(p:lg);
  surface(bg:surface(base));
`);
```

### Dense Control Panel

```tsx
const controlSyntax = defineSyntax(`
  surface(bg:surface(elevated), border:tone(info, border), radius:24, shadow:shadow(panel));
  spacing(p:lg);
  fx(backdrop:blur(18px));
`);
```

### Logic-Heavy Trigger

```tsx
const triggerSyntax = defineSyntax(`
  surface(tone:brand, size:sm, radius:14);
  spacing(px:14, py:10);
  logic(current:true, focusable:true, interactive:true);
`);
```

## Recipes

Use `recipe` when the same component contract needs to be reused.

```tsx
const heroRecipe = defineRecipe({
  syntax: defineSyntax(`
    surface(bg:surface(base), border:tone(brand, border), radius:24, shadow:shadow(panel));
    spacing(p:xl);
  `),
  stateSyntax: defineStateSyntax({
    hover: 'translateY:-1; shadow:shadow(floating);',
    focus: 'outlineColor:alpha($brand-500, 0.24); outlineWidth:2; outlineOffset:2;',
  }),
  slotSyntax: {
    title: 'text(fs:24, weight:800);',
    description: 'text(fg:text(muted));',
  },
});
```

## Performance Rules

- Hoist `defineSyntax(...)`, `defineStateSyntax(...)`, and `defineRecipe(...)` outside render functions when reused.
- Prefer grouped syntax for long contracts and flat syntax for short contracts.
- Use `css(...)` and `attrs(...)` only for true edge cases.
- Use `ThemeScope` for subtree-level visual changes instead of one-off overrides on every child.
- Prefer recipes for repeated structures instead of re-declaring long syntax strings.

## Theme Model

- `ThemeScope` activates `base`, `commercial`, `game`, `utility`, or `portfolio` for a subtree.
- The base theme stays neutral.
- Theme presets provide direction without changing component contracts.

## Full Reference

See [SYNTAX.md](./SYNTAX.md) for the complete grouped namespace reference, flat key catalogue, escape hatch rules, and authoring guidance.
