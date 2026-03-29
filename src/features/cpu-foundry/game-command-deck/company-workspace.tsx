'use client';

import {
  ActionGroup,
  EmptyState,
  Field,
  Grid,
  HeaderShell,
  Inline,
  KeyValueList,
  Metric,
  Notice,
  Panel,
  Section,
  Stack,
  StatusChip,
} from '@/lib/fadhilweblib';
import { Button, SegmentedControl, Tabs } from '@/lib/fadhilweblib/client';
import type { CompanyState, ExecutiveRole, TeamKey, UpgradeKey } from '@/features/gameplay/simulation-engine';
import type { GameCommandDeckController } from './controller';
import { deckPanelRecipe, deckSectionRecipe, densePanelRecipe, utilityButtonRecipe } from './recipes';
import { getCompanyLifecycleLabel, getCompanyOwnershipSummary } from './selectors';
import styles from './game-command-deck.module.css';

type CompanyWorkspaceProps = {
  controller: GameCommandDeckController;
};

function CompanyOverview({ controller, company }: { controller: GameCommandDeckController; company: CompanyState }) {
  return (
    <Stack gap="lg">
      <div className={styles.metricGrid}>
        <Metric label="Cash" value={controller.formatters.formatCurrencyCompact(company.cash, 2)} />
        <Metric label="Valuation" value={controller.formatters.formatCurrencyCompact(controller.helpers.getCompanyValuation(company), 2)} />
        <Metric label="Share price" value={controller.formatters.formatCurrencyCompact(controller.helpers.getSharePrice(company), 2)} />
        <Metric label="Research" value={controller.formatters.formatNumber(company.research, 1)} />
        <Metric label="Market share" value={`${controller.formatters.formatNumber(company.marketShare, 1)}%`} />
        <Metric label="Your ownership" value={getCompanyOwnershipSummary(controller, company)} />
      </div>

      <Grid minItemWidth="15rem" gap="md">
        <Panel recipe={deckPanelRecipe}>
          <KeyValueList
            items={[
              { label: 'Lifecycle', value: getCompanyLifecycleLabel(company) },
              { label: 'Field', value: controller.formatters.getFieldLabel(company.field) },
              { label: 'CEO', value: company.ceoName },
              { label: 'Revenue / day', value: controller.formatters.formatCurrencyCompact(controller.helpers.calculateRevenuePerDay(company.teams, company.upgrades, company.marketShare, company.reputation, company.boardMood), 2) },
              { label: 'Research / day', value: controller.formatters.formatNumber(controller.helpers.calculateResearchPerDay(company.teams, company.upgrades), 2) },
              { label: 'Board seats', value: company.boardMembers.length },
            ]}
          />
        </Panel>
        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <Notice
              tone="info"
              title="Latest release"
              description={company.lastRelease ? controller.formatters.translateNarrative(company.lastRelease) : 'No release has shipped yet.'}
            />
            <Notice
              tone="neutral"
              title="Executive pulse"
              description={company.executivePulse ? controller.formatters.translateNarrative(company.executivePulse) : 'No executive note is currently active.'}
            />
          </Stack>
        </Panel>
      </Grid>
    </Stack>
  );
}

