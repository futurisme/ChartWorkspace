'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ActionGroup,
  Container,
  EmptyState,
  Field,
  Grid,
  HeaderShell,
  Inline,
  Input,
  KeyValueList,
  Notice,
  Panel,
  Section,
  Stack,
  StatusChip,
  ThemeScope,
} from '@/lib/fadhilweblib';
import { Button, CollapsiblePanel, Drawer, IconButton, SegmentedControl } from '@/lib/fadhilweblib/client';
import { useWorkspaceSearch } from './use-workspace-search';
import type { MapSearchItem } from './types';
import {
  workspaceButtonRecipe,
  workspaceHeroRecipe,
  workspacePanelRecipe,
  workspaceTileRecipe,
} from './workspace-home-recipes';
import styles from './workspace-command-home.module.css';

function formatWorkspaceTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function focusInput(inputId: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const element = document.getElementById(inputId);
  if (element instanceof HTMLElement) {
    element.focus();
  }
}

function focusInputSoon(inputId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.setTimeout(() => focusInput(inputId), 24);
}

type WorkspaceLane = 'launch' | 'search' | 'routes';

const compactEmptyStateSlotSyntax = {
  title: 'fontSize:0.88rem;',
  description: 'fontSize:0.74rem;',
} as const;

const compactDisclosureSlotSyntax = {
  header: 'px:14; pt:12;',
  trigger: 'pb:12;',
  title: 'fontSize:0.9rem;',
  summary: 'fontSize:0.74rem;',
  indicator: 'w:2rem; h:2rem;',
  content: 'px:14; pb:14;',
} as const;

const compactDrawerSlotSyntax = {
  header: 'pt:12; px:12; pb:10;',
  title: 'fontSize:0.95rem;',
  description: 'fontSize:0.74rem;',
  body: 'px:12; pb:12;',
  close: 'w:2rem; h:2rem;',
} as const;

type WorkspaceResultListProps = {
  results: MapSearchItem[];
  onOpen: (mapId: string) => void;
  emptyTitle: string;
  emptyDescription: string;
};

function WorkspaceResultList({
  results,
  onOpen,
  emptyTitle,
  emptyDescription,
}: WorkspaceResultListProps) {
  if (results.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        syntax="p:12; radius:16;"
        slotSyntax={compactEmptyStateSlotSyntax}
      />
    );
  }

  return (
    <div className={styles.resultStack}>
      {results.map((map) => (
        <Button
          key={map.id}
          type="button"
          tone="neutral"
          size="sm"
          fullWidth
          className={styles.resultButton}
          onClick={() => onOpen(map.id)}
          syntax="justify:between; align:start; border:rgba(148,163,184,0.22); bg:surface(base);"
          slotSyntax={{ label: 'grow:1; textAlign:left;' }}
          trailingVisual={<span className={styles.resultMeta}>{formatWorkspaceTime(map.updatedAt)}</span>}
        >
          <span className={styles.resultLabel}>
            <span className={styles.resultTitle}>{map.title}</span>
            <span className={styles.resultMeta}>#{map.id}</span>
          </span>
        </Button>
      ))}
    </div>
  );
}

type WorkspaceSignalProps = {
  label: string;
  value: ReactNode;
  hint: string;
};

function WorkspaceSignal({ label, value, hint }: WorkspaceSignalProps) {
  return (
    <div className={styles.signalCard}>
      <span className={styles.signalLabel}>{label}</span>
      <span className={styles.signalValue}>{value}</span>
      <span className={styles.signalHint}>{hint}</span>
    </div>
  );
}

type CompactRouteTileProps = {
  title: string;
  action: string;
  tone: 'brand' | 'info' | 'success' | 'warning';
  onClick: () => void;
};

function CompactRouteTile({ title, action, tone, onClick }: CompactRouteTileProps) {
  return (
    <Panel recipe={workspaceTileRecipe} className={styles.utilityTile}>
      <Stack gap="sm">
        <HeaderShell compact title={title} />
        <Button tone={tone} size="xs" fullWidth onClick={onClick}>
          {action}
        </Button>
      </Stack>
    </Panel>
  );
}

