'use client';

import {
  ActionGroup,
  EmptyState,
  Field,
  HeaderShell,
  Input,
  Inline,
  KeyValueList,
  Metric,
  Notice,
  Panel,
  Section,
  Stack,
  StatusChip,
} from '@/lib/fadhilweblib';
import { Button, SegmentedControl } from '@/lib/fadhilweblib/client';
import type { GameCommandDeckController } from './controller';
import { deckPanelRecipe, deckSectionRecipe, densePanelRecipe, utilityButtonRecipe } from './recipes';
import styles from './game-command-deck.module.css';

type IntelDeskProps = {
  controller: GameCommandDeckController;
};

function NewsView({ controller }: { controller: GameCommandDeckController }) {
  return (
    <Panel recipe={deckPanelRecipe}>
      <Stack gap="md">
        <HeaderShell compact eyebrow="News" title="Market feed" subtitle="Generated activity, translated into compact English cards." />
        {controller.newsItems.length > 0 ? (
          <div className={styles.cardList}>
            {controller.newsItems.map((item) => (
              <Panel key={item.id} recipe={densePanelRecipe}>
                <Stack gap="sm">
                  <Inline gap="sm" wrap>
                    <StatusChip tone="info" label="category" value={item.label} />
                    <StatusChip tone="neutral" label="company" value={item.companyName} />
                  </Inline>
                  <div className={styles.subtleText}>{item.entry}</div>
                </Stack>
              </Panel>
            ))}
          </div>
        ) : (
          <EmptyState title="No feed items yet" description="The activity feed will populate after trades, releases, governance events, or company actions." />
        )}
      </Stack>
    </Panel>
  );
}

function ReleasesView({ controller }: { controller: GameCommandDeckController }) {
  return (
    <Stack gap="lg">
      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Releases" title="Release browser" subtitle="Select a release card, then drill into communities or partner shelves." />
          {controller.focusedGameReleaseCards.length > 0 ? (
            <div className={styles.cardList}>
              {controller.focusedGameReleaseCards.map((release) => (
                <Button key={release.id} recipe={utilityButtonRecipe} fullWidth className={styles.companyButton} onClick={() => controller.setSelectedGameReleaseId(release.id)}>
                  {release.name} | {release.genre} | {controller.formatters.formatNumber(release.popularity, 1)}%
                </Button>
              ))}
            </div>
          ) : (
            <EmptyState title="No release cards" description="Release cards appear once a game or software catalog is active." />
          )}
        </Stack>
      </Panel>

      {controller.selectedGameRelease ? (
        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <Metric label={controller.selectedGameRelease.name} value={controller.selectedGameRelease.genre} description={`Released ${controller.selectedGameRelease.releaseDate}`} />
            <ActionGroup gap="sm" wrap>
              {controller.selectedGameCommunities.map((community) => (
                <Button key={community.id} recipe={utilityButtonRecipe} onClick={() => controller.setSelectedGameCommunityId(community.id)}>
                  {community.name}
                </Button>
              ))}
            </ActionGroup>
          </Stack>
        </Panel>
      ) : null}

      {controller.focusedCompany?.field === 'software' && controller.focusedCompany.softwareSpecialization === 'app-store' ? (
        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <HeaderShell compact eyebrow="Shelf" title="App store discovery" subtitle="Inspect featured, new, and trending partner releases." />
            <SegmentedControl
              fullWidth
              tone="info"
              value={controller.appStoreShelf}
              onValueChange={(value) => controller.setAppStoreShelf(value as typeof controller.appStoreShelf)}
              items={[
                { value: 'featured', label: 'Featured' },
                { value: 'new', label: 'New' },
                { value: 'trending', label: 'Trending' },
              ]}
            />
            {controller.visibleAppStoreListings.length > 0 ? (
              <div className={styles.cardList}>
                {controller.visibleAppStoreListings.map((listing) => (
                  <Panel key={listing.id} recipe={densePanelRecipe}>
                    <Stack gap="sm">
                      <Metric label={`${listing.icon} ${listing.gameName}`} value={`${controller.formatters.formatNumber(listing.monthlyDownloads, 0)} dl/mo`} description={listing.studioName} />
                      <ActionGroup gap="sm" wrap>
                        <Button recipe={utilityButtonRecipe} onClick={() => controller.setAppStoreSelectedRelease(listing.releaseCard)}>
                          Inspect
                        </Button>
                      </ActionGroup>
                    </Stack>
                  </Panel>
                ))}
              </div>
            ) : (
              <EmptyState title="No licensed releases" description="Approved partner releases will appear here after a licensed game ships on this store." />
            )}
          </Stack>
        </Panel>
      ) : null}
    </Stack>
  );
}

