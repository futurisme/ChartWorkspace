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

const LOCAL_SIGNALING_URL = 'ws://localhost:4444';
const BLOCKED_SIGNALING_HOSTS = new Set(['signaling.yjs.dev', 'www.signaling.yjs.dev', 'yjs.dev']);

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
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

    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_SIGNALING_HOSTS.has(hostname) || hostname.endsWith('.yjs.dev')) {
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

  if (signalingUrlsRef.current === null) {
    const parsedEnvUrls = parseSignalingUrls(process.env.NEXT_PUBLIC_WEBRTC_URL ?? '');
    if (parsedEnvUrls.length > 0) {
      signalingUrlsRef.current = parsedEnvUrls;
    } else if (typeof window !== 'undefined' && isLocalHostname(window.location.hostname)) {
      signalingUrlsRef.current = [LOCAL_SIGNALING_URL];
    } else {
      signalingUrlsRef.current = [];
    }
  }

  // Initialize document and provider
  useEffect(() => {
    let isMounted = true;
    let activeDoc: Y.Doc | null = null;
    let activeProvider: WebrtcProvider | null = null;
    let detachRealtimeHandlers: (() => void) | null = null;

    const initializeRealtime = async () => {
      try {
        // In edit mode, ensure the map exists so direct /editor/:id links do not fail on first open.
        const mapEndpoint = mode === 'edit'
          ? `/api/maps/${mapId}?ensure=1`
          : `/api/maps/${mapId}`;
        const response = await fetch(mapEndpoint);
        if (!response.ok) {
          throw new Error(`Failed to load map (${response.status})`);
        }

        const { snapshot, version } = await response.json();

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
          lastUpdated: Date.now(),
        };

        setLocalPresence(presence);
        localPresenceRef.current = presence;

        // Setup WebRTC provider
        const signalingUrls = signalingUrlsRef.current ?? [];
        if (signalingUrls.length > 0) {
          const newProvider = new WebrtcProvider(
            `chartmaker-${mapId}`,
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
              setRemoteUsers(remote);
            }
          };

          newAwareness.on('change', handleAwarenessChange);

          // Connection status
          const handleStatus = (event: { status?: string; connected?: boolean }) => {
            if (isMounted) {
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

        setProvider(null);
        setAwareness(null);
        setRemoteUsers([]);
        setIsConnected(false);
      } catch (error) {
        console.error('Failed to initialize realtime:', error);
      }
    };

    initializeRealtime();

    return () => {
      isMounted = false;
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
  }, [mapId, userId, displayName, mode]);

  // Debounced snapshot save - last-write-wins strategy
  const saveSnapshot = useCallback(async () => {
    if (!doc || !dirtyRef.current) return;

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
        setSaveErrorCount(prev => Math.min(prev + 1, 3));
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

    window.addEventListener('beforeunload', handleBeforeUnload);

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

  const updatePresence = useCallback(
    (updates: Partial<UserPresence>) => {
      if (!awareness) return;
      const presence = localPresenceRef.current;
      if (!presence) return;

      const updated = {
        ...presence,
        ...updates,
        lastUpdated: Date.now(),
      };

      localPresenceRef.current = updated;
      setupAwareness(awareness, updated);

      setLocalPresence((prev) => {
        if (!prev) return updated;
        const same =
          prev.userId === updated.userId &&
          prev.displayName === updated.displayName &&
          prev.color === updated.color &&
          prev.mode === updated.mode &&
          prev.currentNodeId === updated.currentNodeId &&
          prev.cursorX === updated.cursorX &&
          prev.cursorY === updated.cursorY;
        return same ? prev : updated;
      });
    },
    [awareness]
  );

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
