'use client';

import { Orbitron } from 'next/font/google';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['400', '500', '700'] });

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className={styles.main}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowTop}`} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowBottom}`} aria-hidden="true" />

      <section className={styles.panel}>
        <div className={styles.content}>
          <div>
            <p className={`${orbitron.className} ${styles.tag}`}>RELEASE MODE</p>
            <h1 className={`${orbitron.className} text-4xl font-semibold leading-tight text-cyan-100 lg:text-6xl`}>
              ChartMaker
              <span className="mt-2 block text-fuchsia-300">Cybernetic Workspace</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm text-slate-200 lg:text-base">
              Build collaborative concept maps in a cyberpunk-inspired environment. Start from a blank blueprint or continue your
              previous flow with real-time editing and futuristic interaction.
            </p>

            <button
              type="button"
              onClick={() => router.push('/workspace')}
              className={`${styles.button} ${orbitron.className}`}
            >
              Get Started
            </button>
          </div>

          <aside className={styles.credit}>
            <p className={`${orbitron.className} text-sm uppercase tracking-[0.3em] text-fuchsia-200/90`}>By Fadhil Akbar</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