function CompanyOperations({ controller, company }: { controller: GameCommandDeckController; company: CompanyState }) {
  return (
    <Stack gap="lg">
      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Roadmap" title="Technology upgrades" subtitle="Spend research points on durable capability gains." />
          <div className={styles.cardList}>
            {(Object.entries(company.upgrades) as Array<[UpgradeKey, CompanyState['upgrades'][UpgradeKey]]>).map(([key, upgrade]) => {
              const cost = controller.helpers.getUpgradeCost(key, upgrade, company);
              const value = controller.helpers.getDisplayedUpgradeValue(key, upgrade);
              return (
                <Panel key={key} recipe={densePanelRecipe}>
                  <Stack gap="sm">
                    <Metric label={upgrade.label} value={`${value} ${upgrade.unit}`.trim()} description={upgrade.description} />
                    <Inline gap="sm" wrap>
                      <StatusChip tone="info" label="cost" value={`${controller.formatters.formatNumber(cost, 0)} RP`} />
                      <StatusChip tone={controller.focusedCanManageTechnology ? 'success' : 'warning'} label="access" value={controller.focusedCanManageTechnology ? 'Authorized' : 'Restricted'} />
                    </Inline>
                    <ActionGroup gap="sm" wrap>
                      <Button recipe={utilityButtonRecipe} onClick={() => controller.improveUpgrade(key, company.key)} disabled={!controller.focusedCanManageTechnology || company.research < cost}>
                        Upgrade
                      </Button>
                    </ActionGroup>
                  </Stack>
                </Panel>
              );
            })}
          </div>
        </Stack>
      </Panel>

      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Operations" title="Team growth" subtitle="Expand team capacity with direct cash spending." />
          <div className={styles.cardList}>
            {(Object.entries(company.teams) as Array<[TeamKey, CompanyState['teams'][TeamKey]]>).map(([key, team]) => {
              const cost = controller.helpers.getTeamCost(team);
              return (
                <Panel key={key} recipe={densePanelRecipe}>
                  <Stack gap="sm">
                    <Metric label={team.label} value={team.count} description={team.description} />
                    <Inline gap="sm" wrap>
                      <StatusChip tone="info" label="hire cost" value={controller.formatters.formatCurrencyCompact(cost, 2)} />
                    </Inline>
                    <ActionGroup gap="sm" wrap>
                      <Button recipe={utilityButtonRecipe} onClick={() => controller.hireTeam(key, company.key)} disabled={company.cash < cost}>
                        Hire team
                      </Button>
                      <Button tone="brand" onClick={() => controller.setIsReleaseDialogOpen(true)} disabled={!controller.focusedCanReleaseCpu}>
                        Launch flow
                      </Button>
                    </ActionGroup>
                  </Stack>
                </Panel>
              );
            })}
          </div>
        </Stack>
      </Panel>

      {company.field === 'software' && company.softwareSpecialization === 'app-store' ? (
        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <HeaderShell compact eyebrow="App Store" title="Distribution profile" subtitle="Tune discovery, infrastructure, and trust for better partner performance." />
            <div className={styles.cardList}>
              {(['discovery', 'infrastructure', 'trust'] as const).map((key) => (
                <Panel key={key} recipe={densePanelRecipe}>
                  <Stack gap="sm">
                    <Metric label={key} value={controller.formatters.formatNumber(company.appStoreProfile[key], 2)} description="App store capability multiplier." />
                    <Button recipe={utilityButtonRecipe} onClick={() => controller.improveAppStoreProfile(key, company.key)} disabled={!controller.focusedCanManageTechnology}>
                      Upgrade {key}
                    </Button>
                  </Stack>
                </Panel>
              ))}
            </div>
          </Stack>
        </Panel>
      ) : null}
    </Stack>
  );
}

