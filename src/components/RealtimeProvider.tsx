'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { UserPresence, setupAwareness, getRemoteUsers, generateUserColor } from '@/lib/presence';
import { applyYjsSnapshot, getCurrentSnapshot } from '@/lib/snapshot';
import { formatMapId, parseMapId } from '@/lib/mapId';

const LOCAL_SIGNALING_URL = 'ws://localhost:4444';
const REALTIME_LOG_PREFIX = '[realtime]';

const FRAME_BUDGET_MS = 16.7;
const PRESENCE_UPDATE_CADENCE_MS = 120;

type SchedulerWithPostTask = {
  postTask?: (callback: () => void, options?: { priority?: 'background' | 'user-visible' | 'user-blocking'; delay?: number }) => Promise<void>;
};

function scheduleNonUrgentWork(callback: () => void) {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  const schedulerApi = (globalThis as { scheduler?: SchedulerWithPostTask }).scheduler;
  if (schedulerApi?.postTask) {
    void schedulerApi.postTask(callback, { priority: 'background' });
    return;
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout: 150 });
    return;
  }

  window.setTimeout(callback, 0);
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function shouldUseSameHostSignalingFallback() {
  return process.env.NEXT_PUBLIC_SIGNALING_SAME_HOST_FALLBACK === '1';
}

function isRealtimeDebugEnabled() {
  return process.env.NEXT_PUBLIC_DEBUG_REALTIME === '1';
}

function logRealtime(level: 'info' | 'warn' | 'error', message: string, details?: Record<string, unknown>) {
  if (level === 'info' && !isRealtimeDebugEnabled()) {
    return;
  }

  const payload = details ? { ...details } : undefined;
  if (level === 'info') {
    console.info(`${REALTIME_LOG_PREFIX} ${message}`, payload ?? '');
    return;
  }

  if (level === 'warn') {
    console.warn(`${REALTIME_LOG_PREFIX} ${message}`, payload ?? '');
    return;
  }

  console.error(`${REALTIME_LOG_PREFIX} ${message}`, payload ?? '');
}

function detectDeviceKind(): 'pc' | 'hp' {
  if (typeof window === 'undefined') {
    return 'pc';
  }

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrowViewport = window.matchMedia('(max-width: 1023px)').matches;
  return coarsePointer || narrowViewport ? 'hp' : 'pc';
}

function normalizeSignalingUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const withScheme = /^wss?:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      return null;
    }

    parsed.hash = '';
    parsed.search = '';

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function parseSignalingUrls(rawValue: string) {
  const dedupedUrls = new Set<string>();
  rawValue
    .split(',')
    .map((part) => normalizeSignalingUrl(part))
    .filter((url): url is string => Boolean(url))
    .forEach((url) => dedupedUrls.add(url));
  return Array.from(dedupedUrls);
}

function normalizeMapRoomId(rawMapId: string): string {
  const parsed = parseMapId(rawMapId);
  if (parsed !== null) {
    return formatMapId(parsed);
  }

  return rawMapId.trim();
}

export interface RealtimeContextType {
  doc: Y.Doc | null;
  provider: WebrtcProvider | null;
  awareness: any | null;
  localPresence: UserPresence | null;
  remoteUsers: UserPresence[];
  isConnected: boolean;
  mapId: string;
  saveSnapshot: () => Promise<void>;
  updatePresence: (updates: Partial<UserPresence>) => void;
  saveErrorCount: number;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  mapId: string;
  userId: string;
  displayName: string;
  mode?: 'edit' | 'view';
  children: ReactNode;
}

