'use client';

import {
  ActionGroup,
  EmptyState,
  Field,
  Input,
  Inline,
  KeyValueList,
  Metric,
  Notice,
  Panel,
  Range,
  Section,
  Select,
  Stack,
  StatusChip,
} from '@/lib/fadhilweblib';
import { Button, SegmentedControl } from '@/lib/fadhilweblib/client';
import type { GameCommandDeckController } from './controller';
import { deckPanelRecipe, densePanelRecipe, utilityButtonRecipe } from './recipes';
import { getPlayerRoleSummary } from './selectors';
import styles from './game-command-deck.module.css';

type ProfileDeskProps = {
  controller: GameCommandDeckController;
};

export function ProfileDesk({ controller }: ProfileDeskProps) {
  if (!controller.game) {
    return (
      <Section
        surface
        eyebrow="Profile"
        title="Create your starting profile"
        description="Choose a company path, lock your starting company, and enter the realtime simulation."
      >
        <Stack gap="lg">
          <Panel recipe={deckPanelRecipe}>
            <Stack gap="md">
              <div className={styles.fieldGrid}>
                <Field label="Profile name" htmlFor="profile-name">
                  <Input
                    id="profile-name"
                    value={controller.profileDraft.name}
                    onChange={(event) => controller.setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Arka Vega"
                  />
                </Field>
                <Field label="Background" htmlFor="profile-background">
                  <Input
                    id="profile-background"
                    value={controller.profileDraft.background}
                    onChange={(event) => controller.setProfileDraft((current) => ({ ...current, background: event.target.value }))}
                    placeholder="Independent investor with a technology thesis"
                  />
                </Field>
                <Field label="Company path">
                  <SegmentedControl
                    fullWidth
                    tone="info"
                    items={[
                      { value: 'cpu', label: 'CPU' },
                      { value: 'game', label: 'Game' },
                      { value: 'software', label: 'Software' },
                    ]}
                    value={controller.profileDraft.companyType}
                    onValueChange={(value) => controller.setProfileDraft((current) => ({ ...current, companyType: value as typeof current.companyType }))}
                  />
                </Field>
                <Field label="Starting company" htmlFor="profile-company">
                  <Select
                    id="profile-company"
                    value={controller.profileDraft.selectedCompany}
                    onChange={(event) => controller.setProfileDraft((current) => ({ ...current, selectedCompany: event.target.value as typeof current.selectedCompany }))}
                  >
                    {controller.constants.COMPANY_KEYS.map((companyKey) => (
                      <option key={companyKey} value={companyKey}>
                        {companyKey.toUpperCase()}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <ActionGroup gap="sm" wrap>
                <Button tone="brand" onClick={controller.createProfile}>
                  Enter command deck
                </Button>
              </ActionGroup>
            </Stack>
          </Panel>

          <div className={styles.panelGrid}>
            <Panel recipe={densePanelRecipe}>
              <Stack gap="sm">
                <Metric label="Starting cash" value={controller.formatters.formatCurrencyCompact(controller.constants.PLAYER_STARTING_CASH, 2)} />
                <Metric label="Runtime" value="1 day / second" description="Timers stay client-side for low overhead mobile play." />
              </Stack>
            </Panel>
            <Panel recipe={densePanelRecipe}>
              <KeyValueList
                items={[
                  { label: 'Path', value: controller.productLabel },
                  { label: 'Starting company', value: controller.profileDraft.selectedCompany.toUpperCase() },
                  { label: 'Profile status', value: 'Ready to initialize' },
                ]}
              />
            </Panel>
          </div>

          <Notice tone="info" title="Status" description={controller.statusMessage} />
        </Stack>
      </Section>
    );
  }

  const company = controller.activeCompany;
  const companyPlanCards = controller.openPlans.slice(0, 3);
  const communityPlanCards = controller.communityPlans.slice(0, 2);

  return (
    <Stack gap="lg">
      {controller.isResetNoticeVisible ? (
        <Notice
          tone="warning"
          title="Simulator reset"
          description="The /game command deck uses a new save slot. Older /game saves were intentionally reset for the overhaul."
          actions={<Button tone="neutral" onClick={controller.dismissResetNotice}>Dismiss</Button>}
        />
      ) : null}

      <Notice
        tone={controller.activePlayerBoardVote ? 'warning' : 'info'}
        title="Command status"
        description={controller.statusMessage}
        actions={(
          <ActionGroup gap="sm" wrap>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsInvestmentDialogOpen(true)}>
              Trade shares
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsCreateCompanyDialogOpen(true)}>
              New company plan
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsCompanyDrawerOpen(true)}>
              Switch company
            </Button>
          </ActionGroup>
        )}
      />

      <div className={styles.metricGrid}>
        <Metric label="Selected company" value={company?.name ?? 'None'} description={company ? controller.formatters.getFieldLabel(company.field) : 'No company selected'} />
        <Metric label="Role" value={getPlayerRoleSummary(controller)} description={company ? `CEO ${company.ceoName}` : 'Waiting for profile'} />
        <Metric label="Pending board vote" value={controller.activePlayerBoardVote ? '1 active' : 'None'} />
        <Metric label="License queue" value={`${controller.pendingPlayerLicenseRequests.length}`} description="Requests waiting for your decision." />
      </div>

      <div className={styles.panelGrid}>
        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <Inline gap="sm" wrap>
              <StatusChip tone="brand" label="cash" value={controller.formatters.formatCurrencyCompact(controller.game.player.cash, 2)} />
              <StatusChip tone="info" label="net worth" value={controller.formatters.formatCurrencyCompact(controller.playerNetWorth, 2)} />
              <StatusChip tone="success" label="ownership" value={company ? `${controller.formatters.formatNumber(controller.helpers.getOwnershipPercent(company, controller.game.player.id), 1)}%` : '0%'} />
            </Inline>
            <KeyValueList
              items={[
                { label: 'Current date', value: controller.formatters.formatDateFromDays(controller.game.elapsedDays) },
                { label: 'Path', value: controller.productLabel },
                { label: 'Realtime state', value: controller.isGamePaused ? 'Paused' : 'Running' },
                { label: 'Board vote access', value: controller.focusedPlayerIsBoardMember ? 'Available' : 'Not a board member' },
              ]}
            />
          </Stack>
        </Panel>

        <Panel recipe={deckPanelRecipe}>
          <Stack gap="md">
            <Notice
              tone={controller.pendingPlayerLicenseRequests.length > 0 ? 'warning' : 'success'}
              title="Urgent queue"
              description={
                controller.pendingPlayerLicenseRequests.length > 0
                  ? `${controller.pendingPlayerLicenseRequests.length} license request(s) are waiting for your decision window.`
                  : 'No urgent license requests are waiting right now.'
              }
            />
            {controller.activePlayerBoardVote ? (
              <Notice
                tone="warning"
                title={`${controller.activePlayerBoardVote.company.name} board ballot`}
                description={controller.formatters.translateNarrative(controller.activePlayerBoardVote.vote.reason)}
              />
            ) : null}
          </Stack>
        </Panel>
      </div>

      {companyPlanCards.length > 0 || communityPlanCards.length > 0 ? (
        <Section surface eyebrow="Plans" title="Funding queue" description="Compact investor tasks you can act on immediately.">
          <Stack gap="md">
            <div className={styles.cardList}>
              {companyPlanCards.map((plan) => (
                <Panel key={plan.companyKey} recipe={densePanelRecipe}>
                  <Stack gap="sm">
                    <Metric
                      label={plan.companyName}
                      value={controller.formatters.formatCurrencyCompact(plan.pledgedCapital, 2)}
                      description={`Target ${controller.formatters.formatCurrencyCompact(plan.targetCapital, 2)} · ${controller.formatters.getFieldLabel(plan.field)}`}
                    />
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
              {communityPlanCards.map((plan) => (
                <Panel key={plan.id} recipe={densePanelRecipe}>
                  <Stack gap="sm">
                    <Metric
                      label={plan.companyName}
                      value={controller.formatters.formatCurrencyCompact(plan.pledgedCapital, 2)}
                      description={`Target ${controller.formatters.formatCurrencyCompact(plan.targetCapital, 2)} · ${controller.formatters.getFieldLabel(plan.field)}`}
                    />
                    <ActionGroup gap="sm" wrap>
                      <Button
                        recipe={utilityButtonRecipe}
                        onClick={() => {
                          if (!controller.game) return;
                          const amount = controller.helpers.clamp(controller.game.player.cash * 0.04, controller.constants.MIN_TRADE_AMOUNT, controller.game.player.cash);
                          const next = controller.helpers.mapProfileCompanyTypeToField;
                          void next;
                        }}
                        disabled
                      >
                        Market investing stays available in the Companies drawer
                      </Button>
                    </ActionGroup>
                  </Stack>
                </Panel>
              ))}
            </div>
          </Stack>
        </Section>
      ) : null}

      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <Metric label="Release readiness" value={controller.focusedCanReleaseCpu ? 'Enabled' : 'Restricted'} description="Release authority depends on CEO / executive role coverage." />
          <Field label="Company plan funding" description="Set the launch capital for the next community-backed company.">
            <Range
              min={4}
              max={80}
              step={1}
              value={controller.createCompanyDraft.percent}
              onChange={(event) => controller.setCreateCompanyDraft((current) => ({ ...current, percent: Number(event.currentTarget.value) }))}
            />
          </Field>
          <ActionGroup gap="sm" wrap>
            <Button tone="brand" onClick={() => controller.setIsCreateCompanyDialogOpen(true)}>
              Open creation dialog
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsReleaseDialogOpen(true)} disabled={!controller.focusedCanReleaseCpu}>
              Open release dialog
            </Button>
          </ActionGroup>
        </Stack>
      </Panel>
    </Stack>
  );
}
