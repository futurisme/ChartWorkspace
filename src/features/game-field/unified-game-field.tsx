'use client';

import { useState } from 'react';
import { CpuFoundrySim } from '@/features/cpu-foundry/cpu-foundry-sim';
import { GameStudioSim } from '@/features/game-studio/game-studio-sim';
import styles from './unified-game-field.module.css';

type GameplayMode = 'cpu' | 'studio';

export function UnifiedGameField() {
  const [mode, setMode] = useState<GameplayMode>('cpu');

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>MindMapper · Unified Game Field</h1>
          <p className={styles.sub}>One title, merged gameplay flow: CPU Investor + Studio Simulation.</p>
        </div>

        <nav className={styles.tabs} aria-label="Gameplay mode selector">
          <button
            className={`${styles.tab} ${mode === 'cpu' ? styles.tabActive : ''}`}
            onClick={() => setMode('cpu')}
            type="button"
          >
            CPU Gameplay
          </button>
          <button
            className={`${styles.tab} ${mode === 'studio' ? styles.tabActive : ''}`}
            onClick={() => setMode('studio')}
            type="button"
          >
            Studio Gameplay
          </button>
        </nav>
      </header>

      <section className={styles.content}>
        {mode === 'cpu' ? <CpuFoundrySim /> : <GameStudioSim />}
      </section>
    </main>
  );
}
