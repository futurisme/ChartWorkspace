# fadhilweblib

`fadhilweblib` is the internal web library for repeated UI and behavior patterns in this workspace.

## Purpose

- Reduce repeated button, header, panel, and disclosure code.
- Centralize repeated UI state like disclosure, selection, stepper, and async-action flows.
- Keep the library self-authored and lightweight.
- Separate server-safe visual primitives from client-only interactive helpers.

## Import Rules

- Import server-safe components and shared types from `@/lib/fadhilweblib`.
- Import disclosure hooks and interactive primitives from `@/lib/fadhilweblib/client`.
- Do not pull in external UI component libraries or helper packages.

## Custom Syntax

- Use `syntax` on any public component to apply compact per-instance customization.
- Use `stateSyntax` on supported surfaces to customize hover, active, focus, disabled, loading, open, and current visuals without page-level CSS.
- Use `slotSyntax` on composite components to target internal slots like `title`, `summary`, `actions`, `label`, or `content`.
- Use `recipe` when you want a reusable element contract that groups visual syntax, slot syntax, root attributes, and logic defaults.
- `syntax` accepts either a semicolon-delimited string, a typed object, or a compiled syntax object created with `defineSyntax(...)`.
- `stateSyntax` accepts a state-to-syntax map and can be compiled with `defineStateSyntax(...)`.
- `syntax` now resolves root styles, root attributes, and component-friendly logic semantics from the same short declaration.

```tsx
const heroButtonRecipe = defineRecipe({
  syntax: defineSyntax({
    tone: 'brand',
    size: 'lg',
    px: 22,
    py: 13,
    radius: 18,
    shadow: '0 10px 28px rgba(34,211,238,0.22)',
    contain: 'layout paint style',
  }),
  stateSyntax: defineStateSyntax({
    hover: 'translateY:-2; shadow:0 18px 36px rgba(34,211,238,0.18);',
    focus: 'outlineColor:alpha($brand-500, 0.36); outlineWidth:2; outlineOffset:2;',
    current: 'border:tone(info, border); shadow:shadow(panel);',
  }),
  slotSyntax: {
    label: 'tracking:0.02em;',
  },
  attrs: {
    'data-surface': 'hero-button',
  },
});

<Button recipe={heroButtonRecipe}>Launch</Button>

<Panel
  syntax="
    bg:gradient(145deg, alpha(tone(brand, bg), 0.22), darken($info-500, 14%));
    ring:2;
    ringColor:alpha($brand-500, 0.34);
    ringOffset:2;
    ringOffsetColor:alpha($neutral-950, 0.72);
    radius:radius(panel);
    duration:180;
    ease:cubic-bezier(0.2,0.8,0.2,1);
    data-surface:hero;
  "
>
  ...
</Panel>

<CollapsiblePanel
  recipe={defineRecipe({
    syntax: 'radius:24; border:rgba(129,140,248,0.32); presence:lazy;',
    slotSyntax: {
      title: 'fg:#eef2ff; fs:18;',
      content: 'pt:14; contentVisibility:auto; containIntrinsicSize:260;',
    },
    logic: { tone: 'info' },
  })}
  title="Options"
  summary="Closed content is not mounted until first open."
/>
```

- Supported syntax keys include:
  `tone`, `size`, `density`, `compact`, `full`, `bg`, `gradient`, `gradientText`, `bgImage`, `bgSize`, `bgPosition`, `fg`, `border`, `borderWidth`, `borderStyle`, `shadow`, `ring`, `ringColor`, `ringOffset`, `ringOffsetColor`, `radius`, `outlineColor`, `outlineWidth`, `outlineOffset`, `gap`, `p`, `px`, `py`, `m`, `w`, `h`, `fontSize`, `fontFamily`, `weight`, `lineHeight`, `tracking`, `textAlign`, `textTransform`, `opacity`, `accent`, `caret`, `display`, `direction`, `wrap`, `align`, `justify`, `self`, `grow`, `shrink`, `basis`, `order`, `cols`, `rows`, `autoFlow`, `placeItems`, `placeContent`, `gridColumn`, `gridRow`, `aspect`, `overflow`, `position`, `inset`, `top`, `right`, `bottom`, `left`, `z`, `cursor`, `pointerEvents`, `filter`, `backdrop`, `blend`, `isolation`, `transform`, `transformOrigin`, `transition`, `duration`, `ease`, `delay`, `animation`, `willChange`, `scale`, `rotate`, `translateX`, `translateY`, `blur`, `brightness`, `contrast`, `saturate`, `contain`, `contentVisibility`, `containIntrinsicSize`, `role`, `tabIndex`, `titleText`, `inert`, `loading`, `disabled`, `open`, `hidden`, `current`, `presence`.
- String syntax also supports:
  `--name:value;` for CSS variables,
  `aria-*` and `data-*` attributes,
  color helpers like `alpha(...)`, `mix(...)`, `lighten(...)`, `darken(...)`,
  and gradient helpers like `gradient(...)`, `radial(...)`, and `conic(...)`.
