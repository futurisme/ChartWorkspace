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

type ConfirmDeleteAction =
  | { type: 'item'; index: number; label: string }
  | { type: 'category'; category: string; label: string }
  | null;

type RenameAction =
  | { type: 'item'; index: number; currentName: string }
  | { type: 'category'; currentName: string }
  | { type: 'nav'; navKey: GameIdeaNav; currentName: string }
  | null;

const SAVE_DEBOUNCE_MS = 420;
const RENAME_CLICK_COUNT = 4;
const RECOLOR_CLICK_COUNT = 5;
const MULTI_CLICK_DELAY_MS = 190;
const ADMIN_ACCESS_CODE = 'IzinEditKhususGG123';

const PRIMARY_GRADIENTS = [
  'linear-gradient(135deg,#00f5ff 0%,#0066ff 100%)',
  'linear-gradient(135deg,#7c3aed 0%,#06b6d4 100%)',
  'linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)',
  'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
  'linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)',
] as const;

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

function normalizeCategoryName(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 32);
}

function normalizeTitleName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 64);
}

function nextGradient(current?: string) {
  const index = PRIMARY_GRADIENTS.findIndex((value) => value === current);
  return PRIMARY_GRADIENTS[(index + 1) % PRIMARY_GRADIENTS.length];
}

function hashDb(value: GameIdeaDatabase) {
  return JSON.stringify(value);
}

