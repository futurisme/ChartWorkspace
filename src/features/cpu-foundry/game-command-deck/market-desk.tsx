'use client';

import {
  ActionGroup,
  EmptyState,
  HeaderShell,
  Inline,
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
import { getStatisticRows } from './selectors';
import styles from './game-command-deck.module.css';

type MarketDeskProps = {
  controller: GameCommandDeckController;
};

function TradeView({ controller }: { controller: GameCommandDeckController }) {
  if (!controller.game || !controller.activeCompany) {
    return <EmptyState title="No market data" description="Create a profile to unlock market controls." />;
  }

  const preview = controller.investmentPreview;

  return (
    <Stack gap="lg">
      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Trade" title="Realtime share routing" subtitle="Buy or sell against company inventory or the holder route without leaving the command deck." />
          <div className={styles.metricGrid}>
            <Metric label="Selected company" value={controller.game.companies[controller.investmentDraft.company].name} />
            <Metric label="Mode" value={controller.investmentDraft.mode.toUpperCase()} />
            <Metric label="Route" value={controller.formatters.getTradeRouteLabel(controller.investmentDraft.route)} />
            <Metric label="Slider" value={`${controller.investmentDraft.sliderPercent}%`} />
          </div>
          {preview ? (
            <Notice
              tone="info"
              title="Current trade preview"
              description={`${controller.formatters.formatCurrencyCompact(preview.grossTradeValue, 2)} gross value for ${controller.formatters.formatNumber(preview.sharesMoved, 2)} shares. Future ownership ${controller.formatters.formatNumber(preview.futureOwnership, 2)}%.`}
            />
          ) : (
            <Notice tone="warning" title="No valid preview" description="The selected company may not be established yet, or the current route has no available liquidity." />
          )}
          <ActionGroup gap="sm" wrap>
            <Button tone="brand" onClick={() => controller.setIsInvestmentDialogOpen(true)}>
              Open trade dialog
            </Button>
            <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsCompanyDrawerOpen(true)}>
              Switch active company
            </Button>
          </ActionGroup>
        </Stack>
      </Panel>

      <div className={styles.cardList}>
        {controller.companyCards.map(({ company, sharePrice, companyValue, playerOwnership }) => (
          <Panel key={company.key} recipe={densePanelRecipe}>
            <Stack gap="sm">
              <Metric label={company.name} value={controller.formatters.formatCurrencyCompact(sharePrice, 2)} description={`${controller.formatters.getFieldLabel(company.field)} · ${controller.formatters.formatCurrencyCompact(companyValue, 2)} valuation`} />
              <Inline gap="sm" wrap>
                <StatusChip tone="info" label="your stake" value={`${controller.formatters.formatNumber(playerOwnership, 1)}%`} />
                <StatusChip tone="neutral" label="CEO" value={company.ceoName} />
              </Inline>
              <ActionGroup gap="sm" wrap>
                <Button recipe={utilityButtonRecipe} onClick={() => {
                  controller.switchCompany(company.key);
                  controller.setInvestmentDraft((current) => ({ ...current, company: company.key }));
                }}>
                  Focus
                </Button>
                <Button tone="brand" onClick={() => {
                  controller.setInvestmentDraft((current) => ({ ...current, company: company.key }));
                  controller.setIsInvestmentDialogOpen(true);
                }}>
                  Trade
                </Button>
              </ActionGroup>
            </Stack>
          </Panel>
        ))}
      </div>
    </Stack>
  );
}

function InvestorsView({ controller }: { controller: GameCommandDeckController }) {
  return (
    <Panel recipe={deckPanelRecipe}>
      <Stack gap="md">
        <HeaderShell compact eyebrow="Investors" title="Ownership leaderboard" subtitle="Largest holders influence governance and automatic leadership changes." />
        <div className={styles.cardList}>
          {controller.investorRankings.length > 0 ? controller.investorRankings.map((entry, index) => (
            <Panel key={entry.investorId} recipe={densePanelRecipe}>
              <Stack gap="sm">
                <Metric label={`Rank #${index + 1}`} value={entry.displayName} description={`Shares ${controller.formatters.formatNumber(entry.shares, 2)} · Value ${controller.formatters.formatCurrencyCompact(entry.amount, 2)}`} />
                <StatusChip tone="info" label="ownership" value={`${controller.formatters.formatNumber(entry.ownership, 1)}%`} />
              </Stack>
            </Panel>
          )) : <EmptyState title="No investors yet" description="Investor rankings appear once the selected company is established." />}
        </div>
      </Stack>
    </Panel>
  );
}

