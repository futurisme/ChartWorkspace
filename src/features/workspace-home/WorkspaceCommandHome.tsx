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
  Surface,
  ThemeScope,
} from '@/lib/fadhilweblib';
import { Button, Dialog, Drawer, IconButton, Tabs } from '@/lib/fadhilweblib/client';
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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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
          fullWidth
          className={styles.resultButton}
          onClick={() => onOpen(map.id)}
          syntax="justify:between; align:start; border:rgba(148,163,184,0.24); bg:surface(base);"
          slotSyntax={{ label: 'grow:1; textAlign:left;' }}
          trailingVisual={<span className={styles.subtle}>{formatWorkspaceTime(map.updatedAt)}</span>}
        >
          <span className={styles.resultLabel}>
            <span>{map.title}</span>
            <span className={styles.subtle}>#{map.id}</span>
          </span>
        </Button>
      ))}
    </div>
  );
}

type UtilityCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  tone: 'brand' | 'info' | 'success' | 'warning';
  onClick: () => void;
};

function UtilityCard({ eyebrow, title, description, action, tone, onClick }: UtilityCardProps) {
  return (
    <Panel recipe={workspaceTileRecipe}>
      <Stack gap="md">
        <HeaderShell compact eyebrow={eyebrow} title={title} subtitle={description} />
        <ActionGroup gap="sm" wrap>
          <Button tone={tone} onClick={onClick}>
            {action}
          </Button>
        </ActionGroup>
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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

  const recentResults = useMemo(() => searchResults.slice(0, 8), [searchResults]);

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

      const { id } = (await response.json()) as { id: string };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lastMapId', id);
        window.localStorage.setItem('lastMapTitle', mapTitle.trim());
      }
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

  const createStatusNotice = error
    ? { tone: 'danger' as const, title: 'Creation blocked', description: error }
    : isCreating
      ? { tone: 'info' as const, title: 'Creating workspace', description: 'Provisioning a new map and routing the editor session.' }
      : { tone: 'success' as const, title: 'Ready to launch', description: 'Create a new map or resume the last workspace without leaving the deck.' };

  return (
    <ThemeScope as="main" theme="utility" className={styles.shell}>
      <Container maxWidth="xl">
        <Stack gap="lg" className={styles.stack}>
          <Section
            className={styles.hero}
            surface
            recipe={workspaceHeroRecipe}
            eyebrow="ChartWorkspace"
            title="Workspace Command Home"
            description="Create, resume, search, and route into the next editor session from a fully library-driven control surface."
            meta={<StatusChip tone={isCreating ? 'warning' : 'brand'} label="state" value={isCreating ? 'creating' : quickStats.searchState} />}
            actions={(
              <ActionGroup gap="sm" wrap>
                <IconButton icon="::" label="Open recent workspaces" tone="neutral" onClick={() => setIsRecentDrawerOpen(true)} />
                <Button tone="brand" onClick={() => setIsCreateDialogOpen(true)}>
                  New workspace
                </Button>
                <Button tone="neutral" onClick={handleLoadLast} disabled={!lastMapId}>
                  Resume last
                </Button>
              </ActionGroup>
            )}
          >
            <Stack gap="lg">
              <Inline gap="sm" wrap>
                <StatusChip tone="brand" label="launch" value="fadhilweblib" />
                <StatusChip tone="info" label="search" value={searchReady ? 'indexed' : 'warming'} />
                <StatusChip tone={quickStats.hasRecent ? 'success' : 'warning'} label="recent" value={quickStats.hasRecent ? 'available' : 'empty'} />
              </Inline>

              <Grid minItemWidth="10rem" gap="md">
                <Metric label="Search results" value={quickStats.resultsCount} />
                <Metric label="Recent workspace" value={lastMapId ? '1 cached' : 'none'} />
                <Metric label="Create route" value="/api/maps" description="Creates a map and opens `/editor/[id]`." />
                <Metric label="Runtime" value="Client-first" description="Search and resume state stay responsive on mobile." />
              </Grid>

              <Notice
                tone={createStatusNotice.tone}
                title={createStatusNotice.title}
                description={createStatusNotice.description}
                actions={(
                  <ActionGroup gap="sm" wrap>
                    <Button recipe={workspaceButtonRecipe} onClick={() => setIsCreateDialogOpen(true)}>
                      Open create dialog
                    </Button>
                    <Button recipe={workspaceButtonRecipe} onClick={() => setIsRecentDrawerOpen(true)}>
                      Browse recent
                    </Button>
                  </ActionGroup>
                )}
              />
            </Stack>
          </Section>

          <Tabs
            tone="info"
            keepMounted={false}
            items={[
              {
                value: 'launch',
                label: 'Launch',
                content: (
                  <Grid minItemWidth="16rem" gap="md">
                    <Panel recipe={workspacePanelRecipe}>
                      <Stack gap="md">
                        <HeaderShell
                          compact
                          eyebrow="Launch"
                          title="Create or resume"
                          subtitle="Keep the primary workflow compact, direct, and easy to repeat on mobile."
                        />
                        <KeyValueList
                          items={[
                            { label: 'Last workspace', value: lastMapTitle || 'No recent workspace' },
                            { label: 'Last id', value: lastMapId ?? 'Unavailable' },
                            { label: 'Search mode', value: searchReady ? 'Ready' : 'Preparing index' },
                            { label: 'Map title draft', value: mapTitle || 'Untitled' },
                          ]}
                        />
                        <ActionGroup gap="sm" wrap>
                          <Button tone="brand" onClick={() => setIsCreateDialogOpen(true)}>
                            Create workspace
                          </Button>
                          <Button recipe={workspaceButtonRecipe} onClick={handleLoadLast} disabled={!lastMapId}>
                            Resume cached
                          </Button>
                        </ActionGroup>
                      </Stack>
                    </Panel>

                    <Panel recipe={workspacePanelRecipe}>
                      <Stack gap="md">
                        <HeaderShell
                          compact
                          eyebrow="Shortcuts"
                          title="Utility routing"
                          subtitle="Jump into adjacent tools without leaving the workspace shell."
                        />
                        <div className={styles.utilityGrid}>
                          <UtilityCard
                            eyebrow="Archive"
                            title="FadhilLabEncrypt"
                            description="Open the archive laboratory beta surface."
                            action="Open archive lab"
                            tone="info"
                            onClick={() => router.push('/archive-lab')}
                          />
                          <UtilityCard
                            eyebrow="Ideas"
                            title="FeatureLib"
                            description="Browse game and feature ideas in the shared library."
                            action="Open FeatureLib"
                            tone="success"
                            onClick={() => router.push('/game-ideas')}
                          />
                          <UtilityCard
                            eyebrow="Play"
                            title="Game deck"
                            description="Jump into the `/game` command deck from the workspace home."
                            action="Open /game"
                            tone="warning"
                            onClick={() => router.push('/game')}
                          />
                          <UtilityCard
                            eyebrow="Library"
                            title="fadhilweblib showcase"
                            description="Inspect the component library showcase route."
                            action="Open showcase"
                            tone="brand"
                            onClick={() => router.push('/fadhilweblib')}
                          />
                        </div>
                      </Stack>
                    </Panel>
                  </Grid>
                ),
              },
              {
                value: 'search',
                label: 'Search',
                badge: String(quickStats.resultsCount),
                content: (
                  <Panel recipe={workspacePanelRecipe}>
                    <Stack gap="md">
                      <HeaderShell
                        compact
                        eyebrow="Search"
                        title="Workspace index"
                        subtitle={searchReady ? 'Search by title and open a result directly into the editor.' : 'Preparing the local search index.'}
                      />
                      <Field htmlFor="workspace-search" label="Find a workspace" description="Leave the query empty to browse recent matches from the API.">
                        <Input
                          id="workspace-search"
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search by title..."
                        />
                      </Field>
                      {searchError ? <Notice tone="danger" title="Search error" description={searchError} /> : null}
                      {searchReady && isSearching ? (
                        <Notice tone="info" title="Searching" description="Fetching workspace results..." />
                      ) : null}
                      {!searchError && !isSearching ? (
                        <WorkspaceResultList
                          results={searchResults}
                          onOpen={openWorkspace}
                          emptyTitle="No workspace found"
                          emptyDescription="Try a different title fragment or create a new workspace from the launch tab."
                        />
                      ) : null}
                    </Stack>
                  </Panel>
                ),
              },
              {
                value: 'recent',
                label: 'Recent',
                content: (
                  <Grid minItemWidth="16rem" gap="md">
                    <Panel recipe={workspacePanelRecipe}>
                      <Stack gap="md">
                        <HeaderShell
                          compact
                          eyebrow="Recent"
                          title={lastMapTitle || 'No cached workspace'}
                          subtitle={lastMapId ? `Last known workspace id #${lastMapId}` : 'The most recent workspace will appear here after an editor session is stored locally.'}
                        />
                        <ActionGroup gap="sm" wrap>
                          <Button tone="brand" onClick={handleLoadLast} disabled={!lastMapId}>
                            Resume last workspace
                          </Button>
                          <Button recipe={workspaceButtonRecipe} onClick={() => setIsRecentDrawerOpen(true)}>
                            Open recent drawer
                          </Button>
                        </ActionGroup>
                      </Stack>
                    </Panel>

                    <Panel recipe={workspacePanelRecipe}>
                      <Stack gap="md">
                        <HeaderShell
                          compact
                          eyebrow="Results"
                          title="Recent workspace list"
                          subtitle="A compact list of the latest results currently loaded by the search hook."
                        />
                        <WorkspaceResultList
                          results={recentResults}
                          onOpen={openWorkspace}
                          emptyTitle="No recent workspaces"
                          emptyDescription="Open the search tab or create a new workspace to seed the recent list."
                        />
                      </Stack>
                    </Panel>
                  </Grid>
                ),
              },
              {
                value: 'overview',
                label: 'Overview',
                content: (
                  <Grid minItemWidth="16rem" gap="md">
                    <Panel recipe={workspacePanelRecipe}>
                      <Stack gap="md">
                        <HeaderShell
                          compact
                          eyebrow="Overview"
                          title="Workspace system state"
                          subtitle="A compact snapshot of the route without dropping into the editor."
                        />
                        <KeyValueList
                          items={[
                            { label: 'Search ready', value: searchReady ? 'Yes' : 'No' },
                            { label: 'Search query', value: searchQuery || 'Recent listing' },
                            { label: 'Recent id', value: lastMapId ?? 'Unavailable' },
                            { label: 'Recent title', value: lastMapTitle ?? 'Unavailable' },
                          ]}
                        />
                      </Stack>
                    </Panel>

                    <Panel recipe={workspacePanelRecipe}>
                      <Stack gap="md">
                        <HeaderShell
                          compact
                          eyebrow="Flow"
                          title="Workflow lanes"
                          subtitle="The route now uses library-native sections, panels, tabs, drawers, and dialogs instead of raw layout classes."
                        />
                        <Inline gap="sm" wrap>
                          <StatusChip tone="brand" label="shell" value="ThemeScope" />
                          <StatusChip tone="info" label="navigation" value="Tabs" />
                          <StatusChip tone="success" label="dialogs" value="Dialog + Drawer" />
                          <StatusChip tone="warning" label="density" value="compact" />
                        </Inline>
                      </Stack>
                    </Panel>
                  </Grid>
                ),
              },
            ]}
            defaultValue="launch"
          />

          <Surface variant="elevated" density="compact" className={styles.stickyDock}>
            <div className={styles.dockRow}>
              <Button tone="brand" onClick={() => setIsCreateDialogOpen(true)}>
                Create
              </Button>
              <Button tone="neutral" onClick={handleLoadLast} disabled={!lastMapId}>
                Resume
              </Button>
              <Button tone="info" onClick={() => setIsRecentDrawerOpen(true)}>
                Recent
              </Button>
            </div>
          </Surface>
        </Stack>
      </Container>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create a new workspace"
        description="Provision a new map and route directly into the editor session."
        size="md"
      >
        <form onSubmit={handleCreate}>
          <Stack gap="lg">
            <Field
              htmlFor="workspace-title"
              label="Map title"
              description="Use a concrete title so the next editor session stays easy to identify."
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
            <Notice
              tone={createStatusNotice.tone}
              title={createStatusNotice.title}
              description={createStatusNotice.description}
            />
            <ActionGroup gap="sm" wrap>
              <Button type="submit" tone="brand" loading={isCreating}>
                {isCreating ? 'Creating...' : 'Open new editor'}
              </Button>
              <Button type="button" recipe={workspaceButtonRecipe} onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
            </ActionGroup>
          </Stack>
        </form>
      </Dialog>

      <Drawer
        open={isRecentDrawerOpen}
        onOpenChange={setIsRecentDrawerOpen}
        title="Recent workspaces"
        description="Quick access to cached and recently searched workspaces."
        side="right"
        width="24rem"
      >
        <Stack gap="lg">
          <Panel recipe={workspaceTileRecipe}>
            <Stack gap="md">
              <HeaderShell
                compact
                eyebrow="Cached"
                title={lastMapTitle || 'No cached workspace'}
                subtitle={lastMapId ? `Workspace #${lastMapId}` : 'No workspace id is stored locally yet.'}
              />
              <ActionGroup gap="sm" wrap>
                <Button tone="brand" onClick={handleLoadLast} disabled={!lastMapId}>
                  Resume cached
                </Button>
              </ActionGroup>
            </Stack>
          </Panel>

          <Panel recipe={workspaceTileRecipe}>
            <Stack gap="md">
              <HeaderShell
                compact
                eyebrow="Results"
                title="Open a workspace"
                subtitle="The drawer mirrors the latest search results so you can resume quickly."
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
