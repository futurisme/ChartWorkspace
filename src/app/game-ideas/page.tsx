'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_GAME_IDEA_DATA,
  GAME_IDEA_NAV_ORDER,
  GAME_IDEA_STORAGE_KEY,
  sanitizeGameIdeaDatabase,
  type GameIdeaDatabase,
  type GameIdeaItem,
  type GameIdeaNav,
} from '@/features/game-ideas/shared/schema';

type ItemDraft = {
  name: string;
  tag: string;
  desc: string;
  stats: string;
};

const SAVE_DEBOUNCE_MS = 420;

function emptyDraft(): ItemDraft {
  return { name: '', tag: '', desc: '', stats: '' };
}

function parseStats(input: string) {
  const stats: Record<string, string> = {};

  input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [rawKey, ...rawValueParts] = entry.split(':');
      const key = rawKey?.trim();
      const value = rawValueParts.join(':').trim();
      if (!key || !value) return;
      stats[key.slice(0, 32)] = value.slice(0, 80);
    });

  return stats;
}

export default function GameIdeasPage() {
  const [db, setDb] = useState<GameIdeaDatabase>(DEFAULT_GAME_IDEA_DATA);
  const [nav, setNav] = useState<GameIdeaNav>('govt');
  const [category, setCategory] = useState(DEFAULT_GAME_IDEA_DATA.govt.categories[0] ?? '');
  const [openCardIndex, setOpenCardIndex] = useState<number | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyDraft());
  const [categoryDraft, setCategoryDraft] = useState('');

  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSection = db[nav];
  const categoryList = currentSection.categories;
  const currentCategory = category || categoryList[0] || '';
  const items = currentSection.data[currentCategory] ?? [];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = localStorage.getItem(GAME_IDEA_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as unknown;
        setDb(sanitizeGameIdeaDatabase(parsed));
      } catch {
        localStorage.removeItem(GAME_IDEA_STORAGE_KEY);
      }
    }

    const controller = new AbortController();

    const loadServer = async () => {
      try {
        const response = await fetch('/api/game-ideas', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Gagal memuat data dari server.');
        }

        const payload = (await response.json()) as { data?: unknown };
        const sanitized = sanitizeGameIdeaDatabase(payload.data);
        setDb(sanitized);
        localStorage.setItem(GAME_IDEA_STORAGE_KEY, JSON.stringify(sanitized));
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Gagal memuat data server.');
        }
      } finally {
        hydratedRef.current = true;
        setLoading(false);
      }
    };

    void loadServer();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const firstCategory = db[nav].categories[0] ?? '';
    setCategory((prev) => (db[nav].categories.includes(prev) ? prev : firstCategory));
    setOpenCardIndex(null);
  }, [db, nav]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GAME_IDEA_STORAGE_KEY, JSON.stringify(db));
  }, [db]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaveState('saving');
        const response = await fetch('/api/game-ideas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: db }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Gagal menyimpan ke database.');
        }

        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [db]);

  const saveItem = useCallback(() => {
    const name = itemDraft.name.trim();
    if (!name || !currentCategory) {
      return;
    }

    const nextItem: GameIdeaItem = {
      name: name.slice(0, 120),
      tag: itemDraft.tag.trim().slice(0, 32),
      desc: itemDraft.desc.trim().slice(0, 1200),
      stats: parseStats(itemDraft.stats),
    };

    setDb((prev) => {
      const section = prev[nav];
      const oldItems = section.data[currentCategory] ?? [];

      return {
        ...prev,
        [nav]: {
          ...section,
          data: {
            ...section.data,
            [currentCategory]: [...oldItems, nextItem],
          },
        },
      };
    });

    setItemDraft(emptyDraft());
    setShowItemModal(false);
    setOpenCardIndex(null);
  }, [currentCategory, itemDraft, nav]);

  const deleteItem = useCallback(
    (index: number) => {
      setDb((prev) => {
        const section = prev[nav];
        const oldItems = section.data[currentCategory] ?? [];
        if (index < 0 || index >= oldItems.length) return prev;
        const next = oldItems.filter((_, i) => i !== index);

        return {
          ...prev,
          [nav]: {
            ...section,
            data: {
              ...section.data,
              [currentCategory]: next,
            },
          },
        };
      });

      setOpenCardIndex(null);
    },
    [currentCategory, nav]
  );

  const saveCategory = useCallback(() => {
    const categoryName = categoryDraft.trim().toUpperCase();
    if (!categoryName) return;

    setDb((prev) => {
      const section = prev[nav];
      if (section.categories.includes(categoryName)) {
        return prev;
      }

      return {
        ...prev,
        [nav]: {
          ...section,
          categories: [...section.categories, categoryName],
          data: {
            ...section.data,
            [categoryName]: [],
          },
        },
      };
    });

    setCategory(categoryName);
    setCategoryDraft('');
    setShowCategoryModal(false);
  }, [categoryDraft, nav]);

  const statusLabel = useMemo(() => {
    if (saveState === 'saving') return 'SYNCING...';
    if (saveState === 'saved') return 'SYNCED';
    if (saveState === 'error') return 'SYNC ERROR';
    return loading ? 'BOOTING...' : 'READY';
  }, [loading, saveState]);

  return (
    <main className="architect-shell">
      <header className="architect-header">
        <h1>CODEX : ARCHITECT</h1>
        <div className="header-actions">
          <span className={`sync-state ${saveState}`}>{statusLabel}</span>
          <button type="button" className="admin-toggle" onClick={() => setAdminMode((prev) => !prev)}>
            ADMIN MODE: {adminMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <nav className="sub-tabs">
            {categoryList.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`tab-btn ${cat === currentCategory ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </nav>
          {adminMode && (
            <button type="button" className="add-category" onClick={() => setShowCategoryModal(true)}>
              + CATEGORY
            </button>
          )}
        </aside>

        <section className="content-area">
          {items.map((item, index) => (
            <article key={`${item.name}-${index}`} className={`card ${openCardIndex === index ? 'open' : ''}`}>
              {adminMode && (
                <div className="admin-tools">
                  <button type="button" className="btn-icon del" onClick={() => deleteItem(index)}>
                    DELETE
                  </button>
                </div>
              )}
              <button type="button" className="card-head" onClick={() => setOpenCardIndex((prev) => (prev === index ? null : index))}>
                <h3>{item.name}</h3>
                <span className="tag">{item.tag || 'UNTAGGED'}</span>
              </button>
              <div className="card-body-wrapper">
                <div className="card-body">
                  <div className="inner">
                    <p className="desc">{item.desc || 'No description.'}</p>
                    {Object.entries(item.stats).length === 0 ? (
                      <p className="desc">No stats.</p>
                    ) : (
                      Object.entries(item.stats).map(([key, value]) => (
                        <div key={`${item.name}-${key}`} className="stat">
                          <span>{key}</span>
                          <span>{value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {adminMode && (
            <button type="button" className="add-btn-main" onClick={() => setShowItemModal(true)}>
              [+] UPLOAD_NEW_RECORD
            </button>
          )}

          {!loading && items.length === 0 && !adminMode && <p className="empty-hint">Belum ada ide di kategori ini.</p>}
          {error && <p className="error-hint">{error}</p>}
        </section>
      </div>

      <footer className="footer">
        {GAME_IDEA_NAV_ORDER.map((key) => (
          <button key={key} type="button" className={`nav-item ${nav === key ? 'active' : ''}`} onClick={() => setNav(key)}>
            {key.toUpperCase()}
          </button>
        ))}
      </footer>

      {showItemModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>UPLOADING DATA_ENTRY</h2>
            <div className="input-group">
              <label>ENTRY NAME</label>
              <input value={itemDraft.name} onChange={(e) => setItemDraft((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>TAG (e.g. ALPHA, REQ, MAX)</label>
              <input value={itemDraft.tag} onChange={(e) => setItemDraft((prev) => ({ ...prev, tag: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>DESCRIPTION</label>
              <textarea rows={3} value={itemDraft.desc} onChange={(e) => setItemDraft((prev) => ({ ...prev, desc: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>STATS (Format: Power:10, HP:100)</label>
              <input value={itemDraft.stats} onChange={(e) => setItemDraft((prev) => ({ ...prev, stats: e.target.value }))} />
            </div>
            <div className="modal-btns">
              <button type="button" className="btn-abort" onClick={() => setShowItemModal(false)}>ABORT</button>
              <button type="button" className="btn-confirm" onClick={saveItem}>EXECUTE_SAVE</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>NEW_CATEGORY_NODE</h2>
            <div className="input-group">
              <label>CATEGORY NAME</label>
              <input value={categoryDraft} onChange={(e) => setCategoryDraft(e.target.value)} />
            </div>
            <div className="modal-btns">
              <button type="button" className="btn-abort" onClick={() => setShowCategoryModal(false)}>ABORT</button>
              <button type="button" className="btn-confirm" onClick={saveCategory}>INITIATE</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .architect-shell {
          --bg: #010103;
          --surface: rgba(10, 10, 15, 0.8);
          --accent: #00f2ff;
          --accent2: #bc13fe;
          --text: #e0e0e0;
          --dim: #555;
          --border: rgba(0, 242, 255, 0.3);
          --neon: 0 0 7px rgba(0, 242, 255, 0.4), 0 0 20px rgba(0, 242, 255, 0.2);
          --neon-intense: 0 0 10px #00f2ff, 0 0 30px rgba(0, 242, 255, 0.5), 0 0 60px rgba(0, 242, 255, 0.2);
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background-color: var(--bg);
          background-image: linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(188, 19, 254, 0.05) 0%, transparent 70%);
          background-size: 40px 40px, 40px 40px, 100% 100%;
          color: var(--text);
          font-size: 13px;
          overflow: hidden;
        }
        .architect-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .architect-header h1 { font-size: 1rem; letter-spacing: 4px; color: #fff; text-shadow: var(--neon-intense); }
        .header-actions { display: flex; gap: 8px; align-items: center; }
        .sync-state { font-size: 10px; letter-spacing: 1px; color: #75f7ff; }
        .sync-state.error { color: #fb7185; }
        .admin-toggle, .add-category, .nav-item, .tab-btn, .add-btn-main, .card-head, .btn-icon, .btn-abort, .btn-confirm {
          font-family: inherit;
        }
        .admin-toggle {
          padding: 8px 12px;
          border: 1px solid var(--dim);
          color: var(--dim);
          background: transparent;
          cursor: pointer;
        }
        .layout { flex: 1; display: flex; gap: 12px; padding: 12px; min-height: 0; }
        .sidebar { width: 180px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
        .sub-tabs { display: flex; flex-direction: column; gap: 6px; overflow: auto; }
        .tab-btn {
          padding: 12px;
          text-align: left;
          border: 1px solid rgba(255,255,255,0.08);
          background: var(--surface);
          color: var(--dim);
          cursor: pointer;
        }
        .tab-btn.active {
          color: var(--accent);
          border-color: var(--accent);
          background: linear-gradient(90deg, rgba(0, 242, 255, 0.15), transparent);
          text-shadow: var(--neon);
        }
        .add-category {
          padding: 10px;
          border: 1px dashed var(--accent2);
          background: rgba(188, 19, 254, 0.08);
          color: var(--accent2);
          cursor: pointer;
        }
        .content-area { flex: 1; min-height: 0; overflow: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; align-content: start; padding-right: 4px; }
        .card {
          position: relative;
          background: var(--surface);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .admin-tools { position: absolute; right: 8px; top: 8px; z-index: 2; }
        .btn-icon.del { background: rgba(255, 42, 95, 0.2); color: #ff2a5f; border: 1px solid #ff2a5f; padding: 4px 8px; cursor: pointer; }
        .card-head {
          width: 100%;
          border: 0;
          background: transparent;
          color: inherit;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }
        .card-head h3 { text-align: left; font-size: 13px; color: #fff; }
        .tag { font-size: 9px; color: var(--accent2); border: 1px solid var(--accent2); padding: 2px 5px; }
        .card-body-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 180ms ease; }
        .card.open .card-body-wrapper { grid-template-rows: 1fr; }
        .card-body { overflow: hidden; }
        .inner { padding: 0 16px 14px; border-top: 1px solid rgba(0, 242, 255, 0.1); }
        .desc { color: #9ca3af; margin: 10px 0; font-size: 11px; line-height: 1.5; }
        .stat { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 11px; }
        .stat span:first-child { color: var(--dim); }
        .stat span:last-child { color: var(--accent); font-weight: 700; }
        .add-btn-main { min-height: 80px; border: 2px dashed var(--border); color: var(--accent); background: transparent; cursor: pointer; }
        .footer { display: flex; justify-content: space-around; border-top: 1px solid var(--border); padding: 12px; background: #000; }
        .nav-item { border: 0; background: transparent; color: var(--dim); padding: 8px 12px; cursor: pointer; font-size: 10px; font-weight: 700; }
        .nav-item.active { color: var(--accent); text-shadow: var(--neon); }
        .empty-hint, .error-hint { font-size: 12px; color: #9ca3af; }
        .error-hint { color: #fb7185; }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal { width: min(540px, 100%); background: #0a0a0f; border: 1px solid var(--accent2); padding: 20px; }
        .modal h2 { color: var(--accent2); margin-bottom: 14px; font-size: 16px; }
        .input-group { margin-bottom: 10px; }
        .input-group label { display: block; color: #64748b; font-size: 10px; margin-bottom: 6px; }
        .input-group input, .input-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #334155;
          background: rgba(255,255,255,0.03);
          color: #e2e8f0;
          outline: 0;
        }
        .input-group input:focus, .input-group textarea:focus { border-color: var(--accent); }
        .modal-btns { display: flex; gap: 8px; }
        .btn-abort, .btn-confirm { flex: 1; padding: 10px; cursor: pointer; }
        .btn-abort { border: 1px solid #475569; background: transparent; color: #94a3b8; }
        .btn-confirm { border: 0; background: var(--accent); color: #020617; font-weight: 800; }

        @media (max-width: 768px) {
          .architect-header { padding: 10px; }
          .architect-header h1 { font-size: 0.88rem; letter-spacing: 2px; }
          .layout { flex-direction: column; padding: 10px; }
          .sidebar { width: 100%; }
          .sub-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: 132px; }
          .tab-btn { text-align: center; padding: 10px 8px; }
          .content-area { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
