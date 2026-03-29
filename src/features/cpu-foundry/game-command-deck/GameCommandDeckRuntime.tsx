'use client';

import dynamic from 'next/dynamic';
import { Container, Section, Stack, Surface, ThemeScope } from '@/lib/fadhilweblib';
import { Button, Tabs } from '@/lib/fadhilweblib/client';
import type { ProfileDraft } from '@/features/gameplay/simulation-engine';
import { useGameCommandDeckController } from './controller';
import { CommandHeader } from './command-header';
import { ProfileDesk } from './profile-desk';
import { dockButtonRecipe } from './recipes';
import styles from './game-command-deck.module.css';

const CompanyWorkspace = dynamic(
  () => import('./company-workspace').then((mod) => mod.CompanyWorkspace),
  { ssr: false, loading: () => <Section surface title="Loading company workspace" /> }
);

const MarketDesk = dynamic(
  () => import('./market-desk').then((mod) => mod.MarketDesk),
  { ssr: false, loading: () => <Section surface title="Loading market desk" /> }
);

const IntelDesk = dynamic(
  () => import('./intel-desk').then((mod) => mod.IntelDesk),
  { ssr: false, loading: () => <Section surface title="Loading intel desk" /> }
);

const UrgentOverlays = dynamic(
  () => import('./urgent-overlays').then((mod) => mod.UrgentOverlays),
  { ssr: false }
);

type GameCommandDeckRuntimeProps = {
  initialProfileDraft?: ProfileDraft | null;
  autoCreateProfile?: boolean;
};

export function GameCommandDeckRuntime({ initialProfileDraft, autoCreateProfile = false }: GameCommandDeckRuntimeProps) {
  const controller = useGameCommandDeckController({
    initialProfileDraft,
    autoCreateProfile,
  });

  return (
    <ThemeScope theme="game" className={styles.shell}>
      <Container maxWidth="md">
        <Stack gap="lg" className={styles.stack}>
          <CommandHeader controller={controller} />

          {!controller.game ? (
            <ProfileDesk controller={controller} />
          ) : (
            <>
              <Tabs
                keepMounted={false}
                tone="info"
                value={controller.topLevelTab}
                onValueChange={(value) => controller.setTopLevelTab(value as typeof controller.topLevelTab)}
                items={[
                  { value: 'command', label: 'Command', badge: controller.activePlayerBoardVote ? '1' : undefined, content: <ProfileDesk controller={controller} /> },
                  { value: 'company', label: 'Company', content: <CompanyWorkspace controller={controller} /> },
                  { value: 'market', label: 'Market', content: <MarketDesk controller={controller} /> },
                  { value: 'intel', label: 'Intel', content: <IntelDesk controller={controller} /> },
                ]}
              />

              <Surface variant="elevated" density="compact" className={styles.stickyDock}>
                <div className={styles.dockRow}>
                  <Button recipe={dockButtonRecipe} onClick={() => controller.setTopLevelTab('command')}>
                    Command
                  </Button>
                  <Button recipe={dockButtonRecipe} onClick={() => controller.setTopLevelTab('company')}>
                    Company
                  </Button>
                  <Button recipe={dockButtonRecipe} onClick={() => controller.setTopLevelTab('market')}>
                    Market
                  </Button>
                  <Button recipe={dockButtonRecipe} onClick={() => controller.setTopLevelTab('intel')}>
                    Intel
                  </Button>
                </div>
              </Surface>
            </>
          )}

          <Section surface eyebrow="Runtime" title="Client-side simulation" description="The /game deck stays client-only for storage, timers, and progression cadence." />
        </Stack>
      </Container>

      {controller.game ? <UrgentOverlays controller={controller} /> : null}
    </ThemeScope>
  );
}