function CompanyOwnership({ controller, company }: { controller: GameCommandDeckController; company: CompanyState }) {
  const playerListing = controller.focusedPlayerListing;

  return (
    <Stack gap="lg">
      <Grid minItemWidth="15rem" gap="md">
        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <Metric label="Share sheet total" value={controller.formatters.formatNumber(company.shareSheetTotal, 0)} />
            <ActionGroup gap="sm" wrap>
              {controller.constants.SHARE_SHEET_OPTIONS.map((option) => (
                <Button
                  key={option}
                  recipe={utilityButtonRecipe}
                  onClick={() => controller.updateShareSheetOption(company.key, option)}
                  disabled={company.shareSheetTotal === option}
                >
                  {controller.formatters.formatNumber(option, 0)}
                </Button>
              ))}
            </ActionGroup>
          </Stack>
        </Panel>

        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <Metric label="Open holder listings" value={company.shareListings.length} />
            <Field label="Shares to list" htmlFor="listing-shares">
              <input
                id="listing-shares"
                value={controller.shareListingDraft.shares}
                onChange={(event) => controller.setShareListingDraft((current) => ({ ...current, shares: event.target.value, company: company.key }))}
                className={styles.messageBubble}
                inputMode="decimal"
                placeholder="12.5"
              />
            </Field>
            <SegmentedControl
              fullWidth
              tone="info"
              items={[
                { value: '2', label: '2x' },
                { value: '3', label: '3x' },
                { value: '4', label: '4x' },
              ]}
              value={String(controller.shareListingDraft.company === company.key ? controller.shareListingDraft.priceMultiplier : 2)}
              onValueChange={(value) => controller.setShareListingDraft((current) => ({ ...current, company: company.key, priceMultiplier: Number(value) as 2 | 3 | 4 }))}
            />
            <ActionGroup gap="sm" wrap>
              <Button tone="brand" onClick={() => controller.openPlayerShareListing(company.key)}>
                Open listing
              </Button>
              <Button recipe={utilityButtonRecipe} onClick={() => controller.cancelPlayerShareListing(company.key)} disabled={!playerListing}>
                Cancel listing
              </Button>
            </ActionGroup>
          </Stack>
        </Panel>
      </Grid>

      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Holders" title="Investor ranking" subtitle="Ownership distribution drives control and governance pressure." />
          <div className={styles.cardList}>
            {controller.investorRankings.slice(0, 8).map((entry, index) => (
              <Panel key={entry.investorId} recipe={densePanelRecipe}>
                <Stack gap="sm">
                  <Metric label={`Rank #${index + 1}`} value={entry.displayName} description={`Shares ${controller.formatters.formatNumber(entry.shares, 2)} · ${controller.formatters.formatCurrencyCompact(entry.amount, 2)}`} />
                  <StatusChip tone="info" label="ownership" value={`${controller.formatters.formatNumber(entry.ownership, 1)}%`} />
                </Stack>
              </Panel>
            ))}
          </div>
        </Stack>
      </Panel>
    </Stack>
  );
}

function CompanyManagement({ controller, company }: { controller: GameCommandDeckController; company: CompanyState }) {
  return (
    <Stack gap="lg">
      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Leadership" title="Executive seats" subtitle="Rotate or clear executive seats directly if you are the CEO." />
          <div className={styles.cardList}>
            {controller.constants.EXECUTIVE_ROLES.map((role) => {
              const record = company.executives[role];
              return (
                <Panel key={role} recipe={densePanelRecipe}>
                  <Stack gap="sm">
                    <Metric
                      label={controller.constants.EXECUTIVE_ROLE_META[role].title}
                      value={record?.occupantName ?? 'Unassigned'}
                      description={record ? controller.formatters.translateNarrative(record.note) : 'Seat is currently vacant.'}
                    />
                    <Inline gap="sm" wrap>
                      <StatusChip tone="info" label="domain" value={controller.constants.EXECUTIVE_ROLE_META[role].domain} />
                      <StatusChip tone="neutral" label="salary/day" value={record ? controller.formatters.formatCurrencyCompact(record.salaryPerDay, 2) : '0'} />
                    </Inline>
                    <ActionGroup gap="sm" wrap>
                      <Button recipe={utilityButtonRecipe} onClick={() => controller.rotateExecutiveAppointment(company.key, role)} disabled={!controller.focusedPlayerIsCeo}>
                        Rotate
                      </Button>
                      <Button recipe={utilityButtonRecipe} onClick={() => controller.clearExecutiveAppointment(company.key, role)} disabled={!controller.focusedPlayerIsCeo || !record}>
                        Clear
                      </Button>
                    </ActionGroup>
                  </Stack>
                </Panel>
              );
            })}
          </div>
        </Stack>
      </Panel>

      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <Metric label="Payout ratio" value={`${controller.formatters.formatNumber(company.payoutRatio * 100, 1)}%`} description="Finance policy applied to company cash distribution." />
          <ActionGroup gap="sm" wrap>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.adjustPayoutBias('down', company.key)} disabled={!controller.focusedCanManageFinance}>
              Lower payout
            </Button>
            <Button tone="brand" onClick={() => controller.adjustPayoutBias('up', company.key)} disabled={!controller.focusedCanManageFinance}>
              Raise payout
            </Button>
          </ActionGroup>
        </Stack>
      </Panel>
    </Stack>
  );
}

