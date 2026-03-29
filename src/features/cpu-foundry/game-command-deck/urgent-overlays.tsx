'use client';

import {
  ActionGroup,
  EmptyState,
  Field,
  Metric,
  Notice,
  Panel,
  Stack,
  StatusChip,
} from '@/lib/fadhilweblib';
import { Button, Dialog, Drawer, SegmentedControl } from '@/lib/fadhilweblib/client';
import { Input, Range, Select } from '@/lib/fadhilweblib';
import type { GameCommandDeckController } from './controller';
import { deckPanelRecipe, densePanelRecipe, utilityButtonRecipe } from './recipes';
import styles from './game-command-deck.module.css';

type UrgentOverlaysProps = {
  controller: GameCommandDeckController;
};

export function UrgentOverlays({ controller }: UrgentOverlaysProps) {
  const company = controller.activeCompany;
  const preview = controller.investmentPreview;
  const activeBoardVote = controller.activePlayerBoardVote;
  const activeBoardVoteMeta = controller.activePlayerBoardVoteMeta;
  const activeLicenseRequest = controller.pendingPlayerLicenseRequests[0];

  return (
    <>
      <Drawer
        open={controller.isCompanyDrawerOpen}
        onOpenChange={controller.setIsCompanyDrawerOpen}
        title="Company switcher"
        description="Move between established companies and review active funding queues."
        side="right"
        width="24rem"
      >
        <Stack gap="lg">
          <div className={styles.drawerList}>
            {controller.establishedCompanies.map((entry) => (
              <Panel key={entry.key} recipe={densePanelRecipe}>
                <Stack gap="sm">
                  <Metric label={entry.name} value={controller.formatters.getFieldLabel(entry.field)} description={`CEO ${entry.ceoName}`} />
                  <ActionGroup gap="sm" wrap>
                    <Button recipe={utilityButtonRecipe} onClick={() => { controller.switchCompany(entry.key); controller.setIsCompanyDrawerOpen(false); }}>
                      Focus company
                    </Button>
                    <Button tone="brand" onClick={() => { controller.switchCompany(entry.key); controller.setIsInvestmentDialogOpen(true); controller.setIsCompanyDrawerOpen(false); }}>
                      Trade
                    </Button>
                  </ActionGroup>
                </Stack>
              </Panel>
            ))}
          </div>

          {controller.openPlans.length > 0 ? (
            <Stack gap="md">
              <Notice tone="info" title="Company establishment plans" description="Invest directly from the drawer without opening another route layer." />
              <div className={styles.drawerList}>
                {controller.openPlans.map((plan) => (
                  <Panel key={plan.companyKey} recipe={densePanelRecipe}>
                    <Stack gap="sm">
                      <Metric label={plan.companyName} value={controller.formatters.formatCurrencyCompact(plan.pledgedCapital, 2)} description={`Target ${controller.formatters.formatCurrencyCompact(plan.targetCapital, 2)}`} />
                      <ActionGroup gap="sm" wrap>
                        <Button recipe={utilityButtonRecipe} onClick={() => controller.investInPlan(plan.companyKey, 0.08)} disabled={plan.isEstablished}>
                          Invest 8%
                        </Button>
                        <Button tone="brand" onClick={() => controller.investInPlan(plan.companyKey, 0.2)} disabled={plan.isEstablished}>
                          Invest 20%
                        </Button>
                      </ActionGroup>
                    </Stack>
                  </Panel>
                ))}
              </div>
            </Stack>
          ) : null}
        </Stack>
      </Drawer>

      <Drawer
        open={controller.isMarketFilterDrawerOpen}
        onOpenChange={controller.setIsMarketFilterDrawerOpen}
        title="Market filters"
        description="Compact controls for rankings, statistics, and trading context."
        side="right"
        width="22rem"
      >
        <Stack gap="lg">
          <Field label="Market view">
            <SegmentedControl
              fullWidth
              tone="info"
              value={controller.marketView}
              onValueChange={(value) => controller.setMarketView(value as typeof controller.marketView)}
              items={[
                { value: 'trade', label: 'Trade' },
                { value: 'investors', label: 'Investors' },
                { value: 'forbes', label: 'Forbes' },
                { value: 'statistics', label: 'Stats' },
              ]}
            />
          </Field>
          <Field label="Forbes mode">
            <SegmentedControl
              fullWidth
              tone="neutral"
              value={controller.forbesCategory}
              onValueChange={(value) => controller.setForbesCategory(value as typeof controller.forbesCategory)}
              items={[
                { value: 'individual', label: 'Individuals' },
                { value: 'business', label: 'Businesses' },
              ]}
            />
          </Field>
          <Field label="Statistics slice">
            <SegmentedControl
              fullWidth
              tone="neutral"
              value={controller.statisticsTab}
              onValueChange={(value) => controller.setStatisticsTab(value as typeof controller.statisticsTab)}
              items={controller.statisticsTabConfig.map((entry) => ({
                value: entry.key,
                label: entry.label,
              }))}
            />
          </Field>
        </Stack>
      </Drawer>

      <Drawer
        open={controller.isIntelFilterDrawerOpen}
        onOpenChange={controller.setIsIntelFilterDrawerOpen}
        title="Intel filters"
        description="Compact filters for feed selection, shelf mode, and community browsing."
        side="right"
        width="22rem"
      >
        <Stack gap="lg">
          <Field label="News company">
            <Select value={controller.newsCompanyFilter} onChange={(event) => controller.setNewsCompanyFilter(event.target.value as typeof controller.newsCompanyFilter)}>
              <option value="all">All companies</option>
              {controller.constants.COMPANY_KEYS.map((companyKey) => (
                <option key={companyKey} value={companyKey}>
                  {controller.game?.companies[companyKey].name ?? companyKey}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Intel view">
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
          </Field>
          <Field label="App store shelf">
            <SegmentedControl
              fullWidth
              tone="neutral"
              value={controller.appStoreShelf}
              onValueChange={(value) => controller.setAppStoreShelf(value as typeof controller.appStoreShelf)}
              items={[
                { value: 'featured', label: 'Featured' },
                { value: 'new', label: 'New' },
                { value: 'trending', label: 'Trending' },
              ]}
            />
          </Field>
        </Stack>
      </Drawer>

      <Dialog
        open={controller.isCreateCompanyDialogOpen}
        onOpenChange={controller.setIsCreateCompanyDialogOpen}
        title="Create company plan"
        description="Community-backed company plans require your initial funding allocation."
        size="md"
      >
        <Stack gap="lg">
          <Field label="Company name" htmlFor="company-plan-name">
            <Input
              id="company-plan-name"
              value={controller.createCompanyDraft.name}
              onChange={(event) => controller.setCreateCompanyDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nova Labs"
            />
          </Field>
          <Field label="Initial funding allocation">
            <Range
              min={4}
              max={80}
              step={1}
              value={controller.createCompanyDraft.percent}
              onChange={(event) => controller.setCreateCompanyDraft((current) => ({ ...current, percent: Number(event.currentTarget.value) }))}
            />
          </Field>
          <Field label="Company type">
            <SegmentedControl
              fullWidth
              tone="info"
              value={controller.createCompanyDraft.companyType}
              onValueChange={(value) => controller.setCreateCompanyDraft((current) => ({ ...current, companyType: value as typeof current.companyType }))}
              items={[
                { value: 'cpu', label: 'CPU' },
                { value: 'game', label: 'Game' },
                { value: 'software', label: 'Software' },
              ]}
            />
          </Field>
          {controller.createCompanyDraft.companyType === 'software' ? (
            <Field label="Software specialization">
              <Select
                value={controller.createCompanyDraft.softwareSpecialization}
                onChange={(event) => controller.setCreateCompanyDraft((current) => ({ ...current, softwareSpecialization: event.target.value as typeof current.softwareSpecialization }))}
              >
                {controller.constants.SOFTWARE_SPECIALIZATIONS.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <ActionGroup gap="sm" wrap>
            <Button tone="brand" onClick={controller.createCompanyPlanByPlayer}>
              Create plan
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsCreateCompanyDialogOpen(false)}>
              Cancel
            </Button>
          </ActionGroup>
        </Stack>
      </Dialog>

      <Dialog
        open={controller.isInvestmentDialogOpen}
        onOpenChange={controller.setIsInvestmentDialogOpen}
        title="Share trading"
        description="Configure the company, route, and transaction size before executing the trade."
        size="md"
      >
        <Stack gap="lg">
          <Field label="Company">
            <Select value={controller.investmentDraft.company} onChange={(event) => controller.setInvestmentDraft((current) => ({ ...current, company: event.target.value as typeof current.company }))}>
              {controller.constants.COMPANY_KEYS.map((companyKey) => (
                <option key={companyKey} value={companyKey}>
                  {controller.game?.companies[companyKey].name ?? companyKey}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mode">
            <SegmentedControl
              fullWidth
              tone="info"
              value={controller.investmentDraft.mode}
              onValueChange={(value) => controller.setInvestmentDraft((current) => ({ ...current, mode: value as typeof current.mode }))}
              items={[
                { value: 'buy', label: 'Buy' },
                { value: 'sell', label: 'Sell' },
              ]}
            />
          </Field>
          <Field label="Route">
            <SegmentedControl
              fullWidth
              tone="neutral"
              value={controller.investmentDraft.route}
              onValueChange={(value) => controller.setInvestmentDraft((current) => ({ ...current, route: value as typeof current.route }))}
              items={[
                { value: 'auto', label: 'Auto' },
                { value: 'company', label: 'Company' },
                { value: 'holders', label: 'Holders' },
              ]}
            />
          </Field>
          <Field label={`Transaction size (${controller.investmentDraft.sliderPercent}%)`}>
            <Range
              min={0}
              max={100}
              step={1}
              value={controller.investmentDraft.sliderPercent}
              onChange={(event) => controller.setInvestmentDraft((current) => ({ ...current, sliderPercent: Number(event.currentTarget.value) }))}
            />
          </Field>
          {preview ? (
            <Notice
              tone="info"
              title="Trade preview"
              description={`${controller.formatters.formatCurrencyCompact(preview.grossTradeValue, 2)} for ${controller.formatters.formatNumber(preview.sharesMoved, 2)} shares. Route ${preview.routeLabel}. Future ownership ${controller.formatters.formatNumber(preview.futureOwnership, 2)}%.`}
            />
          ) : (
            <Notice tone="warning" title="No preview available" description="The current company or route cannot produce a valid trade preview yet." />
          )}
          <ActionGroup gap="sm" wrap>
            <Button tone="brand" onClick={controller.investInCompany} disabled={!preview}>
              Execute trade
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsInvestmentDialogOpen(false)}>
              Close
            </Button>
          </ActionGroup>
        </Stack>
      </Dialog>

      <Dialog
        open={controller.isReleaseDialogOpen}
        onOpenChange={controller.setIsReleaseDialogOpen}
        title={`Release ${controller.productLabel}`}
        description="Configure the series, release name, pricing, and optional distribution store."
        size="md"
      >
        <Stack gap="lg">
          <Field label="Series name" htmlFor="release-series">
            <Input
              id="release-series"
              value={controller.releaseDraft.series}
              onChange={(event) => controller.setReleaseDraft((current) => ({ ...current, series: event.target.value }))}
              placeholder={`${company?.name ?? 'Studio'} Prime`}
            />
          </Field>
          <Field label={`${controller.productLabel} name`} htmlFor="release-name">
            <Input
              id="release-name"
              value={controller.releaseDraft.cpuName}
              onChange={(event) => controller.setReleaseDraft((current) => ({ ...current, cpuName: event.target.value }))}
              placeholder="Launch-01"
            />
          </Field>
          {company?.field === 'game' ? (
            <Field label="Distribution store">
              <Select
                value={controller.releaseStoreCompanyKey ?? ''}
                onChange={(event) => controller.setReleaseStoreCompanyKey((event.target.value || null) as typeof controller.releaseStoreCompanyKey)}
              >
                <option value="">Select a licensed store</option>
                {controller.activeApprovedReleaseStores.map((store) => (
                  <option key={store.key} value={store.key}>
                    {store.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label={`Price preset (${controller.activePricePreset.label})`}>
            <Range
              min={0}
              max={controller.constants.PRICE_PRESETS.length - 1}
              step={1}
              value={controller.releaseDraft.priceIndex}
              onChange={(event) => controller.setReleaseDraft((current) => ({ ...current, priceIndex: Number(event.currentTarget.value) }))}
            />
          </Field>
          <Notice
            tone="info"
            title="Release preview"
            description={
              company
                ? `${controller.releaseDraft.series || 'Series'} ${controller.releaseDraft.cpuName || controller.productLabel} | Rating ${controller.formatters.formatNumber(controller.activeReleaseRating?.rating ?? 0, 1)} / 100 | Price ${controller.activePricePreset.label}`
                : 'Select an active company first.'
            }
          />
          <ActionGroup gap="sm" wrap>
            <Button tone="brand" onClick={controller.launchCpu} disabled={!company}>
              Launch now
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsReleaseDialogOpen(false)}>
              Close
            </Button>
          </ActionGroup>
        </Stack>
      </Dialog>

      <Dialog
        open={controller.isLicenseRequestDialogOpen}
        onOpenChange={controller.setIsLicenseRequestDialogOpen}
        title="App store license requests"
        description="Request or review distribution approvals for the focused game company."
        size="md"
      >
        <Stack gap="lg">
          {controller.focusedGameLicenseMatrix.length > 0 ? controller.focusedGameLicenseMatrix.map((entry) => (
            <Panel key={entry.store.key} recipe={densePanelRecipe}>
              <Stack gap="sm">
                <Metric label={entry.store.name} value={entry.latest?.status ?? 'available'} description={entry.latest ? `Revenue share ${controller.formatters.formatNumber(entry.latest.revenueShare * 100, 1)}%` : 'No request has been filed yet.'} />
                <Button recipe={utilityButtonRecipe} onClick={() => controller.focusedCompany && controller.submitGameLicenseRequest(controller.focusedCompany.key, entry.store.key)} disabled={!entry.canApply}>
                  Request license
                </Button>
              </Stack>
            </Panel>
          )) : (
            <EmptyState title="No license targets" description="There are no eligible store partners for the current company." />
          )}
        </Stack>
      </Dialog>

      <Dialog
        open={controller.isResetConfirmOpen}
        onOpenChange={controller.setIsResetConfirmOpen}
        title="Reset simulator profile"
        description="This clears the current /game save slot and returns the route to the profile setup screen."
        size="sm"
      >
        <Stack gap="lg">
          <Notice tone="danger" title="Destructive action" description="The new command deck already uses a separate save key, but this action will also clear the active command-deck save." />
          <ActionGroup gap="sm" wrap>
            <Button tone="danger" onClick={controller.resetProfile}>
              Reset profile
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsResetConfirmOpen(false)}>
              Cancel
            </Button>
          </ActionGroup>
        </Stack>
      </Dialog>

      <Dialog
        open={Boolean(activeBoardVote)}
        onOpenChange={() => {}}
        title={activeBoardVote ? `${activeBoardVote.company.name} board vote` : 'Board vote'}
        description={activeBoardVote ? controller.formatters.translateNarrative(activeBoardVote.vote.reason) : undefined}
        size="md"
      >
        {activeBoardVote && activeBoardVoteMeta ? (
          <Stack gap="lg">
            <StatusChip tone={activeBoardVoteMeta.playerCanVote ? 'warning' : 'neutral'} label="votes cast" value={`${activeBoardVoteMeta.totalVotesCast}/${activeBoardVoteMeta.totalVoters}`} />
            <Notice
              tone={activeBoardVoteMeta.playerCanVote ? 'warning' : 'info'}
              title={activeBoardVote.vote.subject}
              description={
                activeBoardVoteMeta.playerCanVote
                  ? 'AI board members have finished voting. Your vote will resolve the current board ballot.'
                  : `Waiting for AI board members. ${activeBoardVoteMeta.aiVotesCast}/${activeBoardVoteMeta.aiTotalVoters} have voted.`
              }
            />
            <ActionGroup gap="sm" wrap>
              <Button tone="brand" onClick={() => controller.castPlayerBoardVote(activeBoardVote.companyKey, 'yes')} disabled={!activeBoardVoteMeta.playerCanVote}>
                Vote yes
              </Button>
              <Button recipe={utilityButtonRecipe} onClick={() => controller.castPlayerBoardVote(activeBoardVote.companyKey, 'no')} disabled={!activeBoardVoteMeta.playerCanVote}>
                Vote no
              </Button>
            </ActionGroup>
          </Stack>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(activeLicenseRequest) && controller.isLicenseDeskOpen}
        onOpenChange={controller.setIsLicenseDeskOpen}
        title="Pending license decision"
        description={activeLicenseRequest ? `Decision window for ${controller.game?.companies[activeLicenseRequest.gameCompanyKey].name ?? activeLicenseRequest.gameCompanyKey}` : undefined}
        size="md"
      >
        {activeLicenseRequest ? (
          <Stack gap="lg">
            <Metric
              label={controller.game?.companies[activeLicenseRequest.gameCompanyKey].name ?? activeLicenseRequest.gameCompanyKey}
              value={controller.game?.companies[activeLicenseRequest.softwareCompanyKey].name ?? activeLicenseRequest.softwareCompanyKey}
              description={`Requested on day ${activeLicenseRequest.requestedDay}`}
            />
            <ActionGroup gap="sm" wrap>
              <Button tone="brand" onClick={() => controller.processPlayerLicenseRequest(activeLicenseRequest.id, 'approved')}>
                Approve
              </Button>
              <Button recipe={utilityButtonRecipe} onClick={() => controller.processPlayerLicenseRequest(activeLicenseRequest.id, 'rejected')}>
                Reject
              </Button>
              <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsLicenseDeskOpen(false)}>
                Decide later
              </Button>
            </ActionGroup>
          </Stack>
        ) : null}
      </Dialog>
    </>
  );
}