function CommunitiesView({ controller }: { controller: GameCommandDeckController }) {
  const messages = controller.selectedGameCommunity
    ? [...controller.selectedGameCommunity.messages, ...(controller.communityChatMessages[controller.selectedGameCommunity.id] ?? [])]
    : [];

  if (!controller.selectedGameCommunity) {
    return <EmptyState title="No community selected" description="Choose a release and then pick a community to inspect the social layer." />;
  }

  return (
    <Stack gap="lg">
      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <Metric label={controller.selectedGameCommunity.name} value={`${controller.selectedGameCommunity.games.length} active topics`} />
          <KeyValueList
            items={Object.entries(controller.selectedGameCommunity.leadership).map(([role, name]) => ({
              label: role,
              value: name,
            }))}
          />
        </Stack>
      </Panel>

      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="#general" title="Community stream" subtitle="Compact chat history for the selected release community." />
          <div className={styles.messageList}>
            {messages.map((message, index) => (
              <div key={`${message}-${index}`} className={styles.messageBubble}>
                {controller.formatters.translateNarrative(message)}
              </div>
            ))}
          </div>
          <Field label="Message draft" htmlFor="community-draft">
            <Input
              id="community-draft"
              value={controller.communityChatDraft}
              onChange={(event) => controller.setCommunityChatDraft(event.target.value)}
              placeholder="Post to #general"
            />
          </Field>
          <ActionGroup gap="sm" wrap>
            <Button tone="brand" onClick={controller.sendCommunityMessage}>
              Send message
            </Button>
          </ActionGroup>
        </Stack>
      </Panel>
    </Stack>
  );
}

function LicensesView({ controller }: { controller: GameCommandDeckController }) {
  return (
    <Stack gap="lg">
      {controller.focusedCompany?.field === 'game' ? (
        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <HeaderShell compact eyebrow="Licenses" title="App store matrix" subtitle="Manage external distribution approvals for the active game company." />
            {controller.focusedGameLicenseMatrix.length > 0 ? (
              <div className={styles.cardList}>
                {controller.focusedGameLicenseMatrix.map((entry) => (
                  <Panel key={entry.store.key} recipe={densePanelRecipe}>
                    <Stack gap="sm">
                      <Metric
                        label={entry.store.name}
                        value={entry.latest?.status ?? 'available'}
                        description={entry.latest ? `Revenue share ${controller.formatters.formatNumber(entry.latest.revenueShare * 100, 1)}%` : 'No request has been filed yet.'}
                      />
                      <ActionGroup gap="sm" wrap>
                        <Button recipe={utilityButtonRecipe} onClick={() => controller.submitGameLicenseRequest(controller.focusedCompany!.key, entry.store.key)} disabled={!entry.canApply}>
                          Request license
                        </Button>
                      </ActionGroup>
                    </Stack>
                  </Panel>
                ))}
              </div>
            ) : (
              <EmptyState title="No store partners available" description="No eligible app stores are established yet." />
            )}
          </Stack>
        </Panel>
      ) : null}

      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Approvals" title="Incoming license queue" subtitle="Requests waiting in the current approval window." />
          {controller.pendingPlayerLicenseRequests.length > 0 ? (
            <div className={styles.cardList}>
              {controller.pendingPlayerLicenseRequests.map((request) => (
                <Panel key={request.id} recipe={densePanelRecipe}>
                  <Stack gap="sm">
                    <Metric
                      label={controller.game?.companies[request.gameCompanyKey].name ?? request.gameCompanyKey}
                      value={controller.game?.companies[request.softwareCompanyKey].name ?? request.softwareCompanyKey}
                      description={`Requested on day ${request.requestedDay}`}
                    />
                    <ActionGroup gap="sm" wrap>
                      <Button tone="brand" onClick={() => controller.processPlayerLicenseRequest(request.id, 'approved')}>
                        Approve
                      </Button>
                      <Button recipe={utilityButtonRecipe} onClick={() => controller.processPlayerLicenseRequest(request.id, 'rejected')}>
                        Reject
                      </Button>
                    </ActionGroup>
                  </Stack>
                </Panel>
              ))}
            </div>
          ) : (
            <EmptyState title="Approval queue clear" description="No pending requests are waiting for you right now." />
          )}
        </Stack>
      </Panel>
    </Stack>
  );
}

export function IntelDesk({ controller }: IntelDeskProps) {
  const content = (() => {
    switch (controller.intelView) {
      case 'releases':
        return <ReleasesView controller={controller} />;
      case 'communities':
        return <CommunitiesView controller={controller} />;
      case 'licenses':
        return <LicensesView controller={controller} />;
      default:
        return <NewsView controller={controller} />;
    }
  })();

  return (
    <Section
      surface
      recipe={deckSectionRecipe}
      eyebrow="Intel"
      title="News, releases, and communities"
      description="Compact narrative and social monitoring without modal stacking."
      actions={(
        <ActionGroup gap="sm" wrap>
          <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsIntelFilterDrawerOpen(true)}>
            Filters
          </Button>
          <Button tone="brand" onClick={() => controller.setIntelView('news')}>
            News
          </Button>
        </ActionGroup>
      )}
    >
      <Stack gap="lg">
        <SegmentedControl
          fullWidth
          tone="info"
          value={controller.intelView}
          onValueChange={(value) => controller.setIntelView(value as typeof controller.intelView)}
          items={[
            { value: 'news', label: 'News' },
            { value: 'releases', label: 'Releases' },
            { value: 'communities', label: 'Community' },
            { value: 'licenses', label: 'Licenses' },
          ]}
        />
        {content}
      </Stack>
    </Section>
  );
}