function mergeGameIdeaItems(localItems: GameIdeaItem[], remoteItems: GameIdeaItem[]): GameIdeaItem[] {
  const seen = new Set<string>();
  const merged: GameIdeaItem[] = [];

  [...remoteItems, ...localItems].forEach((item) => {
    const key = `${item.name.trim().toLowerCase()}|${item.tag.trim().toLowerCase()}|${item.desc.trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
}

function mergeGameIdeaDatabases(local: GameIdeaDatabase, remote: GameIdeaDatabase): GameIdeaDatabase {
  const merged = sanitizeGameIdeaDatabase(remote);

  GAME_IDEA_NAV_ORDER.forEach((navKey) => {
    const localSection = local[navKey];
    const remoteSection = merged[navKey];

    const categories = Array.from(new Set([...remoteSection.categories, ...localSection.categories]));
    const data: Record<string, GameIdeaItem[]> = {};

    categories.forEach((category) => {
      const remoteItems = remoteSection.data[category] ?? [];
      const localItems = localSection.data[category] ?? [];
      data[category] = mergeGameIdeaItems(localItems, remoteItems);
    });

    merged[navKey] = {
      ...remoteSection,
      categories,
      data,
    };
  });

  return sanitizeGameIdeaDatabase(merged);
}

export default function GameIdeasPage() {
  const [db, setDb] = useState<GameIdeaDatabase>(DEFAULT_GAME_IDEA_DATA);
  const [nav, setNav] = useState<GameIdeaNav>('govt');
  const [category, setCategory] = useState(DEFAULT_GAME_IDEA_DATA.govt.categories[0] ?? '');
  const [openCardIndex, setOpenCardIndex] = useState<number | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [syncNonce, setSyncNonce] = useState(0);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyDraft());
  const [categoryDraft, setCategoryDraft] = useState('');
  const [confirmDeleteAction, setConfirmDeleteAction] = useState<ConfirmDeleteAction>(null);
  const [renameAction, setRenameAction] = useState<RenameAction>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const hydratedRef = useRef(false);
  const dbRef = useRef(DEFAULT_GAME_IDEA_DATA);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverVersionRef = useRef<number | null>(null);
  const lastSyncedHashRef = useRef<string | null>(null);
  const lastLocalCacheHashRef = useRef<string | null>(null);
  const lastHandledManualSyncRef = useRef(0);
  const multiClickTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dbHash = useMemo(() => hashDb(db), [db]);
  const currentSection = useMemo(() => db[nav], [db, nav]);
  const categoryList = currentSection.categories;
  const currentCategory = category || categoryList[0] || '';
  const items = useMemo(() => currentSection.data[currentCategory] ?? [], [currentCategory, currentSection.data]);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let localDb = DEFAULT_GAME_IDEA_DATA;
    const cached = localStorage.getItem(GAME_IDEA_STORAGE_KEY);

    if (cached) {
      try {
        localDb = sanitizeGameIdeaDatabase(JSON.parse(cached) as unknown);
        setDb(localDb);
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

        const payload = (await response.json()) as { data?: unknown; version?: number };
        const remote = sanitizeGameIdeaDatabase(payload.data);
        const merged = mergeGameIdeaDatabases(localDb, remote);

        serverVersionRef.current = typeof payload.version === 'number' ? payload.version : null;
        const mergedHash = hashDb(merged);
        lastSyncedHashRef.current = mergedHash;
        lastLocalCacheHashRef.current = mergedHash;
        setDb(merged);
        localStorage.setItem(GAME_IDEA_STORAGE_KEY, JSON.stringify(merged));
      } catch (err) {
        const localHash = hashDb(localDb);
        lastSyncedHashRef.current = localHash;
        lastLocalCacheHashRef.current = localHash;
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
    if (lastLocalCacheHashRef.current === dbHash) return;
    localStorage.setItem(GAME_IDEA_STORAGE_KEY, JSON.stringify(db));
    lastLocalCacheHashRef.current = dbHash;
  }, [db, dbHash]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const currentHash = dbHash;
    const manualSyncRequested = syncNonce !== lastHandledManualSyncRef.current;

    if (!manualSyncRequested && lastSyncedHashRef.current === currentHash) {
      return;
    }

    if (manualSyncRequested) {
      lastHandledManualSyncRef.current = syncNonce;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaveState('saving');
        setError('');

        const response = await fetch('/api/game-ideas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: dbRef.current,
            expectedVersion: serverVersionRef.current,
          }),
        });

        if (response.status === 409) {
          const conflictPayload = (await response.json()) as { data?: unknown; version?: number };
          const remote = sanitizeGameIdeaDatabase(conflictPayload.data);
          const merged = mergeGameIdeaDatabases(dbRef.current, remote);

          serverVersionRef.current = typeof conflictPayload.version === 'number' ? conflictPayload.version : serverVersionRef.current;
          setDb(merged);
          localStorage.setItem(GAME_IDEA_STORAGE_KEY, JSON.stringify(merged));
          setError('Conflict detected. Merging local and server data...');
          setSaveState('saving');
          return;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Gagal menyimpan ke database.');
        }

        const payload = (await response.json()) as { version?: number };
        if (typeof payload.version === 'number') {
          serverVersionRef.current = payload.version;
        }

        lastSyncedHashRef.current = hashDb(dbRef.current);
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
        setError(err instanceof Error ? err.message : 'Gagal sinkronisasi. Retry otomatis aktif.');
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        retryTimerRef.current = setTimeout(() => {
          setSyncNonce((prev) => prev + 1);
        }, 2200);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [db, dbHash, syncNonce]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      Object.values(multiClickTimerRef.current).forEach((timer) => clearTimeout(timer));
      multiClickTimerRef.current = {};
    },
    []
  );

  const triggerSyncNow = useCallback(() => {
    setSyncNonce((prev) => prev + 1);
  }, []);

  const requestEnableAdminMode = useCallback(() => {
    if (adminMode) {
      setAdminMode(false);
      return;
    }

    setAccessCodeInput('');
    setAccessCodeError('');
    setShowAccessModal(true);
  }, [adminMode]);

  const confirmEnableAdminMode = useCallback(() => {
    if (accessCodeInput.trim() !== ADMIN_ACCESS_CODE) {
      setAccessCodeError('Kode akses salah.');
      return;
    }

    setAdminMode(true);
    setShowAccessModal(false);
    setAccessCodeInput('');
    setAccessCodeError('');
  }, [accessCodeInput]);

  const saveItem = useCallback(() => {
    const name = itemDraft.name.trim();
    if (!name || !currentCategory) return;

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

  const saveCategory = useCallback(() => {
    const categoryName = normalizeCategoryName(categoryDraft);
    if (!categoryName) return;

    setDb((prev) => {
      const section = prev[nav];
      if (section.categories.includes(categoryName)) return prev;

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

  const requestRenameCategory = useCallback((targetCategory: string) => {
    setRenameAction({ type: 'category', currentName: targetCategory });
    setRenameDraft(targetCategory);
  }, []);

  const requestRenameItem = useCallback((index: number) => {
    const item = items[index];
    if (!item) return;

    setRenameAction({ type: 'item', index, currentName: item.name });
    setRenameDraft(item.name);
  }, [items]);

  const requestRenameNav = useCallback((navKey: GameIdeaNav) => {
    const navTitle = db[navKey].title?.trim() || navKey.toUpperCase();
    setRenameAction({ type: 'nav', navKey, currentName: navTitle });
    setRenameDraft(navTitle);
  }, [db]);

  const recolorCategory = useCallback((targetCategory: string) => {
    setDb((prev) => {
      const section = prev[nav];
      const current = section.categoryGradients?.[targetCategory];
      const next = nextGradient(current);

      return {
        ...prev,
        [nav]: {
          ...section,
          categoryGradients: {
            ...(section.categoryGradients ?? {}),
            [targetCategory]: next,
          },
        },
      };
    });
  }, [nav]);

  const recolorItem = useCallback((index: number) => {
    setDb((prev) => {
      const section = prev[nav];
      const existing = section.data[currentCategory] ?? [];
      if (index < 0 || index >= existing.length) return prev;

      const nextItems = existing.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          colorGradient: nextGradient(item.colorGradient),
        };
      });

      return {
        ...prev,
        [nav]: {
          ...section,
          data: {
            ...section.data,
            [currentCategory]: nextItems,
          },
        },
      };
    });
  }, [currentCategory, nav]);

  const recolorNav = useCallback((navKey: GameIdeaNav) => {
    setDb((prev) => {
      const section = prev[navKey];
      return {
        ...prev,
        [navKey]: {
          ...section,
          navGradient: nextGradient(section.navGradient),
        },
      };
    });
  }, []);

  const executeClickAction = useCallback((key: string, clickCount: number, onRename: () => void, onRecolor: () => void, onSingle?: () => void) => {
    if (clickCount >= RECOLOR_CLICK_COUNT) {
      const currentTimer = multiClickTimerRef.current[key];
      if (currentTimer) {
        clearTimeout(currentTimer);
        delete multiClickTimerRef.current[key];
      }
      onRecolor();
      return;
    }

    if (clickCount === RENAME_CLICK_COUNT) {
      const currentTimer = multiClickTimerRef.current[key];
      if (currentTimer) {
        clearTimeout(currentTimer);
      }
      multiClickTimerRef.current[key] = setTimeout(() => {
        onRename();
        delete multiClickTimerRef.current[key];
      }, MULTI_CLICK_DELAY_MS);
      return;
    }

    if (clickCount === 1 && onSingle) {
      onSingle();
    }
  }, []);

  const confirmRename = useCallback(() => {
    if (!renameAction) return;

    if (renameAction.type === 'category') {
      const nextName = normalizeCategoryName(renameDraft);
      if (!nextName) return;

      setDb((prev) => {
        const section = prev[nav];
        const oldName = renameAction.currentName;
        if (!section.categories.includes(oldName) || oldName === nextName || section.categories.includes(nextName)) {
          return prev;
        }

        const categories = section.categories.map((cat) => (cat === oldName ? nextName : cat));
        const data = { ...section.data };
        data[nextName] = data[oldName] ?? [];
        delete data[oldName];

        return {
          ...prev,
          [nav]: {
            ...section,
            categories,
            data,
          },
        };
      });

      if (currentCategory === renameAction.currentName) {
        setCategory(nextName);
      }
    }

    if (renameAction.type === 'item') {
      const nextName = renameDraft.trim().slice(0, 120);
      if (!nextName) return;

      setDb((prev) => {
        const section = prev[nav];
        const existing = section.data[currentCategory] ?? [];
        if (renameAction.index < 0 || renameAction.index >= existing.length) return prev;

        const nextItems = existing.map((item, idx) => (
          idx === renameAction.index
            ? { ...item, name: nextName }
            : item
        ));

        return {
          ...prev,
          [nav]: {
            ...section,
            data: {
              ...section.data,
              [currentCategory]: nextItems,
            },
          },
        };
      });
    }

    if (renameAction.type === 'nav') {
      const nextTitle = normalizeTitleName(renameDraft);
      if (!nextTitle) return;

      setDb((prev) => {
        const section = prev[renameAction.navKey];
        if (!section || section.title === nextTitle) return prev;

        return {
          ...prev,
          [renameAction.navKey]: {
            ...section,
            title: nextTitle,
          },
        };
      });
    }

    setRenameAction(null);
    setRenameDraft('');
  }, [renameAction, renameDraft, nav, currentCategory]);

  const requestDeleteItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;

      setConfirmDeleteAction({
        type: 'item',
        index,
        label: `Hapus item "${item.name}"?`,
      });
    },
    [items]
  );

  const requestDeleteCategory = useCallback(() => {
    if (!currentCategory) return;
    if (categoryList.length <= 1) {
      setError('Minimal harus ada 1 kategori.');
      return;
    }

    setConfirmDeleteAction({
      type: 'category',
      category: currentCategory,
      label: `Hapus kategori "${currentCategory}" beserta semua item?`,
    });
  }, [categoryList.length, currentCategory]);

  const confirmDelete = useCallback(() => {
    if (!confirmDeleteAction) return;

    if (confirmDeleteAction.type === 'item') {
      setDb((prev) => {
        const section = prev[nav];
        const oldItems = section.data[currentCategory] ?? [];
        if (confirmDeleteAction.index < 0 || confirmDeleteAction.index >= oldItems.length) return prev;

        return {
          ...prev,
          [nav]: {
            ...section,
            data: {
              ...section.data,
              [currentCategory]: oldItems.filter((_, i) => i !== confirmDeleteAction.index),
            },
          },
        };
      });
      setOpenCardIndex(null);
    }

    if (confirmDeleteAction.type === 'category') {
      const target = confirmDeleteAction.category;
      setDb((prev) => {
        const section = prev[nav];
        if (!section.categories.includes(target) || section.categories.length <= 1) return prev;

        const categories = section.categories.filter((cat) => cat !== target);
        const data = { ...section.data };
        delete data[target];

        return {
          ...prev,
          [nav]: {
            ...section,
            categories,
            data,
          },
        };
      });
    }

    setConfirmDeleteAction(null);
  }, [confirmDeleteAction, currentCategory, nav]);

  const statusLabel = useMemo(() => {
    if (saveState === 'saving') return 'SYNCING...';
    if (saveState === 'saved') return 'SYNCED';
    if (saveState === 'error') return 'SYNC ERROR';
    return loading ? 'BOOTING...' : 'READY';
  }, [loading, saveState]);

  return (
    <main className="architect-shell">
      <header className="architect-header">
        <h1>Created by Fadhil Akbar</h1>
        <div className="header-actions">
          <span className={`sync-state ${saveState}`}>{statusLabel}</span>
          <button type="button" className="sync-now" onClick={triggerSyncNow}>
            SYNC NOW
          </button>
          <button type="button" className="admin-toggle" onClick={requestEnableAdminMode}>
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
                style={currentSection.categoryGradients?.[cat] ? { backgroundImage: currentSection.categoryGradients[cat] } : undefined}
                onClick={(event) =>
                  executeClickAction(
                    `category:${nav}:${cat}`,
                    event.detail,
                    () => requestRenameCategory(cat),
                    () => recolorCategory(cat),
                    () => setCategory(cat)
                  )
                }
              >
                {cat}
              </button>
            ))}
          </nav>
        </aside>

        <section className="content-area">
          {items.map((item, index) => (
            <article
              key={`${item.name}-${index}`}
              className={`card ${openCardIndex === index ? 'open' : ''}`}
              style={item.colorGradient ? { backgroundImage: item.colorGradient } : undefined}
            >
              {adminMode && (
                <div className="admin-tools">
                  <button type="button" className="btn-icon del" onClick={() => requestDeleteItem(index)}>
                    DELETE
                  </button>
                </div>
              )}
              <button
                type="button"
                className="card-head"
                onClick={(event) =>
                  executeClickAction(
                    `item:${nav}:${currentCategory}:${index}`,
                    event.detail,
                    () => requestRenameItem(index),
                    () => recolorItem(index),
                    () => setOpenCardIndex((prev) => (prev === index ? null : index))
                  )
                }
              >
                <h3>{item.name}</h3>
                <div className="card-meta">
                  <span className="tag">{item.tag || 'UNTAGGED'}</span>
                  <span className="expand-indicator" aria-hidden="true">
                    {openCardIndex === index ? '▲ Collapse detail' : '▼ Expand detail'}
                  </span>
                </div>
              </button>
              <div className="card-body-wrapper">
                <div className="card-body">
                  <div className="inner">
                    <p className="desc desc-content">{item.desc || 'No description.'}</p>
                    {Object.entries(item.stats).length === 0 ? (
                      <p className="desc">No stats.</p>
                    ) : (
                      Object.entries(item.stats).map(([key, value]) => (
                        <div key={`${item.name}-${key}`} className="stat">
                          <span className="stat-label">{key}:</span>
                          <span className="stat-value">{value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {!loading && items.length === 0 && <p className="empty-hint">Belum ada ide di kategori ini.</p>}
          {error && <p className="error-hint">{error}</p>}
        </section>
      </div>

      {adminMode && (
        <section className="admin-panel">
          <button type="button" className="admin-action add" onClick={() => setShowItemModal(true)}>
            + ITEM
          </button>
          <button type="button" className="admin-action add" onClick={() => setShowCategoryModal(true)}>
            + CATEGORY
          </button>
          <button type="button" className="admin-action del" onClick={requestDeleteCategory}>
            DELETE CATEGORY
          </button>
        </section>
      )}

      <footer className="footer">
        {GAME_IDEA_NAV_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={`nav-item ${nav === key ? 'active' : ''}`}
            style={db[key].navGradient ? { backgroundImage: db[key].navGradient } : undefined}
            onClick={(event) =>
              executeClickAction(
                `nav:${key}`,
                event.detail,
                () => requestRenameNav(key),
                () => recolorNav(key),
                () => setNav(key)
              )
            }
            title={`4x click rename / 5x click recolor ${key.toUpperCase()} section`}
          >
            {(db[key].title || key.toUpperCase()).toUpperCase()}
          </button>
        ))}
      </footer>

      {showAccessModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>AKSES ADMIN</h2>
            <div className="input-group">
              <label>KODE AKSES</label>
              <input
                type="password"
                value={accessCodeInput}
                onChange={(e) => {
                  setAccessCodeInput(e.target.value);
                  setAccessCodeError('');
                }}
                placeholder="Masukkan kode akses"
              />
            </div>
            {accessCodeError && <p className="error-hint">{accessCodeError}</p>}
            <div className="modal-btns">
              <button type="button" className="btn-abort" onClick={() => setShowAccessModal(false)}>
                CANCEL
              </button>
              <button type="button" className="btn-confirm" onClick={confirmEnableAdminMode}>
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

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
              <button type="button" className="btn-abort" onClick={() => setShowItemModal(false)}>
                ABORT
              </button>
              <button type="button" className="btn-confirm" onClick={saveItem}>
                EXECUTE_SAVE
              </button>
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
              <button type="button" className="btn-abort" onClick={() => setShowCategoryModal(false)}>
                ABORT
              </button>
              <button type="button" className="btn-confirm" onClick={saveCategory}>
                INITIATE
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteAction && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal danger">
            <h2>KONFIRMASI HAPUS</h2>
            <p className="desc">{confirmDeleteAction.label}</p>
            <div className="modal-btns">
              <button type="button" className="btn-abort" onClick={() => setConfirmDeleteAction(null)}>
                CANCEL
              </button>
              <button type="button" className="btn-confirm danger" onClick={confirmDelete}>
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {renameAction && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>{renameAction.type === 'category' ? 'RENAME CATEGORY' : renameAction.type === 'nav' ? 'RENAME BOTTOM SECTION' : 'RENAME ITEM'}</h2>
            <div className="input-group">
              <label>{renameAction.type === 'category' ? 'NAMA KATEGORI BARU' : renameAction.type === 'nav' ? 'NAMA SECTION BARU' : 'NAMA ITEM BARU'}</label>
              <input
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                maxLength={renameAction.type === 'category' ? 32 : renameAction.type === 'nav' ? 64 : 120}
              />
            </div>
            <div className="modal-btns">
              <button
                type="button"
                className="btn-abort"
                onClick={() => {
                  setRenameAction(null);
                  setRenameDraft('');
                }}
              >
                CANCEL
              </button>
              <button type="button" className="btn-confirm" onClick={confirmRename}>
                CONFIRM
              </button>
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
          background-image:
            linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(188, 19, 254, 0.05) 0%, transparent 70%);
          background-size: 40px 40px, 40px 40px, 100% 100%;
          color: var(--text);
          font-size: 12px;
          font-family: 'Orbitron', 'Rajdhani', 'Inter', 'Segoe UI', sans-serif;
          font-weight: 700;
          overflow: hidden;
        }
        .architect-header {
          padding: 7px 10px;
          border-bottom: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.88);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .architect-header h1 { font-size: 0.82rem; letter-spacing: 0.8px; color: #fff; text-shadow: var(--neon-intense); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 900; }
        .header-actions { display: inline-flex; gap: 5px; align-items: center; flex-wrap: nowrap; justify-content: flex-end; min-width: 0; }
        .sync-state { font-size: 9px; letter-spacing: 0.5px; color: #75f7ff; white-space: nowrap; }
        .sync-state.error { color: #fb7185; }
        .admin-toggle,
        .nav-item,
        .tab-btn,
        .btn-abort,
        .btn-confirm,
        .admin-action,
        .btn-icon,
        .sync-now { font-family: inherit; }
        .admin-toggle,
        .sync-now {
          padding: 4px 8px;
          border: 1px solid var(--accent);
          color: var(--accent);
          background: rgba(0, 242, 255, 0.08);
          cursor: pointer;
          font-size: 9px;
          line-height: 1.1;
          white-space: nowrap;
          font-weight: 800;
        }
        .layout { flex: 1; display: flex; gap: 10px; padding: 10px; min-height: 0; }
        .sidebar { width: 170px; flex-shrink: 0; }
        .sub-tabs { display: flex; flex-direction: column; gap: 4px; overflow: auto; max-height: 100%; }
        .tab-btn {
          padding: 6px 8px;
          text-align: left;
          border: 1px solid rgba(0, 242, 255, 0.48);
          box-shadow: inset 0 0 0 1px rgba(0, 242, 255, 0.18), 0 0 12px rgba(0, 242, 255, 0.18);
          background: var(--surface);
          color: #d8f9ff;
          cursor: pointer;
          font-size: 10px;
          line-height: 1.2;
        }
        .tab-btn.active {
          color: #e8fbff;
          border-color: var(--accent);
          box-shadow: 0 0 14px rgba(0, 242, 255, 0.38), inset 0 0 0 1px rgba(0, 242, 255, 0.42);
          background: linear-gradient(90deg, rgba(0, 242, 255, 0.22), transparent);
          text-shadow: var(--neon);
        }
        .tab-btn:focus-visible,
        .card-head:focus-visible,
        .btn-icon.del:focus-visible {
          outline: 1px solid var(--accent);
          outline-offset: 1px;
        }
        .content-area {
          flex: 1;
          min-height: 0;
          overflow: auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 8px;
          align-content: start;
          padding-right: 2px;
        }
        .card {
          position: relative;
          background: var(--surface);
          background-size: 180% 180%;
          border: 1px solid rgba(0, 242, 255, 0.42);
          box-shadow: 0 0 18px rgba(0, 242, 255, 0.2), inset 0 0 0 1px rgba(0, 242, 255, 0.14);
          overflow: hidden;
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }
        .card:hover {
          border-color: rgba(0, 242, 255, 0.72);
          box-shadow: 0 0 24px rgba(0, 242, 255, 0.34), inset 0 0 0 1px rgba(0, 242, 255, 0.26);
        }
        .admin-tools { position: absolute; right: 6px; top: 5px; z-index: 3; }
        .btn-icon.del {
          background: rgba(255, 42, 95, 0.12);
          color: #ff6a8f;
          border: 1px solid rgba(255, 42, 95, 0.68);
          border-radius: 3px;
          padding: 1px 3px;
          min-width: 0;
          line-height: 1.1;
          cursor: pointer;
          font-size: 8px;
          letter-spacing: 0.02em;
        }
        .card-head {
          width: 100%;
          border: 0;
          background: transparent;
          color: inherit;
          padding: 8px 48px 8px 10px;
          display: grid;
          gap: 3px;
          align-items: center;
          cursor: pointer;
          text-align: left;
        }
        .card-head h3 { text-align: left; font-size: 11px; color: #fff; line-height: 1.15; margin: 0; }
        .card-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .tag {
          font-size: 8px;
          box-shadow: 0 0 8px rgba(188, 19, 254, 0.35);
          color: var(--accent2);
          border: 1px solid var(--accent2);
          padding: 1px 3px;
          white-space: nowrap;
        }
        .card-body-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 180ms ease; }
        .card.open .card-body-wrapper { grid-template-rows: 1fr; }
        .card-body { overflow: hidden; contain: content; }
        .inner { padding: 0 10px 8px; border-top: 1px solid rgba(0, 242, 255, 0.14); }
        .desc { color: #9ca3af; margin: 5px 0; font-size: 10px; line-height: 1.35; }
        .desc-content { white-space: pre-wrap; word-break: break-word; }
        .stat { display: inline-flex; align-items: baseline; gap: 2px; padding: 2px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.04); font-size: 10px; }
        .stat-label { color: #94a3b8; }
        .stat-value { color: var(--accent); font-weight: 700; }
        .expand-indicator {
          font-size: 9px;
          color: #b9f9ff;
          border: 1px solid rgba(0, 242, 255, 0.62);
          border-radius: 999px;
          padding: 1px 6px;
          line-height: 1.45;
          letter-spacing: 0.01em;
          white-space: nowrap;
          box-shadow: 0 0 10px rgba(0, 242, 255, 0.25);
        }
        .admin-panel {
          display: flex;
          gap: 6px;
          border-top: 1px solid var(--border);
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.92);
          flex-wrap: wrap;
        }
        .admin-action {
          border: 1px solid #334155;
          box-shadow: inset 0 0 0 1px rgba(0,242,255,0.08);
          background: rgba(255, 255, 255, 0.02);
          color: #cbd5e1;
          cursor: pointer;
          font-size: 10px;
          padding: 5px 8px;
        }
        .admin-action.add { border-color: rgba(0, 242, 255, 0.7); color: var(--accent); }
        .admin-action.del { border-color: rgba(255, 42, 95, 0.8); color: #ff2a5f; }
        .footer {
          display: flex;
          justify-content: space-around;
          border-top: 1px solid var(--border);
          padding: 8px;
          background: #000;
        }
        .nav-item { border: 0; background: transparent; color: #ddf7ff; padding: 6px 10px; cursor: pointer; font-size: 10px; font-weight: 800; max-width: 24vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nav-item.active { color: var(--accent); text-shadow: var(--neon); }
        .empty-hint,
        .error-hint { font-size: 12px; color: #9ca3af; }
        .error-hint { color: #fb7185; }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal { width: min(540px, 100%); background: #0a0a0f; border: 1px solid var(--accent2); padding: 18px; }
        .modal.danger { border-color: rgba(255, 42, 95, 0.9); }
        .modal h2 { color: var(--accent2); margin-bottom: 12px; font-size: 15px; }
        .input-group { margin-bottom: 10px; }
        .input-group label { display: block; color: #64748b; font-size: 10px; margin-bottom: 5px; }
        .input-group input,
        .input-group textarea {
          width: 100%;
          padding: 9px;
          border: 1px solid #334155;
          background: rgba(255, 255, 255, 0.03);
          color: #e2e8f0;
          outline: 0;
          font-size: 12px;
        }
        .input-group input:focus,
        .input-group textarea:focus { border-color: var(--accent); }
        .modal-btns { display: flex; gap: 8px; margin-top: 8px; }
        .btn-abort,
        .btn-confirm { flex: 1; padding: 9px; cursor: pointer; }
        .btn-abort { border: 1px solid #475569; background: transparent; color: #94a3b8; }
        .btn-confirm { border: 0; background: var(--accent); color: #020617; font-weight: 800; }
        .btn-confirm.danger { background: #ff2a5f; color: #fff; }

        @media (min-width: 1024px) {
          .architect-header { padding: 9px 14px; }
          .architect-header h1 { font-size: 0.98rem; letter-spacing: 1.2px; }
          .header-actions { gap: 7px; }
          .sync-state { font-size: 10px; }
          .admin-toggle, .sync-now { font-size: 10px; padding: 5px 9px; }
          .layout { gap: 14px; padding: 12px; }
          .sidebar { width: 220px; }
          .sub-tabs { gap: 6px; }
          .tab-btn { font-size: 11px; padding: 8px 10px; border-width: 1px; }
          .content-area { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
          .card-head { padding: 10px 52px 10px 12px; }
          .card-head h3 { font-size: 12px; }
          .desc { font-size: 11px; }
          .stat { font-size: 11px; }
          .btn-icon.del { font-size: 9px; padding: 1px 4px; }
        }

        @media (max-width: 768px) {
          .architect-header { padding: 6px 8px; gap: 6px; }
          .architect-header h1 { font-size: 0.72rem; letter-spacing: 0.2px; max-width: 42vw; }
          .header-actions { gap: 4px; }
          .sync-state { font-size: 8px; }
          .admin-toggle, .sync-now { font-size: 8px; padding: 4px 6px; }
          .layout { flex-direction: column; padding: 8px; gap: 8px; }
          .sidebar { width: 100%; }
          .sub-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: 116px; gap: 5px; }
          .tab-btn { text-align: center; padding: 6px 5px; }
          .content-area { grid-template-columns: 1fr; gap: 7px; }
          .card-head { padding: 7px 40px 7px 9px; }
          .admin-panel { padding: 6px 8px; }
          .footer { padding: 7px 6px; }
          .nav-item { padding: 6px 6px; max-width: 22vw; }
        }
      `}</style>
    </main>
  );
}