function ForbesView({ controller }: { controller: GameCommandDeckController }) {
  const entries = controller.forbesCategory === 'individual' ? controller.forbesIndividualList : controller.forbesBusinessList;

  return (
    <Stack gap="lg">
      <SegmentedControl
        fullWidth
        tone="info"
        value={controller.forbesCategory}
        onValueChange={(value) => controller.setForbesCategory(value as typeof controller.forbesCategory)}
        items={[
          { value: 'individual', label: 'Individuals' },
          { value: 'business', label: 'Businesses' },
        ]}
      />
      <div className={styles.cardList}>
        {entries.slice(0, 12).map((entry, index) => (
          <Panel key={'investorId' in entry ? entry.investorId : entry.companyKey} recipe={densePanelRecipe}>
            <Stack gap="sm">
              <Metric
                label={`#${index + 1} ${entry.name}`}
                value={controller.formatters.formatCurrencyCompact('companyNames' in entry ? entry.wealth : entry.valuation, 2)}
                description={'companyNames' in entry ? (entry.companyNames.join(', ') || 'No holdings') : `${entry.category} · ${entry.investorsCount} active investors`}
              />
            </Stack>
          </Panel>
        ))}
      </div>
    </Stack>
  );
}

function StatisticsView({ controller }: { controller: GameCommandDeckController }) {
  const stats = getStatisticRows(controller);

  return (
    <Stack gap="lg">
      <SegmentedControl
        fullWidth
        tone="info"
        value={controller.statisticsTab}
        onValueChange={(value) => controller.setStatisticsTab(value as typeof controller.statisticsTab)}
        items={controller.statisticsTabConfig.map((item) => ({
          value: item.key,
          label: item.label,
        }))}
      />
      <Panel recipe={deckPanelRecipe}>
        <Stack gap="md">
          <HeaderShell compact eyebrow="Statistics" title={stats.title} subtitle="Low-overhead slice breakdowns for compact mobile review." />
          {stats.rows.length > 0 ? (
            <div className={styles.cardList}>
              {stats.rows.map((row) => (
                <Panel key={row.label} recipe={densePanelRecipe}>
                  <Stack gap="sm">
                    <Metric label={row.label} value={row.valueLabel} change={`${controller.formatters.formatNumber(row.share, 1)}%`} />
                    <div className={styles.barShell}>
                      <div className={styles.barFill} style={{ width: `${row.share}%`, background: row.color }} />
                    </div>
                  </Stack>
                </Panel>
              ))}
            </div>
          ) : (
            <EmptyState title="No statistics available" description="The selected company needs more operational history before the breakdown becomes meaningful." />
          )}
        </Stack>
      </Panel>
    </Stack>
  );
}

export function MarketDesk({ controller }: MarketDeskProps) {
  const content = (() => {
    switch (controller.marketView) {
      case 'investors':
        return <InvestorsView controller={controller} />;
      case 'forbes':
        return <ForbesView controller={controller} />;
      case 'statistics':
        return <StatisticsView controller={controller} />;
      default:
        return <TradeView controller={controller} />;
    }
  })();

  return (
    <Section
      surface
      recipe={deckSectionRecipe}
      eyebrow="Market"
      title="Capital and rankings"
      description="Fast trading, investor rankings, Forbes-style lists, and compact statistics."
      actions={(
        <ActionGroup gap="sm" wrap>
          <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsMarketFilterDrawerOpen(true)}>
            Filters
          </Button>
          <Button tone="brand" onClick={() => controller.setIsInvestmentDialogOpen(true)}>
            Trade
          </Button>
        </ActionGroup>
      )}
    >
      <Stack gap="lg">
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
        {content}
      </Stack>
    </Section>
  );
}
