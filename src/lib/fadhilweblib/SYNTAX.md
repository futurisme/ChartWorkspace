# fadhilweblib Syntax Guide

This file is the complete authoring guide for `fadhilweblib` syntax.

## Authoring Forms

### Grouped String Syntax

```tsx
defineSyntax(`
  layout(display:grid, cols:1fr 20rem, gap:lg);
  spacing(px:24, py:20);
  surface(bg:surface(base), border:tone(brand, border), radius:24);
  text(fs:18, clamp:2);
  fx(duration:180, translateY:-1);
  logic(focusable:true, interactive:true);
  attrs(id:hero-card);
  data(track:hero);
  vars(card-shadow:shadow(panel));
  css(scrollbar-gutter:stable both-edges);
`);
```

### Object Syntax

```tsx
defineSyntax({
  layout: {
    display: 'grid',
    cols: '1fr 20rem',
    gap: 'lg',
  },
  spacing: {
    px: 24,
    py: 20,
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
  logic: {
    focusable: true,
    interactive: true,
  },
  attrs: {
    id: 'hero-card',
  },
});
```

### Flat String Syntax

```tsx
defineSyntax('tone:brand; px:18; py:12; radius:16; shadow:shadow(panel);');
```

## Validation Rules

- Unknown keys fail.
- Unknown groups fail.
- Grouped keys are validated against the namespace they are used in.
- Group entries must be `key:value`.
- Empty groups fail.
- Object groups must be plain objects.
- Scalar keys cannot receive nested objects.
- `aria`, `data`, `vars`, `css`, and `attrs` only accept scalar values per key.

## Group Reference

### `layout(...)`

Use for flow, arrangement, grid, sizing, overflow, scroll, and positioning.

Keys:

| Key | Meaning |
| --- | --- |
| `display` | Any CSS display value |
| `direction` / `dir` | `row` or `column` |
| `wrap` | `true`, `false`, `wrap`, `nowrap` |
| `align` | `start`, `center`, `end`, `stretch`, `baseline` |
| `justify` | `start`, `center`, `end`, `between`, `around`, `evenly` |
| `self` | Self-alignment |
| `gap` | Gap token or length |
| `grow`, `shrink`, `basis`, `order` | Flex sizing |
| `cols`, `rows` | Grid templates |
| `autoFlow`, `autoCols`, `autoRows` | Grid auto tracks |
| `placeItems`, `placeContent`, `justifyItems`, `justifySelf` | Grid alignment |
| `gridColumn`, `gridRow` | Raw grid placement |
| `templateAreas`, `area` | Grid area authoring |
| `colSpan`, `rowSpan` | Span shorthand |
| `aspect` | Aspect ratio |
| `w`, `h`, `minW`, `maxW`, `minH`, `maxH` | Box sizing |
| `overflow`, `overflowX`, `overflowY` | Overflow |
| `overscroll`, `overscrollX`, `overscrollY` | Overscroll behavior |
| `scrollBehavior` | Scroll behavior |
| `scrollSnapType`, `scrollSnapAlign`, `scrollSnapStop` | Scroll snap |
| `scrollMargin`, `scrollMarginX`, `scrollMarginY` | Scroll margin |
| `scrollPadding`, `scrollPaddingX`, `scrollPaddingY` | Scroll padding |
| `scrollbarGutter` | Scrollbar gutter |
| `position`, `inset`, `top`, `right`, `bottom`, `left`, `z` | Positioning |
| `sticky` | Sticky helper |
| `pin` | Absolute pin helper |

### `spacing(...)`

Keys:

`gap`, `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`, `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml`

### `surface(...)`

Use for semantic surface styling and component-scale tokens.

Keys:

`tone`, `size`, `density`, `compact`, `full`, `bg`, `gradient`, `gradientText`, `bgImage`, `bgSize`, `bgPosition`, `bgRepeat`, `bgClip`, `bgOrigin`, `fg`, `border`, `borderWidth`, `borderStyle`, `shadow`, `ring`, `ringColor`, `ringOffset`, `ringOffsetColor`, `radius`, `outlineColor`, `outlineWidth`, `outlineOffset`, `opacity`

Aliases:

- `box(...)`
- `ui(...)`

### `text(...)`

Keys:

`fontSize`, `fontFamily`, `weight`, `lineHeight`, `tracking`, `textAlign`, `textTransform`, `whiteSpace`, `textWrap`, `truncate`, `clampLines`, `accent`, `caret`

