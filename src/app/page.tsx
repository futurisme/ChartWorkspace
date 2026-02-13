'use client';

import { Orbitron } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['400', '500', '700', '900'] });

const heroStages = [
  { title: 'Mind', subtitle: 'Workspace' },
  { title: 'MindMap', subtitle: 'Workspace' },
  { title: 'MindMapper', subtitle: 'Work' },
  { title: 'MindMapper', subtitle: 'Workspace' },
];

export default function LandingPage() {
  const [stageIndex, setStageIndex] = useState(heroStages.length - 1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStageIndex((prev) => (prev + 1) % heroStages.length);
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  const currentStage = useMemo(() => heroStages[stageIndex], [stageIndex]);

  return (
    <main className={styles.main}>
      <div className={styles.futuristicImage} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowTop}`} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowBottom}`} aria-hidden="true" />

      <section className={styles.panel}>
        <p className={`${orbitron.className} ${styles.quote}`}>
          “Create your fate, innovate and elevate” <span className={styles.quoteAuthor}>— Fadhil</span>
        </p>

        <div className={styles.content}>
          <div>
            <p className={`${orbitron.className} ${styles.tag}`}>RELEASE MODE</p>
            <h1 className={`${orbitron.className} ${styles.title}`}>
              <span key={`title-${currentStage.title}`} className={`${styles.titlePrimary} ${styles.dynamicWord}`}>
                {currentStage.title}
              </span>
              <span key={`subtitle-${currentStage.subtitle}`} className={`${styles.titleSecondary} ${styles.dynamicWord}`}>
                {currentStage.subtitle}
              </span>
            </h1>
            <p className={styles.description}>
              MindMapper Workspace adalah experience mapping super-futuristik yang bikin ide berkembang lebih cepat, lebih presisi,
              dan lebih visual. Kolaborasi real-time, alur kerja modern, dan sentuhan cybernetic yang &quot;wah&quot; hadir tanpa membebani
              performa workspace editor utama.
            </p>

            <Link href="/workspace" className={`${styles.button} ${orbitron.className}`} aria-label="Get started and open workspace">
              Get Started
            </Link>
          </div>

          <aside className={styles.credit}>
            <p className={`${orbitron.className} ${styles.creditText}`}>By Fadhil Akbar</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
