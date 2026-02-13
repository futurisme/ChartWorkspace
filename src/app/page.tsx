'use client';

import { Orbitron } from 'next/font/google';
import Link from 'next/link';
import styles from './page.module.css';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['400', '500', '700', '900'] });

export default function LandingPage() {
  return (
    <main className={styles.main}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowTop}`} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowBottom}`} aria-hidden="true" />

      <section className={styles.panel}>
        <p className={`${orbitron.className} ${styles.quote}`}>
          “Create your fate, innovate and elevate” — Fadhil
        </p>

        <div className={styles.content}>
          <div>
            <p className={`${orbitron.className} ${styles.tag}`}>RELEASE MODE</p>
            <h1 className={`${orbitron.className} ${styles.title}`}>
              <span className={styles.titlePrimary}>MindMapper</span>
              <span className={styles.titleSecondary}>Workspace</span>
            </h1>
            <p className={styles.description}>
              MindMapper Workspace menghadirkan pengalaman membangun peta konsep yang super futuristik: cepat, kolaboratif,
              dan imersif. Setiap ide bisa kamu rancang dengan presisi cybernetic, sambil menikmati interaksi visual dinamis
              yang tetap ringan untuk produktivitas harian.
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
