'use client';

import { useState } from 'react';
import type { CollapsiblePanelRecipeLogic } from '@/lib/fadhilweblib';
import { ActionGroup, HeaderShell, Inline, Panel, Stack, StatusChip, defineRecipe, defineStateSyntax, defineSyntax, mergeRecipes } from '@/lib/fadhilweblib';
import { Button, CollapsiblePanel, IconButton, useAsyncAction, useDisclosure, useRovingFocus, useSelectionState, useStepper } from '@/lib/fadhilweblib/client';

const launchHeaderRecipe = defineRecipe({
  syntax: defineSyntax({
    bg: 'linear-gradient(180deg, rgba(8,17,29,0.94), rgba(2,6,23,0.92))',
    border: 'rgba(34,211,238,0.22)',
    radius: 26,
    shadow: '0 22px 60px rgba(2, 8, 23, 0.42)',
    p: 'xl',
    contain: 'layout paint style',
    contentVisibility: 'auto',
    containIntrinsicSize: 220,
    vars: {
      '--fwlb-border-soft': 'rgba(34,211,238,0.18)',
    },
  }),
});

const baseButtonRecipe = defineRecipe({
  syntax: defineSyntax('tone:brand; size:lg; radius:18; px:22; py:13;', {
    shadow: '0 10px 28px rgba(34,211,238,0.22)',
  }),
  slotSyntax: {
    label: 'tracking:0.02em;',
  },
});

const neonButtonRecipe = mergeRecipes(
  baseButtonRecipe,
  defineRecipe({
    attrs: {
      'data-surface': 'neon-button',
    },
  }),
);

const interactiveOrbitStateSyntax = defineStateSyntax({
  hover: defineSyntax({
    bg: 'gradient(135deg, alpha(tone(brand, bg), 0.92), alpha(#38bdf8, 0.88))',
    shadow: '0 18px 36px rgba(34, 211, 238, 0.18)',
    translateY: -2,
  }),
  active: {
    bg: 'gradient(135deg, alpha(#0891b2, 0.94), alpha(#0ea5e9, 0.88))',
    translateY: 0,
    scale: 0.99,
  },
  focus: {
    outlineColor: 'alpha($brand-500, 0.36)',
    outlineWidth: 2,
    outlineOffset: 2,
  },
  current: {
    border: 'tone(info, border)',
    shadow: 'shadow(panel)',
  },
  loading: {
    opacity: 0.76,
    filter: 'saturate(0.82)',
  },
});

const lazyOptionsRecipe = defineRecipe<
  'header' | 'trigger' | 'heading' | 'titleRow' | 'title' | 'summary' | 'actions' | 'indicator' | 'content',
  CollapsiblePanelRecipeLogic
>({
  syntax: defineSyntax({
    radius: 24,
    border: 'rgba(129,140,248,0.32)',
    contain: 'layout paint style',
  }),
  slotSyntax: {
    title: 'fg:#eef2ff; fs:18; weight:800;',
    summary: 'fg:rgba(199,210,254,0.78);',
    content: 'pt:14; contentVisibility:auto; containIntrinsicSize:260;',
  },
  logic: {
    tone: 'info',
    presence: 'lazy',
  },
});

const advancedSpectrumPanelSyntax = defineSyntax({
  bg: 'gradient(145deg, alpha(#22d3ee, 0.22), darken(#818cf8, 14%))',
  ring: 2,
  ringColor: 'alpha(#22d3ee, 0.34)',
  ringOffset: 2,
  ringOffsetColor: 'alpha(#020617, 0.72)',
  radius: 28,
  shadow: '0 24px 60px rgba(2, 8, 23, 0.44)',
  p: 'lg',
  backdrop: 'blur(18px)',
  contain: 'layout paint style',
  contentVisibility: 'auto',
  containIntrinsicSize: 220,
  data: {
    'data-preset': 'spectrum',
  },
});