export function RealtimeProvider({
  mapId,
  userId,
  displayName,
  mode = 'edit',
  children,
}: RealtimeProviderProps) {
  const normalizedRoomMapId = normalizeMapRoomId(mapId);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [awareness, setAwareness] = useState<any | null>(null);
  const [localPresence, setLocalPresence] = useState<UserPresence | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [saveErrorCount, setSaveErrorCount] = useState(0);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const dirtyRef = useRef(false);
  const updateCounterRef = useRef(0);
  const localPresenceRef = useRef<UserPresence | null>(null);
  const signalingUrlsRef = useRef<string[] | null>(null);
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const mapEtagRef = useRef<string | null>(null);
  const lastAppliedFallbackSnapshotRef = useRef<string | null>(null);
  const telemetryRef = useRef<Record<string, { samples: number; totalDurationMs: number; droppedFrames: number; maxDurationMs: number }>>({});
  const pendingPresenceRef = useRef<Partial<UserPresence> | null>(null);
  const presenceFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPresenceFlushRef = useRef(0);

  if (signalingUrlsRef.current === null) {
    const candidates = new Set<string>(parseSignalingUrls(process.env.NEXT_PUBLIC_WEBRTC_URL ?? ''));
    const hasEnvSignaling = candidates.size > 0;

    if (typeof window !== 'undefined') {
      const { hostname } = window.location;

      if (isLocalHostname(hostname)) {
        candidates.add(LOCAL_SIGNALING_URL);
      } else if (!hasEnvSignaling || shouldUseSameHostSignalingFallback()) {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        candidates.add(`${protocol}://${hostname}:4444`);
      }
    }

    signalingUrlsRef.current = Array.from(candidates);
  }

  // Initialize document and provider
  useEffect(() => {
    let isMounted = true;
    let activeDoc: Y.Doc | null = null;
    let activeProvider: WebrtcProvider | null = null;
    let detachRealtimeHandlers: (() => void) | null = null;
    const initAbortController = new AbortController();

    const initializeRealtime = async () => {
      try {
        // In edit mode, ensure the map exists so direct /editor/:id links do not fail on first open.
        const mapEndpoint = mode === 'edit'
          ? `/api/maps/${mapId}?ensure=1`
          : `/api/maps/${mapId}`;
        const response = await fetch(mapEndpoint, { signal: initAbortController.signal });
        if (!response.ok) {
          throw new Error(`Failed to load map (${response.status})`);
        }

        const { snapshot, version } = await response.json();
        mapEtagRef.current = response.headers.get('etag');

        // Create Yjs doc
        const newDoc = new Y.Doc();
        activeDoc = newDoc;
        newDoc.getMap('nodes');
        newDoc.getMap('edges');
        newDoc.getMap('selected');
        newDoc.getText('title');

        // Apply snapshot if exists
        if (snapshot) {
          try {
            applyYjsSnapshot(newDoc, snapshot);
          } catch (error) {
            console.warn('Could not apply snapshot:', error);
          }
        }

        if (!isMounted) {
          newDoc.destroy();
          activeDoc = null;
          return;
        }

        setDoc(newDoc);
        setCurrentVersion(version);

        // Setup local user presence
        const presence: UserPresence = {
          userId,
          displayName,
          color: generateUserColor(),
          mode,
          deviceKind: detectDeviceKind(),
          lastUpdated: Date.now(),
        };

        setLocalPresence(presence);
        localPresenceRef.current = presence;

        // Setup WebRTC provider
        const signalingUrls = signalingUrlsRef.current ?? [];
        if (signalingUrls.length > 0) {
          logRealtime('info', 'Initializing WebRTC provider', {
            roomId: `chartmaker-${normalizedRoomMapId}`,
            signalingUrls,
            mode,
          });

          const newProvider = new WebrtcProvider(
            `chartmaker-${normalizedRoomMapId}`,
            newDoc,
            { signaling: signalingUrls }
          );
          activeProvider = newProvider;

          setProvider(newProvider);

          // Get awareness
          const newAwareness = newProvider.awareness;
          setAwareness(newAwareness);

          setupAwareness(newAwareness, presence);

          // Listen for awareness changes
          const handleAwarenessChange = () => {
            if (isMounted) {
              const remote = getRemoteUsers(
                newAwareness,
                newAwareness.clientID
              );
              logRealtime('info', 'Awareness changed', { remoteUsers: remote.length, mode });
              scheduleNonUrgentWork(() => {
                setRemoteUsers(remote);
              });
            }
          };

          newAwareness.on('change', handleAwarenessChange);

          // Connection status
          const handleStatus = (event: { status?: string; connected?: boolean }) => {
            if (isMounted) {
              logRealtime(event.connected ?? event.status === 'connected' ? 'info' : 'warn', 'WebRTC status changed', {
                status: event.status,
                connected: event.connected,
                roomId: `chartmaker-${normalizedRoomMapId}`,
              });
              setIsConnected(event.connected ?? event.status === 'connected');
            }
          };

          newProvider.on('status', handleStatus);

          detachRealtimeHandlers = () => {
            newAwareness.off('change', handleAwarenessChange);
            newProvider.off('status', handleStatus);
          };
          return;
        }

        logRealtime('error', 'No signaling URL available. Live collaborator presence will be unavailable.', {
          mapId,
          normalizedRoomMapId,
          mode,
          hint: 'Set NEXT_PUBLIC_WEBRTC_URL or provide same-host signaling on port 4444.',
        });

        setProvider(null);
        setAwareness(null);
        setRemoteUsers([]);
        setIsConnected(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        logRealtime('error', 'Failed to initialize realtime provider', {
          mapId,
          normalizedRoomMapId,
          mode,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    initializeRealtime();

    return () => {
      isMounted = false;
      initAbortController.abort();
      if (detachRealtimeHandlers) {
        detachRealtimeHandlers();
        detachRealtimeHandlers = null;
      }
      if (activeProvider) {
        activeProvider.destroy();
        activeProvider = null;
      }
      if (activeDoc) {
        activeDoc.destroy();
        activeDoc = null;
      }
    };
  }, [mapId, normalizedRoomMapId, userId, displayName, mode]);


  const trackTelemetry = useCallback((handler: string, durationMs: number) => {
    const droppedFrames = Math.max(0, Math.floor(durationMs / FRAME_BUDGET_MS) - 1);
    const current = telemetryRef.current[handler] ?? {
      samples: 0,
      totalDurationMs: 0,
      droppedFrames: 0,
      maxDurationMs: 0,
    };

    const next = {
      samples: current.samples + 1,
      totalDurationMs: current.totalDurationMs + durationMs,
      droppedFrames: current.droppedFrames + droppedFrames,
      maxDurationMs: Math.max(current.maxDurationMs, durationMs),
    };

    telemetryRef.current[handler] = next;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('flow:telemetry', {
          detail: {
            handler,
            durationMs,
            droppedFrames,
            averageDurationMs: next.totalDurationMs / next.samples,
            samples: next.samples,
          },
        })
      );
    }
  }, []);

  const profileHandler = useCallback(<T,>(handler: string, callback: () => T): T => {
    const start = performance.now();
    const result = callback();
    trackTelemetry(handler, performance.now() - start);
    return result;
  }, [trackTelemetry]);

  const flushPresenceUpdates = useCallback(() => {
    const updates = pendingPresenceRef.current;
    if (!updates || !awareness) {
      return;
    }

    const presence = localPresenceRef.current;
    if (!presence) {
      return;
    }

    pendingPresenceRef.current = null;
    lastPresenceFlushRef.current = Date.now();

    profileHandler('presence.update.flush', () => {
      const updated = {
        ...presence,
        ...updates,
        lastUpdated: Date.now(),
      };

      localPresenceRef.current = updated;
      setupAwareness(awareness, updated);

      scheduleNonUrgentWork(() => {
        setLocalPresence((prev) => {
          if (!prev) return updated;
          const same =
            prev.userId === updated.userId &&
            prev.displayName === updated.displayName &&
            prev.color === updated.color &&
            prev.mode === updated.mode &&
            prev.deviceKind === updated.deviceKind &&
            prev.currentNodeId === updated.currentNodeId &&
            prev.cursorX === updated.cursorX &&
            prev.cursorY === updated.cursorY &&
            prev.cameraX === updated.cameraX &&
            prev.cameraY === updated.cameraY;
          return same ? prev : updated;
        });
      });
    });
  }, [awareness, profileHandler]);

  // Debounced snapshot save - last-write-wins strategy
  const saveSnapshot = useCallback(async () => {
    if (!doc || !dirtyRef.current) return;
    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    try {
      const updateMark = updateCounterRef.current;
      const snapshot = getCurrentSnapshot(doc);

      const response = await fetch('/api/maps/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mapId,
          snapshot,
          version: currentVersion,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }

      const result = await response.json();
      setCurrentVersion(result.version);
      setSaveErrorCount(0); // Reset on success
      if (updateCounterRef.current === updateMark) {
        dirtyRef.current = false;
      }
    } catch (error) {
      setSaveErrorCount(prev => Math.min(prev + 1, 3));
      console.error('Snapshot save error (will retry):', error);
    } finally {
      saveInFlightRef.current = false;
      if (queuedSaveRef.current && dirtyRef.current) {
        queuedSaveRef.current = false;
        void saveSnapshot();
      } else {
        queuedSaveRef.current = false;
      }
    }
  }, [doc, mapId, currentVersion]);

  // Auto-save every 15 seconds
  useEffect(() => {
    if (!doc) return;

    const handleChange = () => {
      dirtyRef.current = true;
      updateCounterRef.current += 1;
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new debounced save
      saveTimeoutRef.current = setTimeout(() => {
        saveSnapshot();
      }, 10000); // 10 seconds debounce
    };

    doc.on('update', handleChange);

    // Also set interval save every 15 seconds
    const intervalId = setInterval(() => {
      saveSnapshot();
    }, 15000);

    // Save on page unload
    const handleBeforeUnload = () => {
      saveSnapshot();
    };

    window.addEventListener('beforeunload', handleBeforeUnload, { passive: true });

    return () => {
      doc.off('update', handleChange);
      clearInterval(intervalId);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [doc, saveSnapshot]);

  // Auto-update presence to keep sessions fresh
  useEffect(() => {
    if (!awareness) return;

    const intervalId = setInterval(() => {
      const presence = localPresenceRef.current;
      if (!presence) return;

      const updated = {
        ...presence,
        lastUpdated: Date.now(),
      };

      localPresenceRef.current = updated;
      setupAwareness(awareness, updated);
    }, 2500);

    return () => {
      clearInterval(intervalId);
    };
  }, [awareness]);

  useEffect(() => {
    if (!doc) {
      return;
    }

    const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    const basePollingDelayMs = isMobile ? 2500 : 4000;
    let pollingDelayMs = basePollingDelayMs;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const queueNextPoll = (delayMs: number) => {
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      pollTimer = setTimeout(() => {
        void syncFromServer();
      }, delayMs);
    };

    const syncFromServer = async () => {
      if (isConnected) {
        pollingDelayMs = basePollingDelayMs;
        queueNextPoll(pollingDelayMs);
        return;
      }

      try {
        const response = await fetch(`/api/maps/${mapId}`, {
          cache: 'no-store',
          headers: mapEtagRef.current
            ? {
                'if-none-match': mapEtagRef.current,
              }
            : undefined,
        });

        if (response.status === 304) {
          pollingDelayMs = basePollingDelayMs;
          queueNextPoll(pollingDelayMs);
          return;
        }

        if (!response.ok) {
          pollingDelayMs = Math.min(pollingDelayMs * 1.5, 12000);
          queueNextPoll(pollingDelayMs);
          return;
        }

        const { snapshot } = await response.json();
        mapEtagRef.current = response.headers.get('etag');
        if (!snapshot || typeof snapshot !== 'string') {
          pollingDelayMs = basePollingDelayMs;
          queueNextPoll(pollingDelayMs);
          return;
        }

        if (lastAppliedFallbackSnapshotRef.current === snapshot) {
          pollingDelayMs = basePollingDelayMs;
          queueNextPoll(pollingDelayMs);
          return;
        }

        profileHandler('snapshot.pull.fallback', () => {
          applyYjsSnapshot(doc, snapshot);
        });
        logRealtime('info', 'Applied fallback snapshot sync', {
          mapId,
          pollingDelayMs,
          mode,
        });
        lastAppliedFallbackSnapshotRef.current = snapshot;
        pollingDelayMs = basePollingDelayMs;
        queueNextPoll(pollingDelayMs);
      } catch (error) {
        logRealtime('warn', 'Fallback sync polling failed', {
          mapId,
          pollingDelayMs,
          mode,
          error: error instanceof Error ? error.message : String(error),
        });
        pollingDelayMs = Math.min(pollingDelayMs * 1.5, 12000);
        queueNextPoll(pollingDelayMs);
      }
    };

    void syncFromServer();

    return () => {
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    };
  }, [doc, isConnected, mapId, mode, profileHandler]);

  const updatePresence = useCallback(
    (updates: Partial<UserPresence>) => {
      if (!awareness) return;

      profileHandler('presence.update.request', () => {
        pendingPresenceRef.current = {
          ...(pendingPresenceRef.current ?? {}),
          ...updates,
        };

        const now = Date.now();
        const elapsed = now - lastPresenceFlushRef.current;
        const touchesCursor = typeof updates.cursorX === 'number' || typeof updates.cursorY === 'number';

        if (!touchesCursor || elapsed >= PRESENCE_UPDATE_CADENCE_MS) {
          flushPresenceUpdates();
          return;
        }

        if (presenceFlushTimerRef.current) {
          return;
        }

        presenceFlushTimerRef.current = setTimeout(() => {
          presenceFlushTimerRef.current = null;
          flushPresenceUpdates();
        }, PRESENCE_UPDATE_CADENCE_MS - elapsed);
      });
    },
    [awareness, flushPresenceUpdates, profileHandler]
  );


  useEffect(() => () => {
    if (presenceFlushTimerRef.current) {
      clearTimeout(presenceFlushTimerRef.current);
      presenceFlushTimerRef.current = null;
    }
    flushPresenceUpdates();
  }, [flushPresenceUpdates]);

  return (
    <RealtimeContext.Provider
      value={{
        doc,
        provider,
        awareness,
        localPresence,
        remoteUsers,
        isConnected,
        mapId,
        saveSnapshot,
        updatePresence,
        saveErrorCount,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
