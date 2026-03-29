'use client';

import {
  ActionGroup,
  HeaderShell,
  Inline,
  Metric,
  Section,
  StatusChip,
  Stack,
} from '@/lib/fadhilweblib';
import { Button } from '@/lib/fadhilweblib/client';
import type { GameCommandDeckController } from './controller';
import { deckSectionRecipe, dockButtonRecipe, utilityButtonRecipe } from './recipes';
import { getPlayerRoleSummary } from './selectors';
import styles from './game-command-deck.module.css';

type CommandHeaderProps = {
  controller: GameCommandDeckController;
};

export function CommandHeader({ controller }: CommandHeaderProps) {
  const company = controller.activeCompany;

  return (
    <Section
      className={styles.stickyHeader}
      recipe={deckSectionRecipe}
      surface
      eyebrow="/game"
      title={controller.game ? controller.game.player.name : controller.simulatorTitle}
      description={controller.game ? controller.game.player.background : 'Android-first command deck for the career simulator.'}
      meta={(
        <StatusChip
          tone={controller.isGamePaused ? 'warning' : 'info'}
          label="runtime"
          value={controller.game ? controller.formatters.formatDateFromDays(controller.game.elapsedDays) : controller.rendererMode}
        />
      )}
      actions={(
        <ActionGroup gap="sm" wrap>
          <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsCompanyDrawerOpen(true)}>
            Company
          </Button>
          <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsInvestmentDialogOpen(true)} disabled={!controller.game}>
            Trade
          </Button>
          <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsReleaseDialogOpen(true)} disabled={!controller.game || !company}>
            Release
          </Button>
          <Button recipe={utilityButtonRecipe} onClick={() => controller.setIsResetConfirmOpen(true)} disabled={!controller.game}>
            Reset
          </Button>
        </ActionGroup>
      )}
    >
      {controller.game ? (
        <Stack gap="md">
          <Inline gap="sm" wrap>
            <StatusChip tone="brand" label="path" value={controller.productLabel} />
            <StatusChip tone="info" label="selected" value={company?.name ?? 'No company'} />
            <StatusChip tone={controller.activePlayerBoardVote ? 'warning' : 'success'} label="role" value={getPlayerRoleSummary(controller)} />
            <StatusChip tone={controller.pendingPlayerLicenseRequests.length > 0 ? 'warning' : 'neutral'} label="queue" value={`${controller.pendingPlayerLicenseRequests.length} license`} />
          </Inline>
          <div className={styles.metricGrid}>
            <Metric label="Cash" value={controller.formatters.formatCurrencyCompact(controller.game.player.cash, 2)} />
            <Metric label="Net worth" value={controller.formatters.formatCurrencyCompact(controller.playerNetWorth, 2)} />
            <Metric label="Ownership" value={company ? `${controller.formatters.formatNumber(controller.helpers.getOwnershipPercent(company, controller.game.player.id), 1)}%` : '0%'} />
            <Metric label="Status" value={controller.isGamePaused ? 'Paused' : 'Realtime'} change={controller.rendererMode} />
          </div>
        </Stack>
      ) : (
        <ActionGroup gap="sm" wrap>
          <Button recipe={dockButtonRecipe} onClick={controller.createProfile}>
            Start profile
          </Button>
        </ActionGroup>
      )}
    </Section>
  );
}