const paletteOptions = [
  { key: 'aurora', label: 'Aurora', syntax: 'bg:gradient(135deg, alpha(#22d3ee, 0.28), alpha(#818cf8, 0.18)); ring:2; ringColor:alpha(#22d3ee, 0.3);' },
  { key: 'ember', label: 'Ember', syntax: 'bg:gradient(135deg, alpha(#fb7185, 0.28), alpha(#f59e0b, 0.18)); ring:2; ringColor:alpha(#fb7185, 0.34);' },
  { key: 'forest', label: 'Forest', syntax: 'bg:gradient(135deg, alpha(#10b981, 0.24), alpha(#22c55e, 0.18)); ring:2; ringColor:alpha(#10b981, 0.34);' },
] as const;

const releaseTimeline = [
  'Draft configuration',
  'Compile syntax recipe',
  'Mount UI shell',
  'Sync async action',
] as const;

const rovingTools = [
  'Visual tone',
  'Dynamic state',
  'List focus',
  'Async flow',
] as const;

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-cyan-400/10 bg-[#04111d] p-4 text-[11px] leading-5 text-cyan-50/85">
      <code>{code}</code>
    </pre>
  );
}

function PlaygroundButtonRow() {
  return (
    <Inline wrap gap="sm">
      <Button tone="brand">Primary</Button>
      <Button tone="success" leadingVisual="+" size="sm">Create</Button>
      <Button tone="warning" trailingVisual="->">Promote</Button>
      <Button tone="danger" size="xs">Remove</Button>
      <IconButton tone="info" label="Refresh" icon="R" />
      <Button recipe={neonButtonRecipe}>Recipe Styled</Button>
    </Inline>
  );
}

function HookDisclosureExample() {
  const disclosure = useDisclosure({ defaultOpen: false });

  return (
    <Panel density="comfortable">
      <Stack gap="sm">
        <HeaderShell
          compact
          eyebrow="Hook"
          title="useDisclosure"
          subtitle="The hook returns open state plus trigger and content props."
          meta={<StatusChip tone={disclosure.open ? 'success' : 'warning'} label="state" value={disclosure.open ? 'open' : 'closed'} />}
        />
        <Inline gap="sm">
          <Button
            {...disclosure.getTriggerProps({
              'data-surface': 'hook-disclosure-trigger',
            })}
            tone={disclosure.open ? 'success' : 'neutral'}
          >
            {disclosure.open ? 'Collapse' : 'Expand'}
          </Button>
        </Inline>
        <div
          {...disclosure.getContentProps({
            className: 'rounded-2xl border border-cyan-400/10 bg-slate-900/70 p-4 text-sm text-slate-300',
          })}
        >
          Hook-driven disclosure content keeps behavior reusable without forcing a specific visual shell.
        </div>
      </Stack>
    </Panel>
  );
}

function ControlledDisclosureExample() {
  const [open, setOpen] = useState(false);

  return (
    <CollapsiblePanel
      title="Controlled disclosure"
      summary="External state drives the open state."
      tone="brand"
      open={open}
      onOpenChange={setOpen}
      actions={<StatusChip tone={open ? 'success' : 'warning'} label="state" value={open ? 'open' : 'closed'} />}
      slotSyntax={{
        title: 'fg:#f0fbff; fs:18; weight:800;',
        summary: 'fg:rgba(190,220,235,0.84);',
        content: 'pt:14;',
      }}
    >
      <p className="text-sm text-slate-300">
        The parent owns `open`, so the section follows external logic and remains predictable for denser product flows.
      </p>
      <ActionGroup gap="sm" className="mt-3">
        <Button tone="brand" size="sm" onClick={() => setOpen(false)}>Close</Button>
        <Button tone="neutral" size="sm" onClick={() => setOpen(true)}>Open</Button>
      </ActionGroup>
    </CollapsiblePanel>
  );
}

function UncontrolledDisclosureExample() {
  return (
    <CollapsiblePanel
      recipe={lazyOptionsRecipe}
      title="Uncontrolled disclosure"
      summary="The panel manages its own local state and lazily mounts heavy content."
      defaultOpen
      actions={<StatusChip tone="info" label="mount" value="lazy" />}
    >
      <p className="text-sm text-slate-300">
        This version keeps closed panels from mounting their content until first open, which cuts hidden DOM and rendering work for denser settings surfaces.
      </p>
    </CollapsiblePanel>
  );
}