export function WorkspaceCommandHome() {
  const router = useRouter();
  const [mapTitle, setMapTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [lastMapId, setLastMapId] = useState<string | null>(null);
  const [lastMapTitle, setLastMapTitle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecentDrawerOpen, setIsRecentDrawerOpen] = useState(false);
  const [activeLane, setActiveLane] = useState<WorkspaceLane>('launch');

  const { searchResults, isSearching, searchError, searchReady } = useWorkspaceSearch(searchQuery);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setLastMapId(window.localStorage.getItem('lastMapId'));
    setLastMapTitle(window.localStorage.getItem('lastMapTitle'));
  }, []);

  const quickStats = useMemo(() => {
    const hasRecent = Boolean(lastMapId);
    return {
      hasRecent,
      resultsCount: searchResults.length,
      searchState: searchReady ? (isSearching ? 'searching' : 'ready') : 'warming',
    };
  }, [isSearching, lastMapId, searchReady, searchResults.length]);

  const recentResults = useMemo(() => searchResults.slice(0, 6), [searchResults]);
  const laneDescription = activeLane === 'launch'
    ? 'One-thumb create and resume flow sized for Android browsers.'
    : activeLane === 'search'
      ? 'Results stay inside a capped card so the page does not keep stretching downward.'
      : 'Secondary routes and recent hits stay tucked away until needed.';

  const openLaunchLane = () => {
    setActiveLane('launch');
    focusInputSoon('workspace-title');
  };

  const openSearchLane = () => {
    setActiveLane('search');
    focusInputSoon('workspace-search');
  };

  const openWorkspace = (mapId: string) => {
    router.push(`/editor/${mapId}`);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!mapTitle.trim()) {
      setError('Please enter a map title.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: mapTitle.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create map.');
      }

      const nextTitle = mapTitle.trim();
      const { id } = (await response.json()) as { id: string };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lastMapId', id);
        window.localStorage.setItem('lastMapTitle', nextTitle);
      }

      setLastMapId(id);
      setLastMapTitle(nextTitle);
      router.push(`/editor/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create map.');
      setIsCreating(false);
    }
  };

  const handleLoadLast = () => {
    if (!lastMapId) {
      return;
    }

    router.push(`/editor/${lastMapId}`);
  };

  const createNotice = error
    ? {
        tone: 'danger' as const,
        title: 'Creation blocked',
        description: error,
      }
    : isCreating
      ? {
          tone: 'info' as const,
          title: 'Creating workspace',
          description: 'Provisioning the map and opening the editor.',
        }
      : null;

  const searchNotice = searchError
    ? {
        tone: 'danger' as const,
        title: 'Search error',
        description: searchError,
      }
    : !searchReady
      ? {
          tone: 'warning' as const,
          title: 'Preparing search',
          description: 'The workspace index is warming up.',
        }
      : isSearching
        ? {
            tone: 'info' as const,
            title: 'Loading results',
            description: 'Fetching the latest workspace matches.',
          }
        : null;

  return (
    <ThemeScope as="main" theme="game" className={styles.shell}>
      <Container maxWidth="26rem" className={styles.container}>
        <Stack gap="md" className={styles.pageStack}>
          <Section
            className={styles.heroSection}
            surface
            density="compact"
            recipe={workspaceHeroRecipe}
            eyebrow="/workspace"
            title="Android Workspace Deck"
            description={laneDescription}
            meta={<StatusChip tone={isCreating ? 'warning' : 'brand'} label="lane" value={activeLane} />}
            actions={(
              <IconButton
                icon="::"
                label="Browse recent workspaces"
                tone="neutral"
                size="xs"
                onClick={() => setIsRecentDrawerOpen(true)}
              />
            )}
          >
            <Stack gap="sm">
              <SegmentedControl
                value={activeLane}
                onValueChange={(value) => setActiveLane(value as WorkspaceLane)}
                fullWidth
                className={styles.laneSwitch}
                items={[
                  { value: 'launch', label: 'Launch' },
                  { value: 'search', label: 'Search' },
                  { value: 'routes', label: 'Routes' },
                ]}
              />

              <div className={styles.signalGrid}>
                <WorkspaceSignal
                  label="Index"
                  value={quickStats.searchState}
                  hint={searchReady ? 'live' : 'warming'}
                />
                <WorkspaceSignal
                  label="Results"
                  value={quickStats.resultsCount}
                  hint={quickStats.resultsCount > 0 ? 'ready' : 'idle'}
                />
                <WorkspaceSignal
                  label="Cache"
                  value={lastMapId ? `#${lastMapId}` : 'empty'}
                  hint={quickStats.hasRecent ? 'resume' : 'new'}
                />
              </div>

              <Inline gap="xs" wrap className={styles.heroStatusRow}>
                <StatusChip tone="brand" label="viewport" value="android" />
                <StatusChip tone="info" label="stack" value="1 lane" />
                <StatusChip tone={quickStats.hasRecent ? 'success' : 'warning'} label="recent" value={quickStats.hasRecent ? 'ready' : 'empty'} />
              </Inline>
            </Stack>
          </Section>

          {activeLane === 'launch' ? (
            <Panel recipe={workspacePanelRecipe} className={styles.formPanel}>
              <Stack gap="sm">
                <HeaderShell
                  compact
                  eyebrow="Launch"
                  title="Create or resume"
                  subtitle="Short flow for a narrow Android screen."
                />
                <form onSubmit={handleCreate}>
                  <Stack gap="sm">
                    <Field
                      htmlFor="workspace-title"
                      label="Map name"
                      description="Short titles stay readable on phone."
                      required
                    >
                      <Input
                        id="workspace-title"
                        size="sm"
                        value={mapTitle}
                        onChange={(event) => {
                          setMapTitle(event.target.value);
                          setError('');
                        }}
                        placeholder="National Strategy 2040"
                      />
                    </Field>

                    {createNotice ? (
                      <Notice
                        tone={createNotice.tone}
                        title={createNotice.title}
                        description={createNotice.description}
                        syntax="p:12; radius:16;"
                      />
                    ) : null}

                    <div className={styles.primaryActions}>
                      <Button
                        type="submit"
                        tone="brand"
                        size="sm"
                        fullWidth
                        loading={isCreating}
                      >
                        {isCreating ? 'Creating...' : 'Open editor'}
                      </Button>
                      <Button
                        type="button"
                        tone="neutral"
                        size="sm"
                        fullWidth
                        disabled={!lastMapId}
                        onClick={handleLoadLast}
                      >
                        Resume last
                      </Button>
                    </div>

                    <div className={styles.secondaryActions}>
                      <Button
                        type="button"
                        tone="info"
                        size="xs"
                        fullWidth
                        onClick={() => setIsRecentDrawerOpen(true)}
                      >
                        Recent list
                      </Button>
                      <Button
                        type="button"
                        tone="success"
                        size="xs"
                        fullWidth
                        onClick={openSearchLane}
                      >
                        Find map
                      </Button>
                    </div>

                    {lastMapId ? (
                      <Inline gap="xs" wrap className={styles.inlineMeta}>
                        <span>Cached</span>
                        <span>{lastMapTitle || 'Untitled Map'}</span>
                        <span>#{lastMapId}</span>
                      </Inline>
                    ) : null}
                  </Stack>
                </form>
              </Stack>
            </Panel>
          ) : null}

          {activeLane === 'search' ? (
            <Section
              className={styles.searchSection}
              surface
              density="compact"
              recipe={workspacePanelRecipe}
              eyebrow="Search"
              title="Workspace search"
              description={searchReady ? 'Results scroll inside the card.' : 'Index warming up.'}
              meta={<StatusChip tone="info" label="hits" value={String(quickStats.resultsCount)} />}
            >
              <Stack gap="sm">
                <Field
                  htmlFor="workspace-search"
                  label="Find a workspace"
                  description="Search by title and open it directly."
                >
                  <Input
                    id="workspace-search"
                    size="sm"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by title..."
                  />
                </Field>

                {searchNotice ? (
                  <Notice
                    tone={searchNotice.tone}
                    title={searchNotice.title}
                    description={searchNotice.description}
                    syntax="p:12; radius:16;"
                  />
                ) : null}

                {!searchError && !isSearching && searchReady ? (
                  <WorkspaceResultList
                    results={searchResults}
                    onOpen={openWorkspace}
                    emptyTitle="No workspace found"
                    emptyDescription="Try a different title fragment or switch back to create mode."
                  />
                ) : null}

                <div className={styles.secondaryActions}>
                  <Button type="button" tone="neutral" size="xs" fullWidth onClick={openLaunchLane}>
                    New map
                  </Button>
                  <Button type="button" tone="info" size="xs" fullWidth onClick={() => setIsRecentDrawerOpen(true)}>
                    Recent drawer
                  </Button>
                </div>
              </Stack>
            </Section>
          ) : null}

          {activeLane === 'routes' ? (
            <Stack gap="sm" className={styles.routesStack}>
              <Panel recipe={workspaceTileRecipe} className={styles.resumePanel}>
                <Stack gap="sm">
                  <HeaderShell
                    compact
                    eyebrow="Cached"
                    title={lastMapTitle || 'No cached workspace'}
                    subtitle={lastMapId ? `Workspace #${lastMapId}` : 'The next cached workspace appears here.'}
                  />
                  <KeyValueList
                    items={[
                      { label: 'Cached id', value: lastMapId ?? 'Unavailable' },
                      { label: 'Search state', value: quickStats.searchState },
                      { label: 'Results', value: `${recentResults.length} loaded` },
                    ]}
                  />
                  <div className={styles.primaryActions}>
                    <Button tone="brand" size="sm" fullWidth onClick={handleLoadLast} disabled={!lastMapId}>
                      Resume cached
                    </Button>
                    <Button tone="neutral" size="sm" fullWidth onClick={() => setIsRecentDrawerOpen(true)}>
                      Recent list
                    </Button>
                  </div>
                </Stack>
              </Panel>

              <CollapsiblePanel
                className={styles.collapsiblePanel}
                title="Quick routes"
                summary="Archive Lab, FeatureLib, Game Deck, and fadhilweblib."
                tone="info"
                defaultOpen
                syntax="bg:surface(elevated); border:rgba(129,140,248,0.18); shadow:0 10px 28px rgba(2,8,23,0.24); radius:18; backdrop:blur(12px);"
                slotSyntax={compactDisclosureSlotSyntax}
              >
                <Grid minItemWidth="7rem" gap="sm">
                  <CompactRouteTile title="Archive Lab" action="Open" tone="info" onClick={() => router.push('/archive-lab')} />
                  <CompactRouteTile title="FeatureLib" action="Open" tone="success" onClick={() => router.push('/game-ideas')} />
                  <CompactRouteTile title="Game Deck" action="Open" tone="warning" onClick={() => router.push('/game')} />
                  <CompactRouteTile title="fadhilweblib" action="Open" tone="brand" onClick={() => router.push('/fadhilweblib')} />
                </Grid>
              </CollapsiblePanel>

              <CollapsiblePanel
                className={styles.collapsiblePanel}
                title="Latest hits"
                summary="Cached workspace plus the latest search matches."
                tone="brand"
                defaultOpen={Boolean(recentResults.length)}
                syntax="bg:surface(elevated); border:rgba(34,211,238,0.18); shadow:0 10px 28px rgba(2,8,23,0.24); radius:18; backdrop:blur(12px);"
                slotSyntax={compactDisclosureSlotSyntax}
              >
                <Stack gap="sm">
                  <WorkspaceResultList
                    results={recentResults}
                    onOpen={openWorkspace}
                    emptyTitle="No recent hits"
                    emptyDescription="Search results will appear here once the local index is ready."
                  />
                  <div className={styles.secondaryActions}>
                    <Button type="button" tone="neutral" size="xs" fullWidth onClick={openLaunchLane}>
                      New map
                    </Button>
                    <Button type="button" tone="success" size="xs" fullWidth onClick={openSearchLane}>
                      Search lane
                    </Button>
                  </div>
                </Stack>
              </CollapsiblePanel>
            </Stack>
          ) : null}
        </Stack>
      </Container>

      <Drawer
        open={isRecentDrawerOpen}
        onOpenChange={setIsRecentDrawerOpen}
        title="Recent workspaces"
        description="Quick access to the cached workspace and the latest search results."
        side="right"
        width="min(100vw, 18.75rem)"
        slotSyntax={compactDrawerSlotSyntax}
      >
        <Stack gap="sm" className={styles.drawerStack}>
          <Panel recipe={workspaceTileRecipe}>
            <Stack gap="sm">
              <HeaderShell
                compact
                eyebrow="Cached"
                title={lastMapTitle || 'No cached workspace'}
                subtitle={lastMapId ? `Workspace #${lastMapId}` : 'No workspace id stored locally yet.'}
              />
              <ActionGroup gap="xs" wrap>
                <Button tone="brand" size="sm" onClick={handleLoadLast} disabled={!lastMapId}>
                  Resume cached
                </Button>
                <Button
                  recipe={workspaceButtonRecipe}
                  onClick={() => {
                    setIsRecentDrawerOpen(false);
                    openLaunchLane();
                  }}
                >
                  New
                </Button>
              </ActionGroup>
            </Stack>
          </Panel>

          <Panel recipe={workspaceTileRecipe}>
            <Stack gap="sm">
              <HeaderShell
                compact
                eyebrow="Results"
                title="Open a workspace"
                subtitle="The drawer mirrors the latest search results."
              />
              <WorkspaceResultList
                results={recentResults}
                onOpen={(mapId) => {
                  setIsRecentDrawerOpen(false);
                  openWorkspace(mapId);
                }}
                emptyTitle="No workspaces loaded"
                emptyDescription="Search results will appear here after the route index finishes loading."
              />
            </Stack>
          </Panel>
        </Stack>
      </Drawer>
    </ThemeScope>
  );
}