function CompanyBoard({ controller, company }: { controller: GameCommandDeckController; company: CompanyState }) {
  return (
    <Stack gap="lg">
      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Board" title="Board members" subtitle="Monitor voting weight and the current governance window." />
          <div className={styles.cardList}>
            {company.boardMembers.map((member) => (
              <Panel key={member.id} recipe={densePanelRecipe}>
                <Stack gap="sm">
                  <Metric label={member.name} value={member.seatType} description={member.agenda} />
                  <StatusChip tone="info" label="vote weight" value={controller.formatters.formatNumber(member.voteWeight, 1)} />
                </Stack>
              </Panel>
            ))}
          </div>
        </Stack>
      </Panel>

      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Decision desk" title="Submit a board action" subtitle="Create treasury or executive actions for board approval." />
          <SegmentedControl
            fullWidth
            tone="info"
            items={[
              { value: 'invest', label: 'Invest' },
              { value: 'withdraw', label: 'Withdraw' },
              { value: 'appoint', label: 'Appoint' },
              { value: 'dismiss', label: 'Dismiss' },
              { value: 'payout-up', label: 'Payout+' },
              { value: 'payout-down', label: 'Payout-' },
            ]}
            value={controller.decisionMode}
            onValueChange={(value) => controller.setDecisionMode(value as typeof controller.decisionMode)}
          />
          <Field label="Target company">
            <SegmentedControl
              fullWidth
              tone="neutral"
              items={controller.constants.COMPANY_KEYS.map((key) => ({
                value: key,
                label: controller.game?.companies[key].name ?? key,
              }))}
              value={controller.decisionTargetCompanyKey}
              onValueChange={(value) => controller.setDecisionTargetCompanyKey(value as typeof controller.decisionTargetCompanyKey)}
            />
          </Field>
          <Field label="Decision size">
            <input
              className={styles.messageBubble}
              type="range"
              min={4}
              max={40}
              step={1}
              value={controller.decisionAmountPercent}
              onChange={(event) => controller.setDecisionAmountPercent(Number(event.target.value))}
            />
          </Field>
          <Field label="Executive seat">
            <SegmentedControl
              fullWidth
              tone="neutral"
              items={controller.constants.EXECUTIVE_ROLES.map((role) => ({
                value: role,
                label: controller.constants.EXECUTIVE_ROLE_META[role].title,
              }))}
              value={controller.decisionRole}
              onValueChange={(value) => controller.setDecisionRole(value as ExecutiveRole)}
            />
          </Field>
          {controller.focusedExecutiveCandidatePool.length > 0 ? (
            <Field label="Nominee">
              <SegmentedControl
                fullWidth
                tone="neutral"
                items={controller.focusedExecutiveCandidatePool.slice(0, 6).map((candidateId) => ({
                  value: candidateId,
                  label: controller.helpers.investorDisplayName(controller.game!, candidateId),
                }))}
                value={controller.decisionNomineeId}
                onValueChange={controller.setDecisionNomineeId}
              />
            </Field>
          ) : null}
          <ActionGroup gap="sm" wrap>
            <Button tone="brand" onClick={controller.submitDecision} disabled={!controller.focusedPlayerCanUseDecision}>
              Submit board action
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsLicenseRequestDialogOpen(true)} disabled={company.field !== 'game'}>
              Licenses
            </Button>
          </ActionGroup>
        </Stack>
      </Panel>
    </Stack>
  );
}