function AdvancedSyntaxExample() {
  return (
    <Panel syntax={advancedSpectrumPanelSyntax}>
      <Stack gap="md">
        <HeaderShell
          compact
          eyebrow="Advanced syntax"
          title={<span style={{ backgroundImage: 'linear-gradient(135deg, #f0fbff, #67e8f9)', WebkitBackgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }}>Dynamic color and motion</span>}
          subtitle="Custom syntax now supports token helpers, gradients, ring styling, state visuals, CSS attributes, transitions, filters, grid shorthands, and logic semantics."
          meta={<StatusChip tone="info" label="attr" value="data-preset=spectrum" />}
        />
        <ActionGroup gap="sm">
          <Button
            tone="brand"
            stateSyntax={interactiveOrbitStateSyntax}
            syntax="bg:tone(brand, bg); border:tone(brand, border);"
          >
            Stateful launch
          </Button>
          <Button
            tone="neutral"
            syntax="bg:surface(base); border:tone(info, border); fg:text(soft);"
            stateSyntax={defineStateSyntax({
              hover: 'bg:surface(elevated); border:tone(info, border); translateY:-1;',
              current: 'bg:gradient(135deg, alpha($info-500, 0.22), alpha($brand-500, 0.18)); border:tone(info, border);',
            })}
          >
            Token helpers
          </Button>
        </ActionGroup>
        <CodeBlock
          code={`<Button
  syntax="bg:tone(brand, bg); border:tone(brand, border); radius:radius(control);"
  stateSyntax={{
    hover: 'bg:gradient(135deg, alpha(tone(brand, bg), 0.92), alpha(#38bdf8, 0.88)); translateY:-2;',
    active: 'scale:0.99; translateY:0;',
    focus: 'outlineColor:alpha($brand-500, 0.36); outlineWidth:2; outlineOffset:2;',
    current: 'border:tone(info, border); shadow:shadow(panel);',
  }}
>
  Launch
</Button>`}
        />
      </Stack>
    </Panel>
  );
}

function SelectionLogicExample() {
  const palette = useSelectionState<string>({
    defaultValue: ['aurora'],
    multiple: false,
  });

  return (
    <Panel density="comfortable">
      <Stack gap="md">
        <HeaderShell
          compact
          eyebrow="Logic"
          title="useSelectionState"
          subtitle="Single- and multi-select state can now be centralized instead of rewritten in each toolbar, filter row, and option group."
          meta={<StatusChip tone="success" label="selected" value={palette.firstSelected ?? 'none'} />}
        />
        <Inline wrap gap="sm">
          {paletteOptions.map((entry) => (
            <Button
              key={entry.key}
              tone={palette.isSelected(entry.key) ? 'brand' : 'neutral'}
              syntax={palette.isSelected(entry.key) ? entry.syntax : 'opacity:0.88;'}
              onClick={() => palette.select(entry.key)}
            >
              {entry.label}
            </Button>
          ))}
        </Inline>
      </Stack>
    </Panel>
  );
}

function StepperLogicExample() {
  const stepper = useStepper({
    items: releaseTimeline,
    loop: true,
  });

  return (
    <Panel density="comfortable">
      <Stack gap="md">
        <HeaderShell
          compact
          eyebrow="Logic"
          title="useStepper"
          subtitle="Sequence UIs like onboarding, carousels, setup flows, and repeat frame navigation can reuse one small headless contract."
          meta={<StatusChip tone="brand" label="step" value={`${stepper.index + 1}/${stepper.count}`} />}
        />
        <Panel density="compact" syntax="bg:alpha($neutral-100, 0.08); border:alpha($info, 0.18);">
          <p className="text-sm text-slate-200">{stepper.item}</p>
        </Panel>
        <ActionGroup gap="sm">
          <Button tone="neutral" size="sm" onClick={stepper.previous}>Previous</Button>
          <Button tone="brand" size="sm" onClick={stepper.next}>Next</Button>
        </ActionGroup>
      </Stack>
    </Panel>
  );
}

