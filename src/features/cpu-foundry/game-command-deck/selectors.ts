import type { CompanyState } from '@/features/gameplay/simulation-engine';
import type { GameCommandDeckController } from './controller';

export function getPlayerRoleSummary(controller: GameCommandDeckController) {
  if (!controller.game || !controller.activeCompany) {
    return 'Guest';
  }
  if (controller.isPlayerCeo) {
    return `CEO of ${controller.activeCompany.name}`;
  }
  if (controller.activePlayerExecutiveRoles.length > 0) {
    return controller.activePlayerExecutiveRoles
      .map((role) => controller.constants.EXECUTIVE_ROLE_META[role].title)
      .join(', ');
  }
  return 'Independent investor';
}

export function getCompanyLifecycleLabel(company: CompanyState) {
  if (!company.isEstablished) {
    return 'Funding';
  }
  return company.releaseCount > 0 ? 'Operating' : 'Pre-release';
}

export function getCompanyOwnershipSummary(controller: GameCommandDeckController, company: CompanyState) {
  if (!controller.game) {
    return '0%';
  }
  return `${controller.formatters.formatNumber(controller.helpers.getOwnershipPercent(company, controller.game.player.id), 1)}%`;
}

export function getStatisticRows(controller: GameCommandDeckController) {
  const active = controller.activeStatisticsConfig;
  const total = active?.slices.reduce((sum, slice) => sum + slice.value, 0) ?? 0;

  return {
    title: active?.title ?? 'Statistics',
    rows: (active?.slices ?? []).map((slice) => ({
      ...slice,
      share: total > 0 ? (slice.value / total) * 100 : 0,
      valueLabel: controller.formatters.formatCurrencyCompact(slice.value, 2),
    })),
  };
}
