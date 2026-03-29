'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
  ActionGroup,
  Container,
  Field,
  Metric,
  Notice,
  Panel,
  Section,
  Stack,
  ThemeScope,
} from '@/lib/fadhilweblib';
import { Input, Select } from '@/lib/fadhilweblib';
import { Button, SegmentedControl } from '@/lib/fadhilweblib/client';
import type { CompanyKey, ProfileDraft } from '@/features/gameplay/simulation-engine';
import { deckPanelRecipe, deckSectionRecipe } from './recipes';
import styles from './game-command-deck.module.css';

const GameCommandDeckRuntime = dynamic(
  () => import('./GameCommandDeckRuntime').then((mod) => mod.GameCommandDeckRuntime),
  {
    ssr: false,
    loading: () => (
      <ThemeScope theme="game" className={styles.shell}>
        <Container maxWidth="sm">
          <Section surface recipe={deckSectionRecipe} eyebrow="/game" title="Loading simulator runtime" description="Initializing the command-deck runtime." />
        </Container>
      </ThemeScope>
    ),
  }
);

const STORAGE_KEY = 'career-simulator-profile-sim-v12';

const DEFAULT_BOOT_DRAFT: ProfileDraft = {
  name: '',
  background: 'Independent investor with a technology thesis',
  companyType: 'cpu',
  selectedCompany: 'cosmic',
};

const COMPANY_OPTIONS: CompanyKey[] = ['cosmic', 'rmd', 'heroscop', 'venture4', 'venture5', 'venture6', 'venture7', 'venture8'];

export function GameCommandDeck() {
  const [bootDraft, setBootDraft] = useState<ProfileDraft>(DEFAULT_BOOT_DRAFT);
  const [bootStatus, setBootStatus] = useState<'checking' | 'landing' | 'runtime'>('checking');
  const [autoCreateProfile, setAutoCreateProfile] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Prepare a profile to enter the simulator.');

  useEffect(() => {
    try {
      const hasSavedGame = typeof window !== 'undefined' && Boolean(window.localStorage.getItem(STORAGE_KEY));
      setBootStatus(hasSavedGame ? 'runtime' : 'landing');
      if (hasSavedGame) {
        setStatusMessage('Found an existing command-deck save. Loading runtime.');
      }
    } catch {
      setBootStatus('landing');
    }
  }, []);

  if (bootStatus === 'runtime') {
    return <GameCommandDeckRuntime initialProfileDraft={autoCreateProfile ? bootDraft : undefined} autoCreateProfile={autoCreateProfile} />;
  }

  return (
    <ThemeScope theme="game" className={styles.shell}>
      <Container maxWidth="sm">
        <Stack gap="lg" className={styles.stack}>
          <Section
            surface
            recipe={deckSectionRecipe}
            eyebrow="/game"
            title={bootStatus === 'checking' ? 'Preparing command deck' : 'Launch the command deck'}
            description="A compact Android-first boot surface that keeps the heavy runtime deferred until the simulator is actually needed."
          >
            {bootStatus === 'checking' ? (
              <Notice tone="info" title="Checking save slot" description="Looking for an existing /game command-deck profile." />
            ) : (
              <Stack gap="lg">
                <Panel recipe={deckPanelRecipe}>
                  <Stack gap="md">
                    <Field label="Profile name" htmlFor="boot-name">
                      <Input
                        id="boot-name"
                        value={bootDraft.name}
                        onChange={(event) => setBootDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Arka Vega"
                      />
                    </Field>
                    <Field label="Background" htmlFor="boot-background">
                      <Input
                        id="boot-background"
                        value={bootDraft.background}
                        onChange={(event) => setBootDraft((current) => ({ ...current, background: event.target.value }))}
                        placeholder="Independent investor with a technology thesis"
                      />
                    </Field>
                    <Field label="Company path">
                      <SegmentedControl
                        fullWidth
                        tone="info"
                        value={bootDraft.companyType}
                        onValueChange={(value) => setBootDraft((current) => ({ ...current, companyType: value as typeof current.companyType }))}
                        items={[
                          { value: 'cpu', label: 'CPU' },
                          { value: 'game', label: 'Game' },
                          { value: 'software', label: 'Software' },
                        ]}
                      />
                    </Field>
                    <Field label="Starting company" htmlFor="boot-company">
                      <Select
                        id="boot-company"
                        value={bootDraft.selectedCompany}
                        onChange={(event) => setBootDraft((current) => ({ ...current, selectedCompany: event.target.value as CompanyKey }))}
                      >
                        {COMPANY_OPTIONS.map((companyKey) => (
                          <option key={companyKey} value={companyKey}>
                            {companyKey.toUpperCase()}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <ActionGroup gap="sm" wrap>
                      <Button
                        tone="brand"
                        onClick={() => {
                          if (!bootDraft.name.trim()) {
                            setStatusMessage('Enter a profile name first.');
                            return;
                          }
                          setAutoCreateProfile(true);
                          setBootStatus('runtime');
                        }}
                      >
                        Enter simulator
                      </Button>
                      <Button tone="neutral" onClick={() => setBootStatus('runtime')}>
                        Load runtime only
                      </Button>
                    </ActionGroup>
                  </Stack>
                </Panel>

                <div className={styles.metricGrid}>
                  <Metric label="Runtime mode" value="Deferred" description="Heavy gameplay logic loads only when the simulator is entered." />
                  <Metric label="Starting path" value={bootDraft.companyType.toUpperCase()} description={`Company ${bootDraft.selectedCompany.toUpperCase()}`} />
                </div>

                <Notice tone="info" title="Status" description={statusMessage} />
              </Stack>
            )}
          </Section>
        </Stack>
      </Container>
    </ThemeScope>
  );
}
