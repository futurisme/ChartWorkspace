'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  DEFAULT_GAME_IDEA_DATA,
  GAME_IDEA_NAV_ORDER,
  GAME_IDEA_STORAGE_KEY,
  sanitizeGameIdeaDatabase,
  type GameIdeaDatabase,
  type GameIdeaFolder,
  type GameIdeaItem,
  type GameIdeaNav,
  type GameIdeaRootSlot,
} from '@/features/game-ideas/shared/schema';
import { decodeFadhilArchive, encodeFadhilArchive } from '@/features/maps/shared/fadhil-archive';

type ItemDraft = {
  name: string;
  tag: string;
  desc: string;
  stats: string;
};

type ConfirmDeleteAction =
  | { type: 'item'; index: number; label: string }
  | { type: 'category'; category: string; label: string; codeInput: string; codeError: string }
  | { type: 'folder'; folderIndex: number; folderName: string; label: string; codeInput: string; codeError: string }
  | { type: 'folderItem'; folderIndex: number; itemIndex: number; label: string }
  | null;

type RenameAction =
  | { type: 'item'; index: number; currentName: string }
  | { type: 'folder'; folderIndex: number; currentName: string }
  | { type: 'folderItem'; folderIndex: number; itemIndex: number; currentName: string }
  | { type: 'category'; currentName: string }
  | { type: 'nav'; navKey: GameIdeaNav; currentName: string }
  | null;


type TransferAction =
  | { source: 'root'; itemIndex: number }
  | { source: 'folder'; folderIndex: number; itemIndex: number }
  | null;

type DragKind = 'category' | 'item' | 'root' | 'nav' | `folderItem:${number}`;