- Token helpers now include:
  `tone(name, bg|fg|border)`,
  `surface(name)`,
  `text(name)`,
  `shadow(name)`,
  `radius(name)`,
  and `space(name)`.
- Supported `stateSyntax` keys are:
  `hover`, `active`, `focus`, `disabled`, `loading`, `open`, and `current`.
- `stateSyntax` currently powers dynamic root-surface styling on `Button`, `IconButton`, `Panel`, `StatusChip`, and `CollapsiblePanel`.

```tsx
const orbitStates = defineStateSyntax({
  hover: 'bg:surface(elevated); translateY:-2;',
  active: 'scale:0.99; translateY:0;',
  focus: 'outlineColor:alpha($brand-500, 0.34); outlineWidth:2; outlineOffset:2;',
  current: 'border:tone(info, border); shadow:shadow(panel);',
});

<Button
  syntax="bg:tone(brand, bg); border:tone(brand, border);"
  stateSyntax={orbitStates}
>
  Launch
</Button>
```

## Recipes And Logic

- `defineSyntax(...)` compiles syntax up front. Hoist these constants to avoid repeat parsing and repeat style-object creation.
- `defineStateSyntax(...)` compiles dynamic-state syntax up front and reuses the resolved state maps.
- `defineRecipe(...)` compiles root and slot syntax and keeps logic defaults together.
- `mergeRecipes(...)` layers recipe fragments so product-specific overrides stay short and predictable.
- `CollapsiblePanel` supports `presence="keep" | "lazy" | "unmount"`.
  `keep` keeps content mounted, `lazy` mounts on first open then keeps it, `unmount` removes it whenever closed.
- `useDisclosure()` now exposes `getTriggerProps(...)` and `getContentProps(...)` so headless usage can merge handlers, classes, styles, and `data-*` attributes without reimplementing disclosure behavior.
- `useSelectionState()` centralizes repeatable single- and multi-select logic for tabs, filter rows, segmented controls, and toggle groups.
- `useStepper()` centralizes ordered next/previous/first/last logic for carousels, wizard flows, and sequence navigation.
- `useRovingFocus()` centralizes roving-tabindex keyboard navigation for toolbars, tab rows, menus, and segmented controls.
- `useAsyncAction()` standardizes async pending/success/error state so buttons and menus do not keep reimplementing local loading flags.

```tsx
const palette = useSelectionState({
  defaultValue: ['aurora'],
  multiple: false,
});

const deploy = useAsyncAction(async () => {
  await saveWorkspace();
  return 'saved';
});

const toolbar = useRovingFocus({
  count: 4,
  orientation: 'horizontal',
  loop: true,
});

<Button
  syntax="loading:true; aria-live:polite;"
  loading={deploy.pending}
  onClick={() => void deploy.run()}
>
  Save
</Button>

<Inline {...toolbar.getContainerProps({ role: 'toolbar', 'aria-label': 'Editor controls' })}>
  {['Canvas', 'Layout', 'Theme', 'Publish'].map((item, index) => (
    <Button key={item} {...toolbar.getItemProps(index)}>
      {item}
    </Button>
  ))}
</Inline>
```

## Performance Notes

- Prefer `defineSyntax(...)` or `defineRecipe(...)` for reused syntax fragments. They compile once and reuse frozen resolved output.
- Prefer `defineStateSyntax(...)` for repeated hover/open/current/focus visual contracts. It compiles once and keeps dynamic visuals in CSS variables instead of runtime style injection.
- `syntax` expressions are resolved once for compiled syntax objects and cached for repeated string/object inputs.
- `stateSyntax` is converted into CSS custom properties on supported components, so dynamic states stay zero-dependency and do not require runtime CSS generation.
- Use `contain`, `contentVisibility`, and `containIntrinsicSize` on larger repeated surfaces when you want opt-in rendering containment.
- Use `presence="lazy"` or `presence="unmount"` on heavy collapsible content to reduce hidden DOM work.
- Prefer the headless hooks for repeated state machines instead of duplicating local state plus ad hoc helpers across pages.
- Prefer `useRovingFocus()` plus `useSelectionState()` when building tabs or segmented controls so keyboard navigation and selection state stay independent and reusable.

## Naming Rules

- Use short, stable component names: `Button`, `Panel`, `HeaderShell`, `StatusChip`, `CollapsiblePanel`.
- Prefer behavior-first names for hooks: `useDisclosure`, `useSelectionState`, `useStepper`, `useAsyncAction`, `useControllableState`.
- Keep tone and size props small and explicit.

## Extension Rules

- Add primitives before adding specialized variants.
- Keep client-only code isolated from server-safe exports.
- Preserve `className` overrides and `data-*` state attributes on public components.
- Keep the visual layer portable by avoiding framework-specific dependencies inside the library.
