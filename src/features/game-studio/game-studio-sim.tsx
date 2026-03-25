'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './game-studio-sim.module.css';
import {
  COMPANY_KEYS,
  DEFAULT_COMPANY_PANELS,
  DEFAULT_GAME_DETAIL_PANELS,
  DEFAULT_PROFILE_DRAFT,
  STORAGE_KEY,
  TICK_MS,
  createInitialGameState,
  formatCurrency,
  formatDateFromDays,
  formatNumber,
  formatPercent,
  simulateTick,
  upgradeResearchTrack,
  type CompanyKey,
  type CompanyPanelKey,
  type GameDetailPanelKey,
  type GameState,
  type ProfileDraft
} from './game-studio-sim-engine';

export function GameStudioSim() {
  const [game, setGame] = useState<GameState | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(DEFAULT_PROFILE_DRAFT);
  const [status, setStatus] = useState('Create a profile to start the game-company simulation.');
  const [focusedCompany, setFocusedCompany] = useState<CompanyKey>('nova');
  const [focusedGameId, setFocusedGameId] = useState<string | null>(null);
  const [companyPanels, setCompanyPanels] = useState<Record<CompanyPanelKey, boolean>>(DEFAULT_COMPANY_PANELS);
  const [gamePanels, setGamePanels] = useState<Record<GameDetailPanelKey, boolean>>(DEFAULT_GAME_DETAIL_PANELS);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as GameState;
      setGame(parsed);
      setFocusedCompany(parsed.player.selectedCompany);
      setStatus('Saved simulation loaded.');
    } catch {
      setStatus('Failed to load previous save.');
    }
  }, []);

  useEffect(() => {
    if (!game) return;
    const timer = window.setInterval(() => {
      setGame((current) => (current ? simulateTick(current) : current));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [game]);

  useEffect(() => {
    if (!game) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  const company = game?.companies[focusedCompany] ?? null;
  const focusedGame = useMemo(() => company?.releasedGames.find((entry) => entry.id === focusedGameId) ?? null, [company, focusedGameId]);

  const beginSimulation = () => {
    if (!profileDraft.name.trim()) {
      setStatus('Name is required.');
      return;
    }
    const next = createInitialGameState(profileDraft);
    setGame(next);
    setFocusedCompany(profileDraft.selectedCompany);
    setStatus('Simulation is running.');
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>MindMapper · Game Company Simulator</h1>
          <p className={styles.sub}>Date: {game ? formatDateFromDays(game.elapsedDays) : 'not started'}</p>
        </div>
        <span className={styles.tag}>{status}</span>
      </header>

      <section className={styles.layout}>
        <aside className={styles.profile}>
          <h2>Profile</h2>
          <input className={styles.input} placeholder="Player name" value={profileDraft.name} onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))} />
          <textarea className={styles.textarea} placeholder="Background" value={profileDraft.background} onChange={(e) => setProfileDraft((p) => ({ ...p, background: e.target.value }))} />
          <select className={styles.select} value={profileDraft.category} onChange={(e) => setProfileDraft((p) => ({ ...p, category: e.target.value as ProfileDraft['category'] }))}>
            <option value="game">Game Company</option>
            <option value="semiconductor">Semiconductor Company (shared profile category)</option>
          </select>
          <select className={styles.select} value={profileDraft.selectedCompany} onChange={(e) => setProfileDraft((p) => ({ ...p, selectedCompany: e.target.value as CompanyKey }))}>
            {COMPANY_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
          <button className={styles.button} onClick={beginSimulation}>Start / Reset</button>

          {game && (
            <div className={styles.feed}>
              {game.feed.map((entry, index) => <p className={styles.kv} key={`${entry}-${index}`}>• {entry}</p>)}
            </div>
          )}
        </aside>

        <section>
          <div className={styles.cardGrid}>
            {game && COMPANY_KEYS.map((key) => {
              const item = game.companies[key];
              return (
                <article className={styles.card} key={key} onClick={() => { setFocusedCompany(key); setFocusedGameId(null); }}>
                  <div className={styles.row}><strong>{item.name}</strong><span className={styles.tag}>cash {formatCurrency(item.cash)}</span></div>
                  <p className={styles.kv}>CEO: {item.ceo}</p>
                  <p className={styles.kv}>Released games: {item.releasedGames.length}</p>
                </article>
              );
            })}
          </div>

          {company && (
            <div className={styles.subFrame}>
              <h3>{company.name}</h3>

              <button className={styles.panelHead} onClick={() => setCompanyPanels((p) => ({ ...p, management: !p.management }))}>Management</button>
              {companyPanels.management && (
                <div className={styles.panel}>
                  <p className={styles.kv}>CEO: {company.ceo}</p>
                  {company.executives.map((exec) => <p className={styles.kv} key={exec.role}>{exec.role}: {exec.name} ({exec.experienceYears} years)</p>)}
                  <p className={styles.kv}>Lead Developer: {company.staff.leadDeveloper}</p>
                  <p className={styles.kv}>Lead Engineer: {company.staff.leadEngineer}</p>
                </div>
              )}

              <button className={styles.panelHead} onClick={() => setCompanyPanels((p) => ({ ...p, games: !p.games }))}>Game</button>
              {companyPanels.games && (
                <div className={styles.panel}>
                  <p className={styles.kv}>Active games: {company.activeGameIds.length}</p>
                  <div className={styles.list}>
                    {company.releasedGames.map((entry) => (
                      <article key={entry.id} className={styles.card} onClick={() => setFocusedGameId(entry.id)}>
                        <div className={styles.row}><strong>{entry.title}</strong><span className={styles.tag}>v{entry.version.toFixed(1)}</span></div>
                        <p className={styles.kv}>Downloads: {formatNumber(entry.downloads)}</p>
                        <p className={styles.kv}>Dynamic popularity: {formatPercent(entry.popularity)}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <button className={styles.panelHead} onClick={() => setCompanyPanels((p) => ({ ...p, research: !p.research }))}>Research / Upgrade</button>
              {companyPanels.research && (
                <div className={styles.panel}>
                  {company.researchTracks.map((track) => (
                    <div key={track.key} className={styles.card}>
                      <div className={styles.row}><strong>{track.label}</strong><span className={styles.tag}>Lv {track.level}/{track.cap}</span></div>
                      <p className={styles.kv}>{track.impact}</p>
                      <button
                        className={styles.button}
                        disabled={track.level >= track.cap || company.cash < track.researchCost}
                        onClick={() => setGame((current) => {
                          if (!current) return current;
                          return {
                            ...current,
                            companies: {
                              ...current.companies,
                              [company.key]: upgradeResearchTrack(current.companies[company.key], track.key)
                            }
                          };
                        })}
                      >
                        Upgrade ({formatCurrency(track.researchCost)})
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {focusedGame && (
                <div className={styles.subFrame}>
                  <h4>{focusedGame.title}</h4>
                  <p className={styles.kv}>Genre: {focusedGame.genre}</p>
                  <p className={styles.kv}>Online/Offline: {focusedGame.mode}</p>

                  <button className={styles.panelHead} onClick={() => setGamePanels((p) => ({ ...p, community: !p.community }))}>Community</button>
                  {gamePanels.community && (
                    <div className={styles.panel}>
                      <p className={styles.kv}>Server: {focusedGame.community.serverName}</p>
                      <p className={styles.kv}>Members: {formatNumber(focusedGame.community.members)}</p>
                      <p className={styles.kv}>Activity: {formatPercent(focusedGame.community.activityRate)}</p>
                    </div>
                  )}

                  <button className={styles.panelHead} onClick={() => setGamePanels((p) => ({ ...p, criticism: !p.criticism }))}>Criticism & suggestions</button>
                  {gamePanels.criticism && (
                    <div className={styles.panel}>
                      {focusedGame.criticisms.map((item, i) => <p key={`${item}-${i}`} className={styles.kv}>• {item}</p>)}
                    </div>
                  )}

                  <button className={styles.panelHead} onClick={() => setGamePanels((p) => ({ ...p, engine: !p.engine }))}>Research / Upgrade panel</button>
                  {gamePanels.engine && (
                    <div className={styles.panel}>
                      {company.researchTracks.map((track) => (
                        <p className={styles.kv} key={track.key}>{track.label}: Lv {track.level}/{track.cap}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