type ActiveDrag = {
  kind: DragKind;
  fromIndex: number;
  overIndex: number;
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

const SAVE_DEBOUNCE_MS = 120;
const ADMIN_ACCESS_CODE = 'IzinEditKhususGG123';
const CATEGORY_DELETE_CODE = 'DeleteCategoryByCode';
const FOLDER_DELETE_CODE = 'DeleteFolderByCode';
const UNIVERSAL_RENAME_CLICKS = 3;
const UNIVERSAL_RENAME_WINDOW_MS = 3000;
const DRAG_HOLD_MS = 420;
const CONTENT_SCROLL_EXTRA_SPACE_PX = 96;
const NAV_ORDER_STORAGE_KEY = `${GAME_IDEA_STORAGE_KEY}_NAV_ORDER`;
const ADMIN_ACCESS_PERSIST_KEY = `${GAME_IDEA_STORAGE_KEY}_ADMIN_GRANTED`;


const EMPTY_GAME_IDEA_DATA: GameIdeaDatabase = {
  govt: { title: 'CODEX: GOVT', categories: [], data: {}, folders: {}, rootOrder: {} },
  units: { title: 'CODEX: UNITS', categories: [], data: {}, folders: {}, rootOrder: {} },
  tech: { title: 'CODEX: TECH', categories: [], data: {}, folders: {}, rootOrder: {} },
  econ: { title: 'CODEX: ECON', categories: [], data: {}, folders: {}, rootOrder: {} },
};


function emptyDraft(): ItemDraft {
  return { name: '', tag: '', desc: '', stats: '' };
}

function formatStats(stats: Record<string, string>) {
  return Object.entries(stats)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
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

function normalizeFolderName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function createRootOrder(items: GameIdeaItem[], folders: GameIdeaFolder[], existing: GameIdeaRootSlot[] = []) {
  const itemIds = new Set(items.map((item) => item.id));
  const folderIds = new Set(folders.map((folder) => folder.id));
  const used = new Set<string>();
  const slots: GameIdeaRootSlot[] = [];

  existing.forEach((slot) => {
    const key = `${slot.kind}:${slot.id}`;
    if (used.has(key)) return;
    if (slot.kind === 'item' && !itemIds.has(slot.id)) return;
    if (slot.kind === 'folder' && !folderIds.has(slot.id)) return;
    used.add(key);
    slots.push(slot);
  });

  items.forEach((item) => {
    const key = `item:${item.id}`;
    if (used.has(key)) return;
    used.add(key);
    slots.push({ kind: 'item', id: item.id });
  });

  folders.forEach((folder) => {
    const key = `folder:${folder.id}`;
    if (used.has(key)) return;
    used.add(key);
    slots.push({ kind: 'folder', id: folder.id });
  });

  return slots;
}


function hashDb(serialized: string) {
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(36)}:${serialized.length}`;
}

function countTotalItems(db: GameIdeaDatabase) {
  return Object.values(db).reduce((sum, section) => (
    sum + Object.values(section.data).reduce((inner, list) => inner + list.length, 0)
  ), 0);
}

function mergeGameIdeaDatabases(local: GameIdeaDatabase | null, remote: GameIdeaDatabase): GameIdeaDatabase {
  const safeRemote = sanitizeGameIdeaDatabase(remote);
  if (!local) return safeRemote;

  const safeLocal = sanitizeGameIdeaDatabase(local);
  const remoteItems = countTotalItems(safeRemote);
  const localItems = countTotalItems(safeLocal);

  if (remoteItems === 0 && localItems > 0) {
    return safeLocal;
  }

  return safeRemote;
}


function reorderArray<T>(values: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= values.length || toIndex >= values.length) {
    return values;
  }

  const next = [...values];
  const [picked] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, picked);
  return next;
}

function parseStoredNavOrder(value: string | null): GameIdeaNav[] {
  if (!value) return [...GAME_IDEA_NAV_ORDER];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [...GAME_IDEA_NAV_ORDER];

    const normalized = parsed.filter((entry): entry is GameIdeaNav => (
      typeof entry === 'string' && GAME_IDEA_NAV_ORDER.includes(entry as GameIdeaNav)
    ));

    const merged = [...normalized];
    GAME_IDEA_NAV_ORDER.forEach((entry) => {
      if (!merged.includes(entry)) merged.push(entry);
    });

    return merged;
  } catch {
    return [...GAME_IDEA_NAV_ORDER];
  }
}


function findDragIndexFromPoint(kind: DragKind, x: number, y: number) {
  if (typeof document === 'undefined') return null;
  const element = document.elementFromPoint(x, y);
  if (!element) return null;

  const target = element.closest<HTMLElement>(`[data-drag-kind="${kind}"]`);
  if (!target) return null;

  const raw = target.dataset.dragIndex;
  const index = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(index) ? index : null;
}

function dragShiftForIndex(index: number, activeDrag: ActiveDrag | null, kind: DragKind) {
  if (!activeDrag || activeDrag.kind !== kind || activeDrag.fromIndex === activeDrag.overIndex) return '';

  const low = Math.min(activeDrag.fromIndex, activeDrag.overIndex);
  const high = Math.max(activeDrag.fromIndex, activeDrag.overIndex);
  if (index < low || index > high || index === activeDrag.fromIndex) return '';

  return activeDrag.fromIndex < activeDrag.overIndex ? 'drag-shift-up' : 'drag-shift-down';
}


function isDraggedIndex(index: number, activeDrag: ActiveDrag | null, kind: DragKind) {
  return Boolean(activeDrag && activeDrag.kind === kind && activeDrag.fromIndex === index);
}

function dragStyle(activeDrag: ActiveDrag | null, kind: DragKind) {
  if (!activeDrag || activeDrag.kind !== kind) return undefined;
  return {
    '--drag-x': `${activeDrag.currentX - activeDrag.startX}px`,
    '--drag-y': `${activeDrag.currentY - activeDrag.startY}px`,
  } as CSSProperties;
}


export default function GameIdeasPage() {
  const [db, setDb] = useState<GameIdeaDatabase>(EMPTY_GAME_IDEA_DATA);
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
  const [retryNonce, setRetryNonce] = useState(0);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddChooser, setShowAddChooser] = useState(false);
  const [addTarget, setAddTarget] = useState<'item' | 'category' | 'folder'>('item');
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyDraft());
  const [categoryDraft, setCategoryDraft] = useState('');
  const [folderDraft, setFolderDraft] = useState('');
  const [confirmDeleteAction, setConfirmDeleteAction] = useState<ConfirmDeleteAction>(null);
  const [renameAction, setRenameAction] = useState<RenameAction>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [itemRenameDraft, setItemRenameDraft] = useState<ItemDraft>(emptyDraft());
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [openFolderKey, setOpenFolderKey] = useState<string | null>(null);
  const [openFolderItemCards, setOpenFolderItemCards] = useState<Record<string, number | null>>({});
  const [transferAction, setTransferAction] = useState<TransferAction>(null);
  const [navOrder, setNavOrder] = useState<GameIdeaNav[]>([...GAME_IDEA_NAV_ORDER]);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [scrollHint, setScrollHint] = useState({ show: false, up: false, down: false });
  const [dynamicScrollSpacer, setDynamicScrollSpacer] = useState(CONTENT_SCROLL_EXTRA_SPACE_PX);
  const [interactionLockedUi, setInteractionLockedUi] = useState(false);

  const hydratedRef = useRef(false);
  const dbRef = useRef(DEFAULT_GAME_IDEA_DATA);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentAreaRef = useRef<HTMLElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverVersionRef = useRef<number | null>(null);
  const lastSyncedHashRef = useRef<string | null>(null);
  const lastLocalCacheHashRef = useRef<string | null>(null);
  const renameClickTrackerRef = useRef<{ key: string; count: number; startedAt: number } | null>(null);
  const dragHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragPointerRef = useRef<{ kind: DragKind; pointerId: number; startX: number; startY: number } | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const liveSyncInFlightRef = useRef(false);
  const interactionLockRef = useRef(false);
  const interactionLockTimerRef = useRef<number | null>(null);

  const serializedDb = useMemo(() => JSON.stringify(db), [db]);
  const dbHash = useMemo(() => hashDb(serializedDb), [serializedDb]);
  const currentSection = useMemo(() => db[nav], [db, nav]);
  const categoryList = currentSection.categories;
  const currentCategory = category || categoryList[0] || '';
  const items = useMemo(() => currentSection.data[currentCategory] ?? [], [currentCategory, currentSection.data]);
  const currentFolders = useMemo(() => currentSection.folders?.[currentCategory] ?? [], [currentCategory, currentSection.folders]);
  const currentRootSlots = useMemo(
    () => createRootOrder(items, currentFolders, currentSection.rootOrder?.[currentCategory] ?? []),
    [currentCategory, currentFolders, currentSection.rootOrder, items]
  );
  const itemIndexById = useMemo(() => new Map(items.map((item, index) => [item.id, index])), [items]);
  const folderIndexById = useMemo(() => new Map(currentFolders.map((folder, index) => [folder.id, index])), [currentFolders]);


  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let localDb: GameIdeaDatabase | null = null;
    const cached = localStorage.getItem(GAME_IDEA_STORAGE_KEY);

    if (cached) {
      try {
        localDb = sanitizeGameIdeaDatabase(JSON.parse(cached) as unknown);
        setDb(localDb);
      } catch {
        localStorage.removeItem(GAME_IDEA_STORAGE_KEY);
      }
    }

    setNavOrder(parseStoredNavOrder(localStorage.getItem(NAV_ORDER_STORAGE_KEY)));

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
        const mergedSerialized = JSON.stringify(merged);
        const mergedHash = hashDb(mergedSerialized);
        lastSyncedHashRef.current = mergedHash;
        lastLocalCacheHashRef.current = mergedHash;
        setDb(merged);
        localStorage.setItem(GAME_IDEA_STORAGE_KEY, mergedSerialized);
      } catch (err) {
        if (localDb) {
          const localHash = hashDb(JSON.stringify(localDb));
          lastSyncedHashRef.current = localHash;
          lastLocalCacheHashRef.current = localHash;
        }
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
    setOpenFolderKey(null);
    setOpenFolderItemCards({});
  }, [db, nav]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (lastLocalCacheHashRef.current === dbHash) return;
    localStorage.setItem(GAME_IDEA_STORAGE_KEY, serializedDb);
    lastLocalCacheHashRef.current = dbHash;
  }, [dbHash, serializedDb]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(NAV_ORDER_STORAGE_KEY, JSON.stringify(navOrder));
  }, [navOrder]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const currentHash = dbHash;

    if (lastSyncedHashRef.current === currentHash) {
      return;
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
          const conflictPayload = (await response.json()) as { version?: number };
          if (typeof conflictPayload.version === 'number') {
            serverVersionRef.current = conflictPayload.version;
          }
          setError('Server changed remotely. Keeping your local edits and retrying sync safely.');
          setSaveState('saving');
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(() => {
            setRetryNonce((prev) => prev + 1);
          }, 320);
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

        lastSyncedHashRef.current = hashDb(JSON.stringify(dbRef.current));
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
        setError(err instanceof Error ? err.message : 'Gagal sinkronisasi. Retry otomatis aktif.');
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        retryTimerRef.current = setTimeout(() => {
          setRetryNonce((prev) => prev + 1);
        }, 2200);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [db, dbHash, retryNonce]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (adminMode) return;
    if (dragHoldTimerRef.current) {
      clearTimeout(dragHoldTimerRef.current);
      dragHoldTimerRef.current = null;
    }
    dragPointerRef.current = null;
    setActiveDrag(null);
  }, [adminMode]);


  const openAddChooser = useCallback(() => {
    setAddTarget('item');
    setShowAddChooser(true);
  }, []);

  const confirmAddChoice = useCallback(() => {
    setShowAddChooser(false);
    if (addTarget === 'category') {
      setShowCategoryModal(true);
      return;
    }
    if (addTarget === 'folder') {
      setShowFolderModal(true);
      return;
    }
    setShowItemModal(true);
  }, [addTarget]);

  const requestEnableAdminMode = useCallback(() => {
    if (adminMode) {
      setAdminMode(false);
      return;
    }

    if (typeof window !== 'undefined' && localStorage.getItem(ADMIN_ACCESS_PERSIST_KEY) === '1') {
      setAdminMode(true);
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

    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_ACCESS_PERSIST_KEY, '1');
    }
    setAdminMode(true);
    setShowAccessModal(false);
    setAccessCodeInput('');
    setAccessCodeError('');
  }, [accessCodeInput]);

  const registerUniversalRenameClick = useCallback((key: string, onTriple: () => void) => {
    if (!adminMode) return;

    const now = Date.now();
    const tracker = renameClickTrackerRef.current;

    if (!tracker || tracker.key !== key || now - tracker.startedAt > UNIVERSAL_RENAME_WINDOW_MS) {
      renameClickTrackerRef.current = { key, count: 1, startedAt: now };
      return;
    }

    const nextCount = tracker.count + 1;
    if (nextCount >= UNIVERSAL_RENAME_CLICKS) {
      renameClickTrackerRef.current = null;
      onTriple();
      return;
    }

    renameClickTrackerRef.current = { ...tracker, count: nextCount };
  }, [adminMode]);

  const saveItem = useCallback(() => {
    const name = itemDraft.name.trim();
    if (!name || !currentCategory) return;

    const nextItem: GameIdeaItem = {
      id: randomId('item'),
      name: name.slice(0, 120),
      tag: itemDraft.tag.trim().slice(0, 32),
      desc: itemDraft.desc.trim(),
      stats: parseStats(itemDraft.stats),
    };

    setDb((prev) => {
      const section = prev[nav];
      const oldItems = section.data[currentCategory] ?? [];
      const oldFolders = section.folders?.[currentCategory] ?? [];
      const nextItems = [...oldItems, nextItem];

      return {
        ...prev,
        [nav]: {
          ...section,
          data: {
            ...section.data,
            [currentCategory]: nextItems,
          },
          rootOrder: {
            ...(section.rootOrder ?? {}),
            [currentCategory]: createRootOrder(nextItems, oldFolders, section.rootOrder?.[currentCategory] ?? []),
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
          folders: {
            ...(section.folders ?? {}),
            [categoryName]: [],
          },
          rootOrder: {
            ...(section.rootOrder ?? {}),
            [categoryName]: [],
          },
        },
      };
    });

    setCategory(categoryName);
    setCategoryDraft('');
    setShowCategoryModal(false);
  }, [categoryDraft, nav]);

  const saveFolder = useCallback(() => {
    const folderName = normalizeFolderName(folderDraft);
    if (!folderName || !currentCategory) return;

    setDb((prev) => {
      const section = prev[nav];
      const folders = section.folders ?? {};
      const categoryFolders = folders[currentCategory] ?? [];
      if (categoryFolders.some((folder) => folder.name.toLowerCase() === folderName.toLowerCase())) {
        return prev;
      }

      const nextFolders = [...categoryFolders, { id: randomId('folder'), name: folderName, items: [] }];
      return {
        ...prev,
        [nav]: {
          ...section,
          folders: {
            ...folders,
            [currentCategory]: nextFolders,
          },
          rootOrder: {
            ...(section.rootOrder ?? {}),
            [currentCategory]: createRootOrder(section.data[currentCategory] ?? [], nextFolders, section.rootOrder?.[currentCategory] ?? []),
          },
        },
      };
    });

    setFolderDraft('');
    setShowFolderModal(false);
  }, [currentCategory, folderDraft, nav]);

  const requestRenameCategory = useCallback((targetCategory: string) => {
    if (!targetCategory) return;
    setRenameAction({ type: 'category', currentName: targetCategory });
    setRenameDraft(targetCategory);
  }, []);

  const requestRenameItem = useCallback((index: number) => {
    const item = items[index];
    if (!item) return;

    setRenameAction({ type: 'item', index, currentName: item.name });
    setRenameDraft(item.name);
    setItemRenameDraft({
      name: item.name,
      tag: item.tag,
      desc: item.desc,
      stats: formatStats(item.stats),
    });
  }, [items]);

  const requestRenameNav = useCallback((navKey: GameIdeaNav) => {
    const navTitle = db[navKey].title?.trim() || navKey.toUpperCase();
    setRenameAction({ type: 'nav', navKey, currentName: navTitle });
    setRenameDraft(navTitle);
  }, [db]);

  const requestRenameFolder = useCallback((folderIndex: number) => {
    const folder = currentFolders[folderIndex];
    if (!folder) return;
    setRenameAction({ type: 'folder', folderIndex, currentName: folder.name });
    setRenameDraft(folder.name);
  }, [currentFolders]);

  const requestRenameFolderItem = useCallback((folderIndex: number, itemIndex: number) => {
    const folder = currentFolders[folderIndex];
    const item = folder?.items[itemIndex];
    if (!folder || !item) return;

    setRenameAction({ type: 'folderItem', folderIndex, itemIndex, currentName: item.name });
    setRenameDraft(item.name);
    setItemRenameDraft({
      name: item.name,
      tag: item.tag,
      desc: item.desc,
      stats: formatStats(item.stats),
    });
  }, [currentFolders]);


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

        const folders = { ...(section.folders ?? {}) };
        folders[nextName] = folders[oldName] ?? [];
        delete folders[oldName];

        const rootOrder = { ...(section.rootOrder ?? {}) };
        rootOrder[nextName] = rootOrder[oldName] ?? [];
        delete rootOrder[oldName];

        return {
          ...prev,
          [nav]: {
            ...section,
            categories,
            data,
            folders,
            rootOrder,
          },
        };
      });

      if (currentCategory === renameAction.currentName) {
        setCategory(nextName);
      }
    }

    if (renameAction.type === 'item') {
      const nextName = itemRenameDraft.name.trim().slice(0, 120);
      if (!nextName) return;

      setDb((prev) => {
        const section = prev[nav];
        const existing = section.data[currentCategory] ?? [];
        if (renameAction.index < 0 || renameAction.index >= existing.length) return prev;

        const nextItems = existing.map((item, idx) => (
          idx === renameAction.index
            ? {
                ...item,
                name: nextName,
                tag: itemRenameDraft.tag.trim().slice(0, 32),
                desc: itemRenameDraft.desc.trim(),
                stats: parseStats(itemRenameDraft.stats),
              }
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

    if (renameAction.type === 'folder') {
      const nextFolderName = normalizeFolderName(renameDraft);
      if (!nextFolderName) return;

      setDb((prev) => {
        const section = prev[nav];
        const folders = section.folders ?? {};
        const existingFolders = folders[currentCategory] ?? [];
        if (renameAction.folderIndex < 0 || renameAction.folderIndex >= existingFolders.length) return prev;
        if (existingFolders.some((folder, index) => (
          index !== renameAction.folderIndex && folder.name.toLowerCase() === nextFolderName.toLowerCase()
        ))) {
          return prev;
        }

        const nextFolders = existingFolders.map((folder, index) => (
          index === renameAction.folderIndex ? { ...folder, name: nextFolderName } : folder
        ));

        return {
          ...prev,
          [nav]: {
            ...section,
            folders: {
              ...folders,
              [currentCategory]: nextFolders,
            },
          },
        };
      });
    }

    if (renameAction.type === 'folderItem') {
      const nextName = itemRenameDraft.name.trim().slice(0, 120);
      if (!nextName) return;

      setDb((prev) => {
        const section = prev[nav];
        const folders = section.folders ?? {};
        const existingFolders = folders[currentCategory] ?? [];
        if (renameAction.folderIndex < 0 || renameAction.folderIndex >= existingFolders.length) return prev;

        const targetFolder = existingFolders[renameAction.folderIndex];
        if (renameAction.itemIndex < 0 || renameAction.itemIndex >= targetFolder.items.length) return prev;

        const nextFolders = existingFolders.map((folder, folderIndex) => {
          if (folderIndex !== renameAction.folderIndex) return folder;
          return {
            ...folder,
            items: folder.items.map((item, itemIndex) => (
              itemIndex === renameAction.itemIndex
                ? {
                    ...item,
                    name: nextName,
                    tag: itemRenameDraft.tag.trim().slice(0, 32),
                    desc: itemRenameDraft.desc.trim(),
                    stats: parseStats(itemRenameDraft.stats),
                  }
                : item
            )),
          };
        });

        return {
          ...prev,
          [nav]: {
            ...section,
            folders: {
              ...folders,
              [currentCategory]: nextFolders,
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
    setItemRenameDraft(emptyDraft());
  }, [renameAction, renameDraft, itemRenameDraft, nav, currentCategory]);

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

  const requestDeleteFolderItem = useCallback((folderIndex: number, itemIndex: number) => {
    const folder = currentFolders[folderIndex];
    const item = folder?.items[itemIndex];
    if (!folder || !item) return;

    setConfirmDeleteAction({
      type: 'folderItem',
      folderIndex,
      itemIndex,
      label: `Hapus item "${item.name}" dari folder "${folder.name}"?`,
    });
  }, [currentFolders]);

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
      codeInput: '',
      codeError: '',
    });
  }, [categoryList.length, currentCategory]);

  const requestDeleteFolder = useCallback((folderIndex: number) => {
    const folder = currentFolders[folderIndex];
    if (!folder) return;

    setConfirmDeleteAction({
      type: 'folder',
      folderIndex,
      folderName: folder.name,
      label: `Hapus folder "${folder.name}" beserta semua item di dalamnya?`,
      codeInput: '',
      codeError: '',
    });
  }, [currentFolders]);

  const confirmDelete = useCallback(() => {
    if (!confirmDeleteAction) return;

    if (confirmDeleteAction.type === 'item') {
      setDb((prev) => {
        const section = prev[nav];
        const oldItems = section.data[currentCategory] ?? [];
        if (confirmDeleteAction.index < 0 || confirmDeleteAction.index >= oldItems.length) return prev;

        const nextItems = oldItems.filter((_, i) => i !== confirmDeleteAction.index);
        const nextFolders = section.folders?.[currentCategory] ?? [];
        return {
          ...prev,
          [nav]: {
            ...section,
            data: {
              ...section.data,
              [currentCategory]: nextItems,
            },
            rootOrder: {
              ...(section.rootOrder ?? {}),
              [currentCategory]: createRootOrder(nextItems, nextFolders, section.rootOrder?.[currentCategory] ?? []),
            },
          },
        };
      });
      setOpenCardIndex(null);
    }

    if (confirmDeleteAction.type === 'category') {
      if (confirmDeleteAction.codeInput !== CATEGORY_DELETE_CODE) {
        setConfirmDeleteAction((prev) => (prev && prev.type === 'category' ? { ...prev, codeError: 'Kode hapus kategori salah.' } : prev));
        return;
      }
      const target = confirmDeleteAction.category;
      setDb((prev) => {
        const section = prev[nav];
        if (!section.categories.includes(target) || section.categories.length <= 1) return prev;

        const categories = section.categories.filter((cat) => cat !== target);
        const data = { ...section.data };
        delete data[target];
        const folders = { ...(section.folders ?? {}) };
        delete folders[target];
        const rootOrder = { ...(section.rootOrder ?? {}) };
        delete rootOrder[target];

        return {
          ...prev,
          [nav]: {
            ...section,
            categories,
            data,
            folders,
            rootOrder,
          },
        };
      });
    }

    if (confirmDeleteAction.type === 'folder') {
      if (confirmDeleteAction.codeInput !== FOLDER_DELETE_CODE) {
        setConfirmDeleteAction((prev) => (prev && prev.type === 'folder' ? { ...prev, codeError: 'Kode hapus folder salah.' } : prev));
        return;
      }

      setDb((prev) => {
        const section = prev[nav];
        const folders = section.folders ?? {};
        const categoryFolders = folders[currentCategory] ?? [];
        if (confirmDeleteAction.folderIndex < 0 || confirmDeleteAction.folderIndex >= categoryFolders.length) return prev;

        const nextFolders = categoryFolders.filter((_, idx) => idx !== confirmDeleteAction.folderIndex);
        return {
          ...prev,
          [nav]: {
            ...section,
            folders: {
              ...folders,
              [currentCategory]: nextFolders,
            },
            rootOrder: {
              ...(section.rootOrder ?? {}),
              [currentCategory]: createRootOrder(section.data[currentCategory] ?? [], nextFolders, section.rootOrder?.[currentCategory] ?? []),
            },
          },
        };
      });

      setOpenFolderItemCards((prev) => {
        const next = { ...prev };
        const removedFolder = currentFolders[confirmDeleteAction.folderIndex];
        if (removedFolder) {
          delete next[`${nav}:${currentCategory}:${removedFolder.id}`];
        }
        return next;
      });
    }

    if (confirmDeleteAction.type === 'folderItem') {
      setDb((prev) => {
        const section = prev[nav];
        const folders = section.folders ?? {};
        const categoryFolders = folders[currentCategory] ?? [];
        if (confirmDeleteAction.folderIndex < 0 || confirmDeleteAction.folderIndex >= categoryFolders.length) return prev;

        const nextFolders = categoryFolders.map((folder, idx) => (
          idx === confirmDeleteAction.folderIndex
            ? { ...folder, items: folder.items.filter((_, itemIdx) => itemIdx !== confirmDeleteAction.itemIndex) }
            : folder
        ));

        return {
          ...prev,
          [nav]: {
            ...section,
            folders: {
              ...folders,
              [currentCategory]: nextFolders,
            },
            rootOrder: {
              ...(section.rootOrder ?? {}),
              [currentCategory]: createRootOrder(section.data[currentCategory] ?? [], nextFolders, section.rootOrder?.[currentCategory] ?? []),
            },
          },
        };
      });

      setOpenFolderItemCards((prev) => {
        const folderId = currentFolders[confirmDeleteAction.folderIndex]?.id;
        if (!folderId) return prev;
        const key = `${nav}:${currentCategory}:${folderId}`;
        if (prev[key] === confirmDeleteAction.itemIndex) {
          return { ...prev, [key]: null };
        }
        return prev;
      });
    }

    setConfirmDeleteAction(null);
  }, [confirmDeleteAction, currentCategory, currentFolders, nav]);

  const transferItemToFolder = useCallback((folderIndex: number) => {
    if (!transferAction) return;

    setDb((prev) => {
      const section = prev[nav];
      const categoryItems = section.data[currentCategory] ?? [];
      const folders = section.folders ?? {};
      const categoryFolders = folders[currentCategory] ?? [];
      if (folderIndex < 0 || folderIndex >= categoryFolders.length) return prev;

      let picked: GameIdeaItem | null = null;
      let nextItems = categoryItems;
      let nextFolders = [...categoryFolders];

      if (transferAction.source === 'root') {
        if (transferAction.itemIndex < 0 || transferAction.itemIndex >= categoryItems.length) return prev;
        picked = categoryItems[transferAction.itemIndex];
        nextItems = categoryItems.filter((_, idx) => idx !== transferAction.itemIndex);
      } else {
        if (transferAction.folderIndex < 0 || transferAction.folderIndex >= categoryFolders.length) return prev;
        const sourceFolder = categoryFolders[transferAction.folderIndex];
        if (transferAction.itemIndex < 0 || transferAction.itemIndex >= sourceFolder.items.length) return prev;
        picked = sourceFolder.items[transferAction.itemIndex];
        nextFolders = categoryFolders.map((folder, idx) => (
          idx === transferAction.folderIndex
            ? { ...folder, items: folder.items.filter((_, itemIdx) => itemIdx !== transferAction.itemIndex) }
            : folder
        ));
      }

      if (!picked) return prev;

      nextFolders = nextFolders.map((folder, idx) => (
        idx === folderIndex ? { ...folder, items: [...folder.items, picked as GameIdeaItem] } : folder
      ));

      return {
        ...prev,
        [nav]: {
          ...section,
          data: {
            ...section.data,
            [currentCategory]: nextItems,
          },
          folders: {
            ...folders,
            [currentCategory]: nextFolders,
          },
          rootOrder: {
            ...(section.rootOrder ?? {}),
            [currentCategory]: createRootOrder(nextItems, nextFolders, section.rootOrder?.[currentCategory] ?? []),
          },
        },
      };
    });

    if (transferAction.source === 'root') {
      setOpenCardIndex(null);
    } else {
      const sourceFolderId = currentFolders[transferAction.folderIndex]?.id;
      if (sourceFolderId) {
        setOpenFolderItemCards((prev) => ({ ...prev, [`${nav}:${currentCategory}:${sourceFolderId}`]: null }));
      }
    }
    setTransferAction(null);
  }, [currentCategory, currentFolders, nav, transferAction]);

  const removeItemFromFolder = useCallback(() => {
    if (!transferAction || transferAction.source !== 'folder') return;

    setDb((prev) => {
      const section = prev[nav];
      const folders = section.folders ?? {};
      const categoryFolders = folders[currentCategory] ?? [];
      if (transferAction.folderIndex < 0 || transferAction.folderIndex >= categoryFolders.length) return prev;

      const sourceFolder = categoryFolders[transferAction.folderIndex];
      if (transferAction.itemIndex < 0 || transferAction.itemIndex >= sourceFolder.items.length) return prev;
      const picked = sourceFolder.items[transferAction.itemIndex];

      const nextFolders = categoryFolders.map((folder, idx) => (
        idx === transferAction.folderIndex
          ? { ...folder, items: folder.items.filter((_, itemIdx) => itemIdx !== transferAction.itemIndex) }
          : folder
      ));

      const nextItems = [...(section.data[currentCategory] ?? []), picked];
      return {
        ...prev,
        [nav]: {
          ...section,
          data: {
            ...section.data,
            [currentCategory]: nextItems,
          },
          folders: {
            ...folders,
            [currentCategory]: nextFolders,
          },
          rootOrder: {
            ...(section.rootOrder ?? {}),
            [currentCategory]: createRootOrder(nextItems, nextFolders, section.rootOrder?.[currentCategory] ?? []),
          },
        },
      };
    });

    const sourceFolderId = currentFolders[transferAction.folderIndex]?.id;
    if (sourceFolderId) {
      setOpenFolderItemCards((prev) => ({ ...prev, [`${nav}:${currentCategory}:${sourceFolderId}`]: null }));
    }
    setTransferAction(null);
  }, [currentCategory, currentFolders, nav, transferAction]);

  const handlePointerDown = useCallback((kind: DragKind, index: number, pointerId: number, clientX: number, clientY: number) => {
    if (!adminMode || interactionLockRef.current) return;

    if (dragHoldTimerRef.current) {
      clearTimeout(dragHoldTimerRef.current);
    }

    dragPointerRef.current = { kind, pointerId, startX: clientX, startY: clientY };
    dragHoldTimerRef.current = setTimeout(() => {
      if (kind === 'root') {
        const draggedRootSlot = currentRootSlots[index];
        if (draggedRootSlot?.kind === 'item') {
          const draggedItemIndex = itemIndexById.get(draggedRootSlot.id);
          if (typeof draggedItemIndex === 'number') {
            setOpenCardIndex((prev) => (prev === draggedItemIndex ? null : prev));
          }
        }

        if (draggedRootSlot?.kind === 'folder') {
          const draggedFolderIndex = folderIndexById.get(draggedRootSlot.id);
          const draggedFolder = typeof draggedFolderIndex === 'number' ? currentFolders[draggedFolderIndex] : null;
          if (draggedFolder) {
            const draggedFolderKey = `${nav}:${currentCategory}:${draggedFolder.id}`;
            setOpenFolderKey((prev) => (prev === draggedFolderKey ? null : prev));
            setOpenFolderItemCards((prev) => ({ ...prev, [draggedFolderKey]: null }));
          }
        }
      }

      if (kind === 'item') {
        setOpenCardIndex((prev) => (prev === index ? null : prev));
      }

      if (kind.startsWith('folderItem:')) {
        const folderIndex = Number.parseInt(kind.split(':')[1] ?? '', 10);
        const draggedFolder = Number.isFinite(folderIndex) ? currentFolders[folderIndex] : null;
        if (draggedFolder) {
          const draggedFolderKey = `${nav}:${currentCategory}:${draggedFolder.id}`;
          setOpenFolderItemCards((prev) => (prev[draggedFolderKey] === index ? { ...prev, [draggedFolderKey]: null } : prev));
        }
      }

      setActiveDrag({
        kind,
        fromIndex: index,
        overIndex: index,
        pointerId,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
      });
      dragHoldTimerRef.current = null;
    }, DRAG_HOLD_MS);
  }, [adminMode, currentCategory, currentFolders, currentRootSlots, folderIndexById, itemIndexById, nav]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const pointer = dragPointerRef.current;
      if (!pointer || pointer.pointerId !== event.pointerId) return;

      setActiveDrag((prev) => {
        if (!prev || prev.pointerId !== event.pointerId || prev.kind !== pointer.kind) {
          return prev;
        }

        const overIndex = findDragIndexFromPoint(pointer.kind, event.clientX, event.clientY);
        if (overIndex === null) {
          if (prev.currentX === event.clientX && prev.currentY === event.clientY) return prev;
          return { ...prev, currentX: event.clientX, currentY: event.clientY };
        }

        if (overIndex === prev.overIndex && prev.currentX === event.clientX && prev.currentY === event.clientY) return prev;
        return { ...prev, overIndex, currentX: event.clientX, currentY: event.clientY };
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);


  const commitDrag = useCallback(() => {

    setActiveDrag((drag) => {
      if (!drag || drag.fromIndex === drag.overIndex) {
        return null;
      }

      if (interactionLockTimerRef.current) {
        clearTimeout(interactionLockTimerRef.current);
        interactionLockTimerRef.current = null;
      }
      interactionLockRef.current = true;
      setInteractionLockedUi(true);
      interactionLockTimerRef.current = window.setTimeout(() => {
        interactionLockRef.current = false;
    setInteractionLockedUi(false);
        setInteractionLockedUi(false);
        interactionLockTimerRef.current = null;
      }, 1000);

      if (drag.kind === 'category') {
        const fromCategory = categoryList[drag.fromIndex];
        const toCategory = categoryList[drag.overIndex];

        if (!fromCategory || !toCategory) {
          return null;
        }

        setDb((prev) => {
          const section = prev[nav];
          if (section.categories.length < 2) return prev;
          return {
            ...prev,
            [nav]: {
              ...section,
              categories: reorderArray(section.categories, drag.fromIndex, drag.overIndex),
            },
          };
        });

        if (currentCategory === fromCategory) {
          setCategory(toCategory);
        }
      }

      if (drag.kind === 'root') {
        setDb((prev) => {
          const section = prev[nav];
          const existing = createRootOrder(
            section.data[currentCategory] ?? [],
            section.folders?.[currentCategory] ?? [],
            section.rootOrder?.[currentCategory] ?? []
          );
          if (existing.length < 2) return prev;
          return {
            ...prev,
            [nav]: {
              ...section,
              rootOrder: {
                ...(section.rootOrder ?? {}),
                [currentCategory]: reorderArray(existing, drag.fromIndex, drag.overIndex),
              },
            },
          };
        });
      }

      if (drag.kind === 'item') {
        setDb((prev) => {
          const section = prev[nav];
          const existing = section.data[currentCategory] ?? [];
          if (existing.length < 2) return prev;
          return {
            ...prev,
            [nav]: {
              ...section,
              data: {
                ...section.data,
                [currentCategory]: reorderArray(existing, drag.fromIndex, drag.overIndex),
              },
            },
          };
        });

        setOpenCardIndex((prev) => {
          if (prev === null) return prev;
          if (prev === drag.fromIndex) return drag.overIndex;
          if (drag.fromIndex < drag.overIndex && prev > drag.fromIndex && prev <= drag.overIndex) return prev - 1;
          if (drag.fromIndex > drag.overIndex && prev >= drag.overIndex && prev < drag.fromIndex) return prev + 1;
          return prev;
        });
      }

      if (drag.kind.startsWith('folderItem:')) {
        const folderIndex = Number.parseInt(drag.kind.split(':')[1] ?? '', 10);
        if (Number.isFinite(folderIndex)) {
          setDb((prev) => {
            const section = prev[nav];
            const folders = section.folders ?? {};
            const categoryFolders = folders[currentCategory] ?? [];
            if (folderIndex < 0 || folderIndex >= categoryFolders.length) return prev;
            const target = categoryFolders[folderIndex];
            if (!target || target.items.length < 2) return prev;

            const nextFolders = categoryFolders.map((folder, index) => (
              index === folderIndex ? { ...folder, items: reorderArray(folder.items, drag.fromIndex, drag.overIndex) } : folder
            ));

            return {
              ...prev,
              [nav]: {
                ...section,
                folders: {
                  ...folders,
                  [currentCategory]: nextFolders,
                },
              },
            };
          });

          const folder = currentFolders[folderIndex];
          const folderKey = folder ? `${nav}:${currentCategory}:${folder.id}` : null;
          if (folderKey) {
            setOpenFolderItemCards((prev) => {
              const current = prev[folderKey];
              if (current === null || current === undefined) return prev;
              if (current === drag.fromIndex) return { ...prev, [folderKey]: drag.overIndex };
              if (drag.fromIndex < drag.overIndex && current > drag.fromIndex && current <= drag.overIndex) return { ...prev, [folderKey]: current - 1 };
              if (drag.fromIndex > drag.overIndex && current >= drag.overIndex && current < drag.fromIndex) return { ...prev, [folderKey]: current + 1 };
              return prev;
            });
          }
        }
      }

      if (drag.kind === 'nav') {
        setNavOrder((prev) => reorderArray(prev, drag.fromIndex, drag.overIndex));
      }

      return null;
    });
  }, [categoryList, currentCategory, currentFolders, nav]);

  const handlePointerEnd = useCallback((pointerId: number) => {
    if (!dragPointerRef.current || dragPointerRef.current.pointerId !== pointerId) {
      return;
    }

    if (dragHoldTimerRef.current) {
      clearTimeout(dragHoldTimerRef.current);
      dragHoldTimerRef.current = null;
    }

    dragPointerRef.current = null;
    commitDrag();
  }, [commitDrag]);

  useEffect(() => {
    const onPointerStop = (event: PointerEvent) => {
      const pointer = dragPointerRef.current;
      if (!pointer || pointer.pointerId !== event.pointerId) return;
      handlePointerEnd(event.pointerId);
    };

    window.addEventListener('pointerup', onPointerStop, { passive: true });
    window.addEventListener('pointercancel', onPointerStop, { passive: true });
    return () => {
      window.removeEventListener('pointerup', onPointerStop);
      window.removeEventListener('pointercancel', onPointerStop);
    };
  }, [handlePointerEnd]);

  useEffect(() => () => {
    if (dragHoldTimerRef.current) {
      clearTimeout(dragHoldTimerRef.current);
      dragHoldTimerRef.current = null;
    }
    if (interactionLockTimerRef.current) {
      clearTimeout(interactionLockTimerRef.current);
      interactionLockTimerRef.current = null;
    }
    interactionLockRef.current = false;
    setInteractionLockedUi(false);
    dragPointerRef.current = null;
  }, []);


  const handleExportFadhil = useCallback(async () => {
    try {
      setError('');
      const payload = {
        magic: 'chartworkspace/archive',
        version: 1,
        exportedAt: new Date().toISOString(),
        sourceMapId: 'featurelib-game-ideas',
        feature: 'game-ideas',
        data: dbRef.current,
        navOrder,
      };
      const encoded = await encodeFadhilArchive(payload, 'featurelib-gameideas');
      const blob = new Blob([encoded], { type: 'application/x-fadhil-archive+json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `featurelib-${Date.now()}.fAdHiL`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setSaveState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal export .fAdHiL');
    }
  }, [navOrder]);

  const handleImportFadhilFile = useCallback(async (file: File) => {
    const text = await file.text();
    const decoded = await decodeFadhilArchive(text);
    if (decoded.contentType !== 'featurelib-gameideas') {
      throw new Error('File .fAdHiL bukan untuk FeatureLib game ideas.');
    }

    const parsed = decoded.payload as {
      feature?: string;
      data?: unknown;
      navOrder?: unknown;
    };

    if (parsed.feature !== 'game-ideas') {
      throw new Error('Payload .fAdHiL bukan dataset game ideas.');
    }

    const nextDb = sanitizeGameIdeaDatabase(parsed.data);
    const nextNavOrder = parseStoredNavOrder(JSON.stringify(parsed.navOrder ?? GAME_IDEA_NAV_ORDER));

    setDb(nextDb);
    setNavOrder(nextNavOrder);
    const importedSerialized = JSON.stringify(nextDb);
    const importedHash = hashDb(importedSerialized);
    lastSyncedHashRef.current = importedHash;
    lastLocalCacheHashRef.current = importedHash;
    localStorage.setItem(GAME_IDEA_STORAGE_KEY, importedSerialized);
    localStorage.setItem(NAV_ORDER_STORAGE_KEY, JSON.stringify(nextNavOrder));
    setRetryNonce((prev) => prev + 1);
    setError('');
    setSaveState('saved');
  }, []);

  const handlePickImportFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      await handleImportFadhilFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal import .fAdHiL');
    }
  }, [handleImportFadhilFile]);

  const statusLabel = useMemo(() => {
    if (saveState === 'saving') return 'SYNCING...';
    if (saveState === 'saved') return 'SYNCED';
    if (saveState === 'error') return 'SYNC ERROR';
    return loading ? 'BOOTING...' : 'READY';
  }, [loading, saveState]);


  const isInteractionLocked = useCallback(() => interactionLockRef.current, []);


  useEffect(() => {
    if (!hydratedRef.current || typeof window === 'undefined') return;

    let cancelled = false;
    const poll = window.setInterval(async () => {
      if (cancelled || liveSyncInFlightRef.current || document.visibilityState !== 'visible') return;
      liveSyncInFlightRef.current = true;
      try {
        const metaRes = await fetch('/api/game-ideas?meta=1', { cache: 'no-store' });
        if (!metaRes.ok) return;

        const metaPayload = (await metaRes.json()) as { version?: number };
        const remoteVersion = typeof metaPayload.version === 'number' ? metaPayload.version : null;
        if (remoteVersion === null) return;

        const hasRemoteUpdate = serverVersionRef.current === null || remoteVersion > serverVersionRef.current;
        if (!hasRemoteUpdate) return;

        const localUnsynced = lastSyncedHashRef.current !== dbHash;
        if (localUnsynced) return;

        const res = await fetch('/api/game-ideas', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = (await res.json()) as { data?: unknown; version?: number };
        const fullRemoteVersion = typeof payload.version === 'number' ? payload.version : remoteVersion;

        const remote = sanitizeGameIdeaDatabase(payload.data);
        const remoteSerialized = JSON.stringify(remote);
        const remoteHash = hashDb(remoteSerialized);

        serverVersionRef.current = fullRemoteVersion;
        lastSyncedHashRef.current = remoteHash;
        lastLocalCacheHashRef.current = remoteHash;
        setDb(remote);
        localStorage.setItem(GAME_IDEA_STORAGE_KEY, remoteSerialized);
      } catch {
        // silent: polling should never block local operations
      } finally {
        liveSyncInFlightRef.current = false;
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [dbHash]);

  useEffect(() => {
    const container = contentAreaRef.current;
    if (!container) return;

    const updateHint = () => {
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
      const top = container.scrollTop;
      const show = maxScroll > 4;
      const up = show && top > 6;
      const down = show && top < maxScroll - 6;
      setScrollHint((prev) => (prev.show === show && prev.up === up && prev.down === down ? prev : { show, up, down }));
    };

    updateHint();
    container.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint);
    const observer = new ResizeObserver(updateHint);
    observer.observe(container);

    return () => {
      container.removeEventListener('scroll', updateHint);
      window.removeEventListener('resize', updateHint);
      observer.disconnect();
    };
  }, [items.length, openCardIndex, currentCategory, nav]);

  useEffect(() => {
    const container = contentAreaRef.current;
    if (!container) return;

    const measureSpacer = () => {
      if (openCardIndex === null) {
        setDynamicScrollSpacer(CONTENT_SCROLL_EXTRA_SPACE_PX);
        return;
      }

      const openCard = document.querySelector<HTMLElement>(`[data-item-index=\"${openCardIndex}\"]`);
      if (!openCard) {
        setDynamicScrollSpacer(CONTENT_SCROLL_EXTRA_SPACE_PX);
        return;
      }

      const cardHeight = openCard.getBoundingClientRect().height;
      const baseline = 320;
      const extra = Math.max(0, cardHeight - baseline);
      const nextSpacer = Math.min(520, CONTENT_SCROLL_EXTRA_SPACE_PX + extra * 0.55);
      setDynamicScrollSpacer(Math.round(nextSpacer));
    };

    measureSpacer();
    const raf = window.requestAnimationFrame(measureSpacer);
    const observer = new ResizeObserver(measureSpacer);
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [openCardIndex, items.length, currentCategory, nav]);

  return (
    <main className={`architect-shell ${adminMode ? 'with-admin-panel' : ''} ${interactionLockedUi ? 'interaction-locked' : ''}`}> 
      <header className="architect-header">
        <h1>Created by Fadhil Akbar</h1>
        <div className="header-actions">
          <span className={`sync-state ${saveState}`}>{statusLabel}</span>
          <button type="button" className="sync-now" onClick={() => { void handleExportFadhil(); }}>
            EXPORT .fAdHiL
          </button>
          <button type="button" className="sync-now" onClick={() => importFileRef.current?.click()}>
            IMPORT .fAdHiL
          </button>
          <button type="button" className="admin-toggle" onClick={requestEnableAdminMode}>
            ADMIN MODE: {adminMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      <input ref={importFileRef} type="file" accept=".fAdHiL,application/json" className="hidden" onChange={handlePickImportFile} />

      <div className="layout">
        <aside className="sidebar">
          <nav className="sub-tabs">
            {categoryList.map((cat, index) => (
              <div
                key={cat}
                className={`slot-shell ${activeDrag?.kind === 'category' && activeDrag.overIndex === index ? 'slot-shell-target' : ''}`}
                data-drag-kind="category"
                data-drag-index={index}
                data-slot-index={index + 1}
                onPointerDown={(event) => handlePointerDown('category', index, event.pointerId, event.clientX, event.clientY)}
                onPointerUp={(event) => handlePointerEnd(event.pointerId)}
                onPointerCancel={(event) => handlePointerEnd(event.pointerId)}
              >
                <button
                  type="button"
                  className={`tab-btn slot-el ${cat === currentCategory ? 'active' : ''} ${dragShiftForIndex(index, activeDrag, 'category')} ${isDraggedIndex(index, activeDrag, 'category') ? 'dragged' : ''}`}
                  style={dragStyle(isDraggedIndex(index, activeDrag, 'category') ? activeDrag : null, 'category')}
                  onClick={() => {
                    if (activeDrag || isInteractionLocked()) return;
                    setCategory(cat);
                    registerUniversalRenameClick(`category:${nav}:${cat}`, () => requestRenameCategory(cat));
                  }}
                >
                  {cat}
                </button>
              </div>
            ))}
          </nav>
        </aside>

        <section className="content-area" ref={contentAreaRef} style={{ '--dynamic-scroll-spacer': `${dynamicScrollSpacer}px` } as CSSProperties}>
          {currentRootSlots.map((slot, slotIndex) => {
            if (slot.kind === 'item') {
              const index = itemIndexById.get(slot.id);
              if (index === undefined) return null;
              const item = items[index];
              return (
                <div
                  key={`root-item-${item.id}`}
                  className={`slot-shell item-slot-shell ${activeDrag?.kind === 'root' && activeDrag.overIndex === slotIndex ? 'slot-shell-target item-slot-target' : ''}`}
                  data-drag-kind="root"
                  data-drag-index={slotIndex}
                  data-slot-index={slotIndex + 1}
                  data-item-index={index}
                  onPointerDown={(event) => handlePointerDown('root', slotIndex, event.pointerId, event.clientX, event.clientY)}
                  onPointerUp={(event) => handlePointerEnd(event.pointerId)}
                  onPointerCancel={(event) => handlePointerEnd(event.pointerId)}
                >
                  <article
                    className={`card slot-el ${openCardIndex === index ? 'open' : ''} ${dragShiftForIndex(slotIndex, activeDrag, 'root')} ${isDraggedIndex(slotIndex, activeDrag, 'root') ? 'dragged' : ''}`}
                    style={dragStyle(isDraggedIndex(slotIndex, activeDrag, 'root') ? activeDrag : null, 'root')}
                  >
                    {adminMode && (
                      <div className="admin-tools">
                        <button type="button" className="btn-icon folder" onClick={() => setTransferAction({ source: 'root', itemIndex: index })} disabled={currentFolders.length === 0}>
                          FOLDER
                        </button>
                        <button type="button" className="btn-icon del" onClick={() => requestDeleteItem(index)}>
                          DELETE
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      className="card-head"
                      onClick={() => {
                        if (activeDrag || isInteractionLocked()) return;
                        setOpenCardIndex((prev) => (prev === index ? null : index));
                        registerUniversalRenameClick(`item:${nav}:${currentCategory}:${index}`, () => requestRenameItem(index));
                      }}
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
                        {openCardIndex === index ? (
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
                        ) : null}
                      </div>
                    </div>
                  </article>
                </div>
              );
            }

            const folderIndex = folderIndexById.get(slot.id);
            if (folderIndex === undefined) return null;
            const folder = currentFolders[folderIndex];
            const folderKey = `${nav}:${currentCategory}:${folder.id}`;
            const isOpenFolder = openFolderKey === folderKey;
            const openFolderItemIndex = openFolderItemCards[folderKey] ?? null;
            const folderDragKind = `folderItem:${folderIndex}` as DragKind;

            return (
              <div
                key={`root-folder-${folder.id}`}
                className={`slot-shell item-slot-shell folder-slot-shell ${activeDrag?.kind === 'root' && activeDrag.overIndex === slotIndex ? 'slot-shell-target item-slot-target' : ''}`}
                data-drag-kind="root"
                data-drag-index={slotIndex}
                data-slot-index={slotIndex + 1}
                onPointerDown={(event) => handlePointerDown('root', slotIndex, event.pointerId, event.clientX, event.clientY)}
                onPointerUp={(event) => handlePointerEnd(event.pointerId)}
                onPointerCancel={(event) => handlePointerEnd(event.pointerId)}
              >
                <article className={`card folder-card slot-el ${isOpenFolder ? 'open' : ''} ${dragShiftForIndex(slotIndex, activeDrag, 'root')} ${isDraggedIndex(slotIndex, activeDrag, 'root') ? 'dragged' : ''}`}
                  style={dragStyle(isDraggedIndex(slotIndex, activeDrag, 'root') ? activeDrag : null, 'root')}>
                  {adminMode ? (
                    <div className="folder-admin-tools">
                      <button type="button" className="btn-icon del folder-del" onClick={() => requestDeleteFolder(folderIndex)}>
                        DELETE FOLDER
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="card-head folder-head"
                    onClick={() => {
                      if (activeDrag || isInteractionLocked()) return;
                      const previousOpenFolderKey = openFolderKey;
                      setOpenFolderKey((prev) => (prev === folderKey ? null : folderKey));
                      setOpenFolderItemCards((prev) => {
                        const next = { ...prev };
                        if (previousOpenFolderKey && previousOpenFolderKey !== folderKey) {
                          next[previousOpenFolderKey] = null;
                        }
                        if (isOpenFolder) {
                          next[folderKey] = null;
                        }
                        return next;
                      });
                      registerUniversalRenameClick(`folder:${nav}:${currentCategory}:${folder.id}`, () => requestRenameFolder(folderIndex));
                    }}
                  >
                    <div>
                      <h3>{folder.name}</h3>
                      <div className="card-meta">
                        <span className="tag folder-tag">{folder.items.length} ITEMCARDS</span>
                      </div>
                    </div>
                    <span className="expand-indicator folder-expand-indicator" aria-hidden="true">
                      {isOpenFolder ? '▲ Collapse folder' : '▼ Expand folder'}
                    </span>
                  </button>
                  <div className="card-body-wrapper folder-body-wrapper">
                    <div className="card-body">
                      {isOpenFolder ? (
                        <div className="inner folder-inner">
                          {folder.items.length === 0 ? (
                            <p className="desc folder-desc">Folder kosong.</p>
                          ) : (
                            folder.items.map((item, itemIndex) => {
                              const itemOpen = openFolderItemIndex === itemIndex;
                              return (
                                <div
                                  key={`folder-item-slot-${folder.id}-${item.id}`}
                                  className={`slot-shell item-slot-shell folder-item-slot ${activeDrag?.kind === folderDragKind && activeDrag.overIndex === itemIndex ? 'slot-shell-target item-slot-target' : ''}`}
                                  data-drag-kind={folderDragKind}
                                  data-drag-index={itemIndex}
                                  onPointerDown={(event) => {
                                    event.stopPropagation();
                                    handlePointerDown(folderDragKind, itemIndex, event.pointerId, event.clientX, event.clientY);
                                  }}
                                  onPointerUp={(event) => {
                                    event.stopPropagation();
                                    handlePointerEnd(event.pointerId);
                                  }}
                                  onPointerCancel={(event) => {
                                    event.stopPropagation();
                                    handlePointerEnd(event.pointerId);
                                  }}
                                >
                                  <article className={`card folder-item-card slot-el ${itemOpen ? 'open' : ''} ${dragShiftForIndex(itemIndex, activeDrag, folderDragKind)} ${isDraggedIndex(itemIndex, activeDrag, folderDragKind) ? 'dragged' : ''}`}
                                    style={dragStyle(isDraggedIndex(itemIndex, activeDrag, folderDragKind) ? activeDrag : null, folderDragKind)}>
                                    {adminMode ? (
                                      <div className="admin-tools folder-item-tools">
                                        <button type="button" className="btn-icon folder" onClick={() => setTransferAction({ source: 'folder', folderIndex, itemIndex })}>
                                          FOLDER
                                        </button>
                                        <button type="button" className="btn-icon del" onClick={() => requestDeleteFolderItem(folderIndex, itemIndex)}>
                                          DELETE
                                        </button>
                                      </div>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="card-head folder-item-head"
                                      onClick={() => {
                                        if (activeDrag || isInteractionLocked()) return;
                                        setOpenFolderItemCards((prev) => ({
                                          ...prev,
                                          [folderKey]: prev[folderKey] === itemIndex ? null : itemIndex,
                                        }));
                                        registerUniversalRenameClick(`folder-item:${nav}:${currentCategory}:${folder.id}:${item.id}`, () => requestRenameFolderItem(folderIndex, itemIndex));
                                      }}
                                    >
                                      <h4>{item.name}</h4>
                                      <div className="card-meta">
                                        <span className="tag">{item.tag || 'UNTAGGED'}</span>
                                        <span className="expand-indicator" aria-hidden="true">
                                          {itemOpen ? '▲ Collapse detail' : '▼ Expand detail'}
                                        </span>
                                      </div>
                                    </button>
                                    <div className="card-body-wrapper folder-item-body-wrapper">
                                      <div className="card-body">
                                        {itemOpen ? (
                                          <div className="inner folder-item-inner">
                                            <p className="desc desc-content">{item.desc || 'No description.'}</p>
                                            {Object.entries(item.stats).length === 0 ? (
                                              <p className="desc">No stats.</p>
                                            ) : (
                                              Object.entries(item.stats).map(([key, value]) => (
                                                <div key={`${folder.name}-${item.name}-${key}`} className="stat">
                                                  <span className="stat-label">{key}:</span>
                                                  <span className="stat-value">{value}</span>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  </article>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              </div>
            );
          })}

          <div className="content-scroll-spacer" aria-hidden="true" />
          {!loading && items.length === 0 && currentFolders.length === 0 && <p className="empty-hint">Belum ada ide di kategori ini.</p>}
          {error && <p className="error-hint">{error}</p>}
        </section>
        {scrollHint.show && (
          <div className="scroll-indicator" aria-hidden="true">
            <span className={`scroll-indicator-arrow ${scrollHint.up ? 'on' : ''}`}>▲</span>
            <span className={`scroll-indicator-arrow ${scrollHint.down ? 'on' : ''}`}>▼</span>
          </div>
        )}
      </div>

      {activeDrag && <div className="drag-indicator">DRAG MODE ACTIVE</div>}

      <footer className="footer">
        {navOrder.map((key, index) => (
          <div
            key={key}
            className={`slot-shell nav-slot-shell ${activeDrag?.kind === 'nav' && activeDrag.overIndex === index ? 'slot-shell-target' : ''}`}
            data-drag-kind="nav"
            data-drag-index={index}
            data-slot-index={index + 1}
            onPointerDown={(event) => handlePointerDown('nav', index, event.pointerId, event.clientX, event.clientY)}
            onPointerUp={(event) => handlePointerEnd(event.pointerId)}
            onPointerCancel={(event) => handlePointerEnd(event.pointerId)}
          >
          <button
            type="button"
            className={`nav-item slot-el ${nav === key ? 'active' : ''} ${dragShiftForIndex(index, activeDrag, 'nav')} ${isDraggedIndex(index, activeDrag, 'nav') ? 'dragged' : ''}`}
            style={dragStyle(isDraggedIndex(index, activeDrag, 'nav') ? activeDrag : null, 'nav')}
            onClick={() => {
              if (activeDrag || isInteractionLocked()) return;
              setNav(key);
              registerUniversalRenameClick(`nav:${key}`, () => requestRenameNav(key));
            }}
          >
            {(db[key].title || key.toUpperCase()).toUpperCase()}
          </button>
          </div>
        ))}
      </footer>

      {adminMode && (
        <section className="admin-panel" aria-label="FeatureLib admin actions">
          <button type="button" className="admin-action add" onClick={openAddChooser}>ADD</button>
          <button type="button" className="admin-action del" onClick={requestDeleteCategory} disabled={!currentCategory}>DELETE CATEGORY</button>
        </section>
      )}

      {showAddChooser && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>PILIH TIPE ADD</h2>
            <div className="add-choice-list">
              <label className="add-choice">
                <input type="checkbox" checked={addTarget === 'category'} onChange={() => setAddTarget('category')} />
                <span>ADD CATEGORY</span>
              </label>
              <label className="add-choice">
                <input type="checkbox" checked={addTarget === 'folder'} onChange={() => setAddTarget('folder')} />
                <span>ADD FOLDER</span>
              </label>
              <label className="add-choice">
                <input type="checkbox" checked={addTarget === 'item'} onChange={() => setAddTarget('item')} />
                <span>ADD ITEM</span>
              </label>
            </div>
            <div className="modal-btns">
              <button type="button" className="btn-abort" onClick={() => setShowAddChooser(false)}>CANCEL</button>
              <button type="button" className="btn-confirm" onClick={confirmAddChoice}>CONTINUE</button>
            </div>
          </div>
        </div>
      )}

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

      {showFolderModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>NEW_FOLDER_NODE</h2>
            <div className="input-group">
              <label>FOLDER NAME</label>
              <input value={folderDraft} onChange={(e) => setFolderDraft(e.target.value)} />
            </div>
            <div className="modal-btns">
              <button type="button" className="btn-abort" onClick={() => setShowFolderModal(false)}>
                ABORT
              </button>
              <button type="button" className="btn-confirm" onClick={saveFolder}>
                INITIATE
              </button>
            </div>
          </div>
        </div>
      )}

      {transferAction && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>{transferAction?.source === 'folder' ? 'MANAGE ITEM FOLDER' : 'TRANSFER ITEM TO FOLDER'}</h2>
            {currentFolders.length === 0 ? (
              <p className="desc">Belum ada folder di kategori ini.</p>
            ) : (
              <div className="transfer-list">
                {currentFolders.map((folder, idx) => (
                  <div key={`transfer-${folder.name}-${idx}`} className="transfer-row">
                    <span>{folder.name}</span>
                    <button type="button" className="btn-confirm" onClick={() => transferItemToFolder(idx)}>
                      TRANSFER
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-btns">
              {transferAction?.source === 'folder' ? (
                <button type="button" className="btn-confirm danger" onClick={removeItemFromFolder}>
                  REMOVE FROM FOLDER
                </button>
              ) : null}
              <button type="button" className="btn-abort" onClick={() => setTransferAction(null)}>
                CANCEL
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
            {confirmDeleteAction.type === 'category' || confirmDeleteAction.type === 'folder' ? (
              <div className="input-group">
                <label>{confirmDeleteAction.type === 'folder' ? 'MASUKKAN CODE UNTUK DELETE FOLDER' : 'MASUKKAN CODE UNTUK DELETE CATEGORY'}</label>
                <input
                  value={confirmDeleteAction.codeInput}
                  onChange={(e) => setConfirmDeleteAction((prev) => (prev && (prev.type === 'category' || prev.type === 'folder')
                    ? { ...prev, codeInput: e.target.value, codeError: '' }
                    : prev))}
                  placeholder={confirmDeleteAction.type === 'folder' ? 'DeleteFolderByCode' : 'DeleteCategoryByCode'}
                />
                {confirmDeleteAction.codeError ? <p className="error-hint">{confirmDeleteAction.codeError}</p> : null}
              </div>
            ) : null}
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
            <h2>
              {renameAction.type === 'category'
                ? 'RENAME CATEGORY'
                : renameAction.type === 'nav'
                  ? 'RENAME BOTTOM SECTION'
                  : renameAction.type === 'folder'
                    ? 'RENAME FOLDER'
                    : 'RENAME ITEM CARD'}
            </h2>
            {renameAction.type === 'item' || renameAction.type === 'folderItem' ? (
              <>
                <div className="input-group">
                  <label>TITLE</label>
                  <input value={itemRenameDraft.name} onChange={(e) => setItemRenameDraft((prev) => ({ ...prev, name: e.target.value }))} maxLength={120} />
                </div>
                <div className="input-group">
                  <label>TAGS</label>
                  <input value={itemRenameDraft.tag} onChange={(e) => setItemRenameDraft((prev) => ({ ...prev, tag: e.target.value }))} maxLength={32} />
                </div>
                <div className="input-group">
                  <label>DESCRIPTION</label>
                  <textarea rows={4} value={itemRenameDraft.desc} onChange={(e) => setItemRenameDraft((prev) => ({ ...prev, desc: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label>STATS (Format: Power:10, HP:100)</label>
                  <input value={itemRenameDraft.stats} onChange={(e) => setItemRenameDraft((prev) => ({ ...prev, stats: e.target.value }))} />
                </div>
              </>
            ) : (
              <div className="input-group">
                <label>
                  {renameAction.type === 'category'
                    ? 'NAMA KATEGORI BARU'
                    : renameAction.type === 'folder'
                      ? 'NAMA FOLDER BARU'
                      : 'NAMA SECTION BARU'}
                </label>
                <input
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  maxLength={renameAction.type === 'category' ? 32 : renameAction.type === 'folder' ? 80 : 64}
                />
              </div>
            )}
            <div className="modal-btns">
              <button
                type="button"
                className="btn-abort"
                onClick={() => {
                  setRenameAction(null);
                  setRenameDraft('');
                  setItemRenameDraft(emptyDraft());
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
          --header-h: 52px;
          --footer-h: 50px;
          --admin-h: 0px;
          --shell-v-pad: 20px;
          --bg: #010103;
          --surface: rgba(10, 10, 15, 0.8);
          --accent: #00f2ff;
          --accent2: #bc13fe;
          --text: #e0e0e0;
          --dim: #555;
          --border: rgba(0, 242, 255, 0.3);
          --neon: 0 0 7px rgba(0, 242, 255, 0.4), 0 0 20px rgba(0, 242, 255, 0.2);
          --neon-intense: 0 0 10px #00f2ff, 0 0 30px rgba(0, 242, 255, 0.5), 0 0 60px rgba(0, 242, 255, 0.2);
          height: 100dvh;
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
        .architect-shell.interaction-locked {
          pointer-events: none;
          cursor: progress;
        }

        .architect-shell.with-admin-panel {
          --admin-h: 56px;
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
        .architect-header h1 { font-size: 0.78rem; letter-spacing: 0.7px; color: #fff; text-shadow: var(--neon-intense); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; transform: scaleX(0.88); transform-origin: left center; max-width: 44%; }
        .header-actions { display: inline-flex; gap: 5px; align-items: center; flex-wrap: nowrap; justify-content: flex-end; min-width: 0; flex: 1; }
        .sync-state { font-size: 9px; letter-spacing: 0.5px; color: #75f7ff; white-space: nowrap; }
        .sync-state.error { color: #fb7185; }
        .admin-toggle,
        .nav-item,
        .tab-btn,
        .btn-abort,
        .btn-confirm,
        .admin-action,
        .btn-icon { font-family: inherit; }
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
        .layout { position: relative; flex: 1; display: flex; gap: 10px; padding: 10px; min-height: 0; height: calc(100dvh - var(--header-h) - var(--footer-h) - var(--admin-h) - env(safe-area-inset-bottom)); overflow: hidden; }
        .sidebar { width: 170px; flex-shrink: 0; }
        .sub-tabs { display: flex; flex-direction: column; gap: 4px; overflow: hidden; max-height: 100%; }
        .slot-shell {
          position: relative;
          outline: 1px solid rgba(148, 163, 184, 0.35);
          outline-offset: -1px;
          border-radius: 4px;
        }
        .slot-shell-target {
          outline: 2px dashed rgba(0, 242, 255, 0.95);
          box-shadow: 0 0 20px rgba(0, 242, 255, 0.35), inset 0 0 0 1px rgba(0, 242, 255, 0.25);
        }
        .slot-el {
          width: 100%;
        }
        .tab-btn {
          padding: 6px 8px;
          text-align: left;
          user-select: none;
          touch-action: pan-y;
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
          overflow-y: scroll;
          overflow-x: hidden;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          scroll-behavior: smooth;
          scrollbar-gutter: stable both-edges;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 8px;
          align-content: start;
          padding-right: 2px;
          padding-bottom: max(20px, calc(var(--footer-h) + var(--admin-h) + env(safe-area-inset-bottom) + 14px));
        }
        .content-area::-webkit-scrollbar { width: 10px; }
        .content-area::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.42); }
        .content-area::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(0, 242, 255, 0.85), rgba(56, 189, 248, 0.65)); border-radius: 999px; border: 2px solid rgba(2, 6, 23, 0.8); }
        .content-scroll-spacer {
          grid-column: 1 / -1;
          height: max(10dvh, calc(var(--footer-h) + var(--admin-h) + env(safe-area-inset-bottom) + var(--dynamic-scroll-spacer, 96px)));
          pointer-events: none;
        }
        .scroll-indicator {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 40;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          pointer-events: none;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(0, 242, 255, 0.35);
          border-radius: 999px;
          padding: 5px 4px;
          box-shadow: 0 0 16px rgba(0, 242, 255, 0.2);
        }
        .scroll-indicator-arrow {
          font-size: 11px;
          line-height: 1;
          color: rgba(148, 163, 184, 0.55);
          transition: color 120ms ease, text-shadow 120ms ease;
        }
        .scroll-indicator-arrow.on {
          color: #67f6ff;
          text-shadow: 0 0 8px rgba(0, 242, 255, 0.5);
        }
        .card {
          position: relative;
          user-select: none;
          touch-action: pan-y;
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
        .admin-tools { position: absolute; right: 6px; top: 5px; z-index: 3; display: inline-flex; gap: 4px; }
        .folder-admin-tools { position: absolute; right: 8px; top: 7px; z-index: 4; }
        .folder-del { font-size: 7px; padding: 2px 5px; }
        .btn-icon.folder {
          background: rgba(14, 165, 233, 0.14);
          color: #7dd3fc;
          border: 1px solid rgba(56, 189, 248, 0.72);
          border-radius: 3px;
          padding: 1px 3px;
          min-width: 0;
          line-height: 1.1;
          cursor: pointer;
          font-size: 8px;
          letter-spacing: 0.02em;
        }
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
        .card-body-wrapper { display: grid; grid-template-rows: 0fr; transition: none; }
        .card.open .card-body-wrapper { grid-template-rows: 1fr; }
        .card-body { overflow: hidden; contain: content; }
        .folder-card {
          background: linear-gradient(145deg, rgba(34, 5, 14, 0.95), rgba(66, 10, 28, 0.92));
          border: 1px solid rgba(127, 29, 29, 0.85);
          box-shadow: 0 0 18px rgba(127, 29, 29, 0.32), inset 0 0 0 1px rgba(185, 28, 28, 0.22);
          color: #f8fafc;
        }
        .folder-head {
          background: transparent;
          color: #f8fafc;
          padding-right: 120px;
        }
        .folder-head h3 { margin: 0; font-size: 11px; color: #f8fafc; line-height: 1.15; }
        .folder-expand-indicator {
          color: #67f6ff;
          border-color: rgba(0, 242, 255, 0.78);
          box-shadow: 0 0 12px rgba(0, 242, 255, 0.42);
          font-size: 10px;
          padding: 2px 8px;
          font-weight: 800;
        }
        .folder-tag {
          color: #fecaca;
          border-color: rgba(248, 113, 113, 0.52);
          box-shadow: 0 0 8px rgba(127, 29, 29, 0.35);
        }
        .folder-slot-shell { outline-color: rgba(127, 29, 29, 0.55); }
        .folder-body-wrapper { grid-template-rows: 1fr; }
        .folder-inner { padding: 0 10px 10px; border-top: 1px solid rgba(248, 113, 113, 0.22); display: grid; gap: 8px; }
        .folder-item-card {
          border-radius: 8px;
          width: 100%;
        }
        .folder-item-card.open {
          border-color: rgba(0, 242, 255, 0.72);
          box-shadow: 0 0 24px rgba(0, 242, 255, 0.34), inset 0 0 0 1px rgba(0, 242, 255, 0.26);
        }
        .folder-item-head { width: 100%; border: 0; background: transparent; color: inherit; padding: 8px 48px 8px 8px; display: grid; gap: 3px; align-items: center; text-align: left; cursor: pointer; }
        .folder-item-head h4 { margin: 0; font-size: 11px; color: #ffffff; }
        .folder-item-tools { right: 6px; top: 5px; }
        .folder-item-body-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 150ms ease; }
        .folder-item-card.open .folder-item-body-wrapper { grid-template-rows: 1fr; }
        .folder-item-inner { padding: 0 8px 8px; border-top: 1px solid rgba(0, 242, 255, 0.14); }
        .transfer-list { display: grid; gap: 8px; max-height: 280px; overflow: auto; }
        .transfer-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid rgba(0, 242, 255, 0.32); padding: 8px 10px; }
        .inner { padding: 0 10px 8px; border-top: 1px solid rgba(0, 242, 255, 0.14); }
        .desc { color: #ff8c1a; margin: 6px 0; font-size: 11px; line-height: 1.5; font-weight: 500; letter-spacing: 0.01em; font-family: 'Orbitron', 'Rajdhani', 'Inter', 'Segoe UI', sans-serif; text-shadow: 0 0 8px rgba(255, 140, 26, 0.22); }
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
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 900;
          min-height: var(--admin-h);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          border-top: 1px solid var(--border);
          padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
          background: rgba(0, 0, 0, 0.94);
          backdrop-filter: blur(2px);
        }
        .admin-action {
          border: 1px solid #334155;
          box-shadow: inset 0 0 0 1px rgba(0,242,255,0.08);
          background: rgba(255, 255, 255, 0.02);
          color: #cbd5e1;
          cursor: pointer;
          font-size: 9px;
          min-height: 30px;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 800;
          white-space: nowrap;
        }
        .admin-action:disabled { opacity: 0.35; cursor: not-allowed; }
        .admin-action.add { border-color: rgba(0, 242, 255, 0.7); color: var(--accent); }
        .admin-action.del { border-color: rgba(255, 42, 95, 0.8); color: #ff2a5f; }

        .item-slot-shell {
          padding: 1px;
        }
        .item-slot-target {
          outline: 2px solid rgba(255, 255, 255, 0.98);
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.75), inset 0 0 0 1px rgba(255, 255, 255, 0.65);
        }
        .dragged {
          transform: translate3d(var(--drag-x, 0), var(--drag-y, 0), 0) scale(1.01);
          z-index: 80;
          pointer-events: none;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 22px rgba(0, 242, 255, 0.45);
        }
        .drag-shift-up,
        .drag-shift-down,
        .tab-btn,
        .card,
        .nav-item {
          transition: transform 220ms cubic-bezier(0.18, 0.92, 0.2, 1), box-shadow 140ms ease;
          will-change: transform;
        }
        .drag-shift-up { transform: translate3d(0, calc(-100% - 8px), 0); }
        .drag-shift-down { transform: translate3d(0, calc(100% + 8px), 0); }
        .drag-indicator {
          position: fixed;
          left: 50%;
          top: 12px;
          transform: translateX(-50%);
          z-index: 1200;
          border: 1px solid rgba(0, 242, 255, 0.95);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.86);
          color: #67f6ff;
          box-shadow: 0 0 26px rgba(0, 242, 255, 0.5);
          padding: 6px 12px;
          font-size: 11px;
          letter-spacing: 0.08em;
        }
        .footer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: calc(var(--admin-h) + env(safe-area-inset-bottom));
          z-index: 850;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          border-top: 1px solid var(--border);
          padding: 8px;
          background: #000;
          margin-bottom: 0;
        }
        .nav-item { border: 0; background: transparent; color: #ddf7ff; padding: 6px 10px; cursor: pointer; font-size: 10px; font-weight: 800; max-width: 24vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: none; touch-action: pan-y; }
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
        
        .add-choice-list {
          display: grid;
          gap: 8px;
          margin: 8px 0;
        }
        .add-choice {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(0, 242, 255, 0.3);
          padding: 8px;
          border-radius: 6px;
          color: #d9f7ff;
        }
        .add-choice input {
          width: 14px;
          height: 14px;
          accent-color: #06b6d4;
        }
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
          .architect-shell {
            --header-h: 46px;
            --footer-h: 48px;
            --shell-v-pad: 16px;
          }
          .architect-shell.interaction-locked {
          pointer-events: none;
          cursor: progress;
        }

        .architect-shell.with-admin-panel {
            --admin-h: 54px;
          }
          .architect-header { padding: 6px 8px; gap: 6px; }
          .architect-header h1 { font-size: 0.66rem; letter-spacing: 0.15px; max-width: 38vw; transform: scaleX(0.84); }
          .header-actions { gap: 4px; }
          .sync-state { font-size: 8px; }
          .admin-toggle, .sync-now { font-size: 8px; padding: 4px 6px; }
          .layout {
            flex-direction: column;
            padding: 8px;
            gap: 8px;
            height: calc(100dvh - var(--header-h) - var(--footer-h) - var(--admin-h) - env(safe-area-inset-bottom));
            min-height: 0;
            overflow: hidden;
          }
          .sidebar { width: 100%; }
          .sub-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: min(38dvh, 300px); gap: 5px; overflow: hidden; }
          .tab-btn { text-align: center; padding: 6px 5px; }
          .content-area {
            grid-template-columns: 1fr;
            gap: 7px;
            flex: 1 1 auto;
            min-height: 0;
            height: 100%;
            overflow-y: auto;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
            scroll-behavior: smooth;
            padding-bottom: max(20px, calc(env(safe-area-inset-bottom) + 20px));
          }
          .scroll-indicator { right: 4px; }
          .card-head { padding: 7px 40px 7px 9px; }
          
          .footer { padding: 7px 6px; }
          .nav-item { padding: 6px 6px; max-width: 22vw; }
        }
      `}</style>
    </main>
  );
}
