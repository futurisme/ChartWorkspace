'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
  Metric,
  Notice,
  Panel,
  Section,
  Stack,
  StatusChip,
  ThemeScope,
} from '@/lib/fadhilweblib';
import { Button, Drawer, IconButton } from '@/lib/fadhilweblib/client';
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
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
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
        <Button tone={tone} size="sm" onClick={onClick}>
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
      <Container maxWidth="sm" className={styles.container}>
        <Stack gap="md" className={styles.pageStack}>
          <Section
            className={styles.heroSection}
            surface
            density="compact"
            recipe={workspaceHeroRecipe}
            eyebrow="/workspace"
            title="Launch Control"
            description="Mobile-first workspace home."
            meta={<StatusChip tone={isCreating ? 'warning' : 'brand'} label="state" value={isCreating ? 'creating' : quickStats.searchState} />}
            actions={(
              <ActionGroup gap="xs" wrap>
                <IconButton
                  icon="::"
                  label="Browse recent workspaces"
                  tone="neutral"
                  size="sm"
                  onClick={() => setIsRecentDrawerOpen(true)}
                />
                <Button tone="brand" size="sm" onClick={() => focusInput('workspace-title')}>
                  New
                </Button>
                <Button tone="neutral" size="sm" onClick={handleLoadLast} disabled={!lastMapId}>
                  Resume
                </Button>
              </ActionGroup>
            )}
          >
            <Stack gap="md">
              <Inline gap="xs" wrap>
                <StatusChip tone="brand" label="launch" value="fast" />
                <StatusChip tone="info" label="mobile" value="compact" />
                <StatusChip tone={quickStats.hasRecent ? 'success' : 'warning'} label="recent" value={quickStats.hasRecent ? 'ready' : 'empty'} />
              </Inline>

              <Grid minItemWidth="7.5rem" gap="sm" className={styles.metricGrid}>
                <Metric label="Results" value={quickStats.resultsCount} />
                <Metric label="Recent" value={lastMapId ? '1 cached' : 'none'} />
                <Metric label="Create" value="/api/maps" />
                <Metric label="Runtime" value="Client" />
              </Grid>
            </Stack>
          </Section>

          <Panel recipe={workspacePanelRecipe} className={styles.formPanel}>
            <Stack gap="sm">
              <HeaderShell
                compact
                eyebrow="Create"
                title="New workspace"
                subtitle="Direct launch lane for Android."
              />
              <form onSubmit={handleCreate}>
                <Stack gap="sm">
                  <Field
                    htmlFor="workspace-title"
                    label="Map name"
                    description="Keep the title short and clear."
                    required
                  >
                    <Input
                      id="workspace-title"
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
                    />
                  ) : null}

                  <Grid minItemWidth="8.25rem" gap="sm" className={styles.actionGrid}>
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
                    <Button
                      type="button"
                      tone="info"
                      size="sm"
                      fullWidth
                      onClick={() => setIsRecentDrawerOpen(true)}
                    >
                      Recent list
                    </Button>
                    <Button
                      type="button"
                      tone="success"
                      size="sm"
                      fullWidth
                      onClick={() => focusInput('workspace-search')}
                    >
                      Find map
                    </Button>
                  </Grid>

                  {lastMapId ? (
                    <Inline gap="xs" wrap className={styles.inlineMeta}>
                      <span>Last:</span>
                      <span>{lastMapTitle || 'Untitled Map'}</span>
                      <span>(#{lastMapId})</span>
                    </Inline>
                  ) : null}
                </Stack>
              </form>
            </Stack>
          </Panel>

          <Section
            className={styles.searchSection}
            surface
            density="compact"
            recipe={workspacePanelRecipe}
            eyebrow="Search"
            title="Workspace Search"
            description={searchReady ? 'Fast local lookup.' : 'Index warming up.'}
            meta={<StatusChip tone="info" label="top" value={String(quickStats.resultsCount)} />}
          >
            <Stack gap="sm">
              <Field
                htmlFor="workspace-search"
                label="Find a workspace"
                description="Search by title and open it directly."
              >
                <Input
                  id="workspace-search"
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
                />
              ) : null}

              {!searchError && !isSearching && searchReady ? (
                <WorkspaceResultList
                  results={searchResults}
                  onOpen={openWorkspace}
                  emptyTitle="No workspace found"
                  emptyDescription="Try a different title fragment or create a new workspace above."
                />
              ) : null}
            </Stack>
          </Section>

          <Panel recipe={workspaceTileRecipe} className={styles.resumePanel}>
            <Stack gap="sm">
              <HeaderShell
                compact
                eyebrow="Resume"
                title={lastMapTitle || 'No cached workspace'}
                subtitle={lastMapId ? `Workspace #${lastMapId}` : 'The next cached workspace will appear here.'}
              />
              <KeyValueList
                items={[
                  { label: 'Cached id', value: lastMapId ?? 'Unavailable' },
                  { label: 'Search state', value: quickStats.searchState },
                  { label: 'Results', value: `${recentResults.length} loaded` },
                ]}
              />
              <ActionGroup gap="xs" wrap>
                <Button tone="brand" size="sm" onClick={handleLoadLast} disabled={!lastMapId}>
                  Resume last
                </Button>
                <Button tone="info" size="sm" onClick={() => setIsRecentDrawerOpen(true)}>
                  Recent list
                </Button>
                <Button recipe={workspaceButtonRecipe} onClick={() => router.push('/fadhilweblib')}>
                  Showcase
                </Button>
              </ActionGroup>
            </Stack>
          </Panel>

          <Panel recipe={workspacePanelRecipe} className={styles.toolsPanel}>
            <Stack gap="sm">
              <HeaderShell
                compact
                eyebrow="Tools"
                title="Quick routes"
                subtitle="Small utility jumps."
              />
              <Grid minItemWidth="8rem" gap="sm">
                <CompactRouteTile title="Archive Lab" action="Open" tone="info" onClick={() => router.push('/archive-lab')} />
                <CompactRouteTile title="FeatureLib" action="Open" tone="success" onClick={() => router.push('/game-ideas')} />
                <CompactRouteTile title="Game Deck" action="Open" tone="warning" onClick={() => router.push('/game')} />
                <CompactRouteTile title="fadhilweblib" action="Open" tone="brand" onClick={() => router.push('/fadhilweblib')} />
              </Grid>
            </Stack>
          </Panel>
        </Stack>
      </Container>

      <Drawer
        open={isRecentDrawerOpen}
        onOpenChange={setIsRecentDrawerOpen}
        title="Recent workspaces"
        description="Quick access to the cached workspace and the latest search results."
        side="right"
        width="min(100vw, 20rem)"
      >
        <Stack gap="md">
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
                <Button recipe={workspaceButtonRecipe} onClick={() => focusInput('workspace-title')}>
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