function CompanyReleases({ controller, company }: { controller: GameCommandDeckController; company: CompanyState }) {
  const communityMessages = controller.selectedGameCommunity
    ? [...controller.selectedGameCommunity.messages, ...(controller.communityChatMessages[controller.selectedGameCommunity.id] ?? [])]
    : [];

  return (
    <Stack gap="lg">
      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Releases" title="Release cards" subtitle="Compact release and community tracking for the active company." />
          {controller.focusedGameReleaseCards.length > 0 ? (
            <div className={styles.cardList}>
              {controller.focusedGameReleaseCards.map((release) => (
                <Button
                  key={release.id}
                  recipe={utilityButtonRecipe}
                  fullWidth
                  className={styles.companyButton}
                  onClick={() => {
                    controller.setSelectedGameReleaseId(release.id);
                    controller.setTopLevelTab('intel');
                    controller.setIntelView('releases');
                  }}
                >
                  {release.name} | {release.genre} | {controller.formatters.formatNumber(release.popularity, 1)}%
                </Button>
              ))}
            </div>
          ) : (
            <EmptyState title="No releases yet" description="Ship the first release to populate the company release deck." />
          )}
        </Stack>
      </Panel>

      {controller.selectedGameRelease ? (
        <Grid minItemWidth="15rem" gap="md">
          <Panel recipe={deckPanelRecipe}>
            <Stack gap="md">
              <Metric label={controller.selectedGameRelease.name} value={controller.selectedGameRelease.genre} description={`Released ${controller.selectedGameRelease.releaseDate}`} />
              <Notice tone="info" title="Popularity" description={`${controller.formatters.formatNumber(controller.selectedGameRelease.popularity, 1)}% active interest.`} />
              <ActionGroup gap="sm" wrap>
                {controller.selectedGameCommunities.map((community) => (
                  <Button key={community.id} recipe={utilityButtonRecipe} onClick={() => controller.setSelectedGameCommunityId(community.id)}>
                    {community.name}
                  </Button>
                ))}
              </ActionGroup>
            </Stack>
          </Panel>

          <Panel recipe={deckPanelRecipe}>
            {controller.selectedGameCommunity ? (
              <Stack gap="md">
                <Metric label={controller.selectedGameCommunity.name} value={`${controller.selectedGameCommunity.games.length} shared games`} />
                <KeyValueList
                  items={Object.entries(controller.selectedGameCommunity.leadership).map(([role, name]) => ({
                    label: role,
                    value: name,
                  }))}
                />
                <div className={styles.messageList}>
                  {communityMessages.map((message, index) => (
                    <div key={`${message}-${index}`} className={styles.messageBubble}>
                      {controller.formatters.translateNarrative(message)}
                    </div>
                  ))}
                </div>
                <ActionGroup gap="sm" wrap>
                  <Button recipe={utilityButtonRecipe} onClick={controller.sendCommunityMessage}>
                    Send current draft
                  </Button>
                </ActionGroup>
              </Stack>
            ) : (
              <EmptyState title="No community selected" description="Choose a community from the release card to inspect chat and leadership." />
            )}
          </Panel>
        </Grid>
      ) : null}
    </Stack>
  );
}

export function CompanyWorkspace({ controller }: CompanyWorkspaceProps) {
  const company = controller.focusedCompany;

  if (!controller.game || !company) {
    return <EmptyState title="No active company" description="Create a profile to unlock the company workspace." />;
  }

  return (
    <Section
      surface
      recipe={deckSectionRecipe}
      eyebrow="Company"
      title={company.name}
      description={`${controller.formatters.getFieldLabel(company.field)} workspace with compact operational controls.`}
      actions={(
        <ActionGroup gap="sm" wrap>
          <Button tone="brand" onClick={() => controller.setIsReleaseDialogOpen(true)} disabled={!controller.focusedCanReleaseCpu}>
            Release
          </Button>
          <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsInvestmentDialogOpen(true)}>
            Trade
          </Button>
        </ActionGroup>
      )}
    >
      <Tabs
        keepMounted={false}
        tone="info"
        value={controller.companyWorkspaceTab}
        onValueChange={(value) => controller.setCompanyWorkspaceTab(value as typeof controller.companyWorkspaceTab)}
        items={[
          { value: 'overview', label: 'Overview', content: <CompanyOverview controller={controller} company={company} /> },
          { value: 'operations', label: 'Operations', content: <CompanyOperations controller={controller} company={company} /> },
          { value: 'ownership', label: 'Ownership', content: <CompanyOwnership controller={controller} company={company} /> },
          { value: 'management', label: 'Management', content: <CompanyManagement controller={controller} company={company} /> },
          { value: 'board', label: 'Board', badge: controller.activePlayerBoardVote ? '1' : undefined, content: <CompanyBoard controller={controller} company={company} /> },
          { value: 'releases', label: 'Releases', content: <CompanyReleases controller={controller} company={company} /> },
        ]}
      />
    </Section>
  );
}