function AsyncActionExample() {
  const action = useAsyncAction(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return 'ready';
  });

  return (
    <Panel density="comfortable">
      <Stack gap="md">
        <HeaderShell
          compact
          eyebrow="Logic"
          title="useAsyncAction"
          subtitle="Async button and workflow state can now be standardized instead of manually tracking pending, success, and error flags in each screen."
          meta={<StatusChip tone={action.status === 'success' ? 'success' : action.status === 'error' ? 'danger' : 'info'} label="status" value={action.status} />}
        />
        <ActionGroup gap="sm">
          <Button
            tone="brand"
            loading={action.pending}
            onClick={() => {
              void action.run();
            }}
          >
            Run action
          </Button>
          <Button tone="neutral" onClick={action.reset}>Reset</Button>
        </ActionGroup>
      </Stack>
    </Panel>
  );
}

function RovingFocusExample() {
  const roving = useRovingFocus({
    count: rovingTools.length,
    orientation: 'horizontal',
    loop: true,
  });

  return (
    <Panel density="comfortable">
      <Stack gap="md">
        <HeaderShell
          compact
          eyebrow="Logic"
          title="useRovingFocus"
          subtitle="Arrow-key focus management for repeat toolbars, tab rows, segmented controls, and menu-like composites."
          meta={<StatusChip tone="brand" label="index" value={`${roving.index + 1}/${roving.count}`} />}
        />
        <Inline wrap gap="sm" {...roving.getContainerProps({ role: 'toolbar', 'aria-label': 'Roving focus demo toolbar' })}>
          {rovingTools.map((tool, index) => (
            <Button
              key={tool}
              tone={roving.index === index ? 'brand' : 'neutral'}
              stateSyntax={interactiveOrbitStateSyntax}
              syntax={roving.index === index ? 'current:true;' : 'fg:text(soft);'}
              {...roving.getItemProps(index, {
                onClick: () => roving.goTo(index),
              })}
            >
              {tool}
            </Button>
          ))}
        </Inline>
      </Stack>
    </Panel>
  );
}

