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
    const raw = process.env.NEXT_PUBLIC_WEBRTC_URL ?? '';
    const urls = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (urls.length === 0 && typeof window !== 'undefined') {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      signalingUrlsRef.current = isLocalhost
        ? ['ws://localhost:4444']
        : ['wss://signaling.yjs.dev'];
    } else {
      signalingUrlsRef.current = urls;
    }
  }

  const probeSignalingUrl = useCallback(async (url: string) => {
    const probeUrl = url
      .replace(/^wss:/, 'https:')
      .replace(/^ws:/, 'http:');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      await fetch(probeUrl, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Initialize document and provider
  useEffect(() => {
    let isMounted = true;

    const initializeRealtime = async () => {
      try {
        // Fetch initial snapshot from server
        const response = await fetch(`/api/maps/${mapId}`);
        if (!response.ok) throw new Error('Failed to load map');

        const { snapshot, version } = await response.json();

        // Create Yjs doc
        const newDoc = new Y.Doc();
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

        if (!isMounted) return;

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
        let reachableUrls = signalingUrls;

        if (signalingUrls.length > 0) {
          const checks = await Promise.all(
            signalingUrls.map(async (url) => ({
              url,
              ok: await probeSignalingUrl(url),
            }))
          );
          reachableUrls = checks.filter((item) => item.ok).map((item) => item.url);
        }

        if (reachableUrls.length === 0 && typeof window !== 'undefined') {
          const isLocalhost =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
          if (isLocalhost) {
            const localUrl = 'ws://localhost:4444';
            const localOk = await probeSignalingUrl(localUrl);
            reachableUrls = localOk ? [localUrl] : [];
          }
        }

        if (reachableUrls.length > 0) {
          const newProvider = new WebrtcProvider(
            `chartmaker-${mapId}`,
            newDoc,
            { signaling: reachableUrls }
          );

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
          const handleStatus = (event: any) => {
            if (isMounted) {
              setIsConnected(event.connected ?? event.status === 'connected');
            }
          };

          newProvider.on('status', handleStatus);

          return () => {
            newAwareness.off('change', handleAwarenessChange);
            newProvider.off('status', handleStatus);
          };
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
    };
  }, [mapId, userId, displayName, mode, probeSignalingUrl]);

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