Useful aliases:

- `fs` -> `fontSize`
- `fw` -> `weight`
- `lh` -> `lineHeight`
- `ta` -> `textAlign`
- `clamp` -> `clampLines`

### `fx(...)`

Use for transform, filter, animation, and low-level rendering effects.

Keys:

`cursor`, `pointerEvents`, `userSelect`, `filter`, `backdrop`, `blend`, `isolation`, `transform`, `transformOrigin`, `transition`, `duration`, `ease`, `delay`, `animation`, `animationDuration`, `animationDelay`, `animationTiming`, `willChange`, `scale`, `scaleX`, `scaleY`, `rotate`, `translateX`, `translateY`, `skewX`, `skewY`, `blur`, `brightness`, `contrast`, `saturate`, `contain`, `contentVisibility`, `containIntrinsicSize`

Aliases:

- `motion(...)`

### `logic(...)`

Use for lightweight DOM and behavior semantics.

Keys:

`role`, `tabIndex`, `titleText`, `inert`, `loading`, `disabled`, `open`, `hidden`, `current`, `interactive`, `focusable`, `visuallyHidden`, `presence`

Behavior notes:

- `interactive:true` adds pointer-style behavior.
- `focusable:true` sets `tabIndex=0` unless already provided.
- `visuallyHidden:true` applies screen-reader-only hiding styles.
- `presence` supports `keep`, `lazy`, and `unmount`.

Aliases:

- `behavior(...)`

### `aria(...)`

Adds ARIA attributes. Keys do not need the `aria-` prefix.
Values must be scalar strings, numbers, or booleans.

```tsx
defineSyntax('aria(label:Search, expanded:true);');
```

### `data(...)`

Adds data attributes. Keys do not need the `data-` prefix.
Values must be scalar strings, numbers, or booleans.

```tsx
defineSyntax('data(track:hero, state:active);');
```

### `vars(...)`

Adds CSS variables. Keys do not need the `--` prefix.
Values must be scalar strings, numbers, or booleans.

```tsx
defineSyntax('vars(card-shadow:shadow(panel));');
```

### `css(...)`

Raw CSS property escape hatch. Use only when no canonical syntax key exists.
Values must be scalar strings, numbers, or booleans.

```tsx
defineSyntax('css(scrollbar-gutter:stable both-edges, grid-template-columns:subgrid);');
```

### `attrs(...)`

Raw DOM attribute escape hatch. Use only when no canonical syntax key exists.
Values must be scalar strings, numbers, or booleans.

```tsx
defineSyntax('attrs(id:workspace-shell, draggable:true);');
```

## Common Flat Aliases

| Alias | Canonical key |
| --- | --- |
| `fs` | `fontSize` |
| `fw` | `weight` |
| `lh` | `lineHeight` |
| `ta` | `textAlign` |
| `tx` | `translateX` |
| `ty` | `translateY` |
| `r` | `radius` |
| `bw` | `borderWidth` |
| `bs` | `borderStyle` |
| `dir` | `direction` |
| `ox` | `overflowX` |
| `oy` | `overflowY` |
| `clamp` | `clampLines` |
| `snaptype` | `scrollSnapType` |
| `sronly` | `visuallyHidden` |

## Expression Helpers

Expressions are valid anywhere string values are accepted.

| Helper | Output |
| --- | --- |
| `space(md)` | spacing token |
| `radius(panel)` | radius token |
| `surface(base)` | surface token |
| `text(muted)` | text token |
| `shadow(panel)` | shadow token |
| `tone(brand, border)` | tone channel token |
| `alpha(color, 0.24)` | color alpha mix |
| `mix(a, b, 40%)` | color mix |
| `lighten(color, 16%)` | lightened color |
| `darken(color, 18%)` | darkened color |
| `gradient(...)` | linear gradient |
| `radial(...)` | radial gradient |
| `conic(...)` | conic gradient |

## Escape Hatch Policy

Use canonical keys first.

- Prefer `layout(scrollBehavior:smooth)` before `css(scroll-behavior:smooth)`.
- Prefer `logic(focusable:true)` before `attrs(tabIndex:0)`.
- Prefer `surface(radius:24)` before `css(border-radius:24px)`.

Use `css(...)` and `attrs(...)` only when the canonical syntax set does not already express the intent.