export function FadhilWebLibShowcase() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_88%_14%,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.14),transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <Panel density="spacious" tone="brand" recipe={launchHeaderRecipe}>
          <HeaderShell
            eyebrow="Internal showcase"
            title="fadhilweblib"
            subtitle="A lightweight, self-authored web library for repeated layout, action, and disclosure patterns."
            meta={<StatusChip tone="brand" label="deps" value="zero external UI" />}
            actions={<Button tone="brand" size="sm">Open spec</Button>}
          />
        </Panel>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel density="comfortable">
            <Stack gap="lg">
              <HeaderShell
                compact
                eyebrow="Library contract"
                title="Import surface"
                subtitle="Use the server-safe entrypoint for visual primitives and the client entrypoint for interactive behavior."
                meta={<StatusChip tone="success" label="mode" value="extractable" />}
              />
              <CodeBlock
                code={`import { Panel, HeaderShell, StatusChip, Stack, Inline } from '@/lib/fadhilweblib';
import { defineRecipe, defineStateSyntax, defineSyntax, mergeRecipes } from '@/lib/fadhilweblib';
import { Button, IconButton, CollapsiblePanel, useDisclosure, useRovingFocus } from '@/lib/fadhilweblib/client';`}
              />
              <Inline wrap gap="sm">
                <StatusChip tone="brand" label="surface" value="server-safe" />
                <StatusChip tone="info" label="surface" value="client-only" />
                <StatusChip tone="warning" label="rule" value="no external UI deps" />
              </Inline>
              <PlaygroundButtonRow />
            </Stack>
          </Panel>

          <Panel density="comfortable">
            <Stack gap="lg">
              <HeaderShell
                compact
                eyebrow="Patterns"
                title="Visual primitives"
                subtitle="Repeatable blocks that keep intent clear while reducing repetitive page code."
              />
              <Inline wrap gap="sm">
                <StatusChip tone="neutral" label="tone" value="neutral" />
                <StatusChip tone="brand" label="tone" value="brand" />
                <StatusChip tone="success" label="tone" value="success" />
                <StatusChip tone="warning" label="tone" value="warning" />
                <StatusChip tone="danger" label="tone" value="danger" />
                <StatusChip tone="info" label="tone" value="info" />
              </Inline>
            </Stack>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel density="comfortable">
            <Stack gap="lg">
              <HeaderShell
                compact
                eyebrow="Structure"
                title="Panel, Stack, Inline, ActionGroup"
                subtitle="These primitives keep repeated layout blocks compact and consistent."
                meta={<StatusChip tone="brand" label="density" value="comfortable" />}
              />
              <Panel density="compact">
                <Stack gap="sm">
                  <HeaderShell
                    compact
                    eyebrow="Nested panel"
                    title="Compact density"
                    subtitle="Useful for dense option groups."
                  />
                  <ActionGroup>
                    <Button tone="brand" size="sm">Save</Button>
                    <Button tone="neutral" size="sm">Cancel</Button>
                  </ActionGroup>
                </Stack>
              </Panel>
              <Inline wrap gap="sm">
                <StatusChip tone="brand" label="stack" value="vertical" />
                <StatusChip tone="info" label="inline" value="horizontal" />
                <StatusChip tone="success" label="group" value="actions" />
              </Inline>
            </Stack>
          </Panel>

          <Panel density="comfortable">
            <Stack gap="lg">
              <HeaderShell
                compact
                eyebrow="Header shell"
                title="Page header pattern"
                subtitle="A reusable header with eyebrow, title, subtitle, meta, and actions."
                meta={<StatusChip tone="info" label="state" value="preview" />}
                actions={<IconButton tone="brand" size="sm" label="Pin header" icon="^" />}
                slotSyntax={{
                  title: 'fg:#f4fdff; fs:20;',
                  subtitle: 'fg:rgba(183,208,220,0.88);',
                }}
              />
              <CodeBlock
                code={`<HeaderShell
  eyebrow="Workspace"
  title="Launch Control"
  subtitle="Shared shell for page headers"
  meta={<StatusChip tone="brand" label="mode" value="live" />}
  actions={<Button tone="brand">Create</Button>}
  syntax="gap:20; py:12; contain:layout paint;"
  slotSyntax={{
    title: 'fg:#f0fbff; fs:20;',
    subtitle: 'fg:rgba(190,220,235,0.82);',
  }}
/>`}
              />
            </Stack>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel density="comfortable">
            <Stack gap="lg">
              <HeaderShell
                compact
                eyebrow="Disclosure"
                title="Uncontrolled usage"
                subtitle="The panel owns its own open state through defaultOpen."
              />
              <UncontrolledDisclosureExample />
            </Stack>
          </Panel>

          <Panel density="comfortable">
            <Stack gap="lg">
              <HeaderShell
                compact
                eyebrow="Disclosure"
                title="Controlled usage"
                subtitle="Parent state drives the disclosure lifecycle."
              />
              <ControlledDisclosureExample />
            </Stack>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <HookDisclosureExample />

          <Panel density="comfortable">
            <Stack gap="lg">
              <HeaderShell
                compact
                eyebrow="API"
                title="Custom syntax and recipes"
                subtitle="`syntax` styles the root element, `slotSyntax` targets internal parts, and `recipe` organizes reusable visual plus logic defaults."
              />
              <CodeBlock
                code={`const heroButtonRecipe = defineRecipe({
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
  }),
  slotSyntax: {
    label: 'tracking:0.02em;',
  },
  attrs: {
    'data-surface': 'hero-button',
  },
});

<Button recipe={heroButtonRecipe}>
  Launch
</Button>

<CollapsiblePanel
  recipe={defineRecipe({
    syntax: 'radius:24; border:rgba(129,140,248,0.32);',
    slotSyntax: {
      title: 'fg:#eef2ff; fs:18;',
      summary: 'fg:rgba(199,210,254,0.78);',
      content: 'pt:14; contentVisibility:auto; containIntrinsicSize:260;',
    },
    logic: {
      tone: 'info',
      presence: 'lazy',
    },
  })}
  title="Options"
  summary="Repeatable collapsible options"
  defaultOpen
>
  <Stack>
    <StatusChip tone="info" label="items" value="3" />
  </Stack>
</CollapsiblePanel>`}
              />
            </Stack>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <AdvancedSyntaxExample />

          <Stack gap="md">
            <SelectionLogicExample />
            <StepperLogicExample />
            <RovingFocusExample />
            <AsyncActionExample />
          </Stack>
        </section>
      </div>
    </main>
  );
}
