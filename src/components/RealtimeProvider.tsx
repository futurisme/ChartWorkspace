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
import { UserPresence, setupAwareness, getRemoteUsers } from '@/lib/presence';
import { getCurrentSnapshot } from '@/lib/snapshot';

export interface RealtimeContextType {
  doc: Y.Doc | null;
  provider: WebrtcProvider | null;
  awareness: any | null;
  localClientId: number | null;
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
  const [localClientId, setLocalClientId] = useState<number | null>(null);
  const [localPresence, setLocalPresence] = useState<UserPresence | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [saveErrorCount, setSaveErrorCount] = useState(0);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const presenceTimeoutRef = useRef<NodeJS.Timeout>();

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
            const update = Buffer.from(snapshot, 'base64');
            Y.applyUpdate(newDoc, new Uint8Array(update));
          } catch (error) {
            console.warn('Could not apply snapshot:', error);
          }
        }

        if (!isMounted) return;

        setDoc(newDoc);
        setCurrentVersion(version);

        // Setup WebRTC provider
        const newProvider = new WebrtcProvider(
          `chartmaker-${mapId}`,
          newDoc
        );

        setProvider(newProvider);

        // Get awareness
        const newAwareness = newProvider.awareness;
        setAwareness(newAwareness);
        setLocalClientId(newAwareness.clientID);

        // Setup local user presence
        const presence: UserPresence = {
          userId,
          displayName,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`,
          mode,
          lastUpdated: Date.now(),
        };

        setLocalPresence(presence);
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
      } catch (error) {
        console.error('Failed to initialize realtime:', error);
      }
    };

    initializeRealtime();

    return () => {
      isMounted = false;
    };
  }, [mapId, userId, displayName, mode]);

  // Debounced snapshot save - last-write-wins strategy
  const saveSnapshot = useCallback(async () => {
    if (!doc) return;

    try {
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
    } catch (error) {
      setSaveErrorCount(prev => Math.min(prev + 1, 3));
      console.error('Snapshot save error (will retry):', error);
    }
  }, [doc, mapId, currentVersion]);

  // Auto-save every 15 seconds
  useEffect(() => {
    if (!doc) return;

    const handleChange = () => {
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

  // Auto-update presence
  useEffect(() => {
    if (!awareness || !localPresence) return;

    const handleUpdate = () => {
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current);
      }

      presenceTimeoutRef.current = setTimeout(() => {
        const updated = {
          ...localPresence,
          lastUpdated: Date.now(),
        };
        setupAwareness(awareness, updated);
        setLocalPresence(updated);
      }, 5000);
    };

    const unsubscribe = () => {
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current);
      }
    };

    return unsubscribe;
  }, [awareness, localPresence]);

  const updatePresence = useCallback(
    (updates: Partial<UserPresence>) => {
      if (!awareness || !localPresence) return;

      const updated = {
        ...localPresence,
        ...updates,
        lastUpdated: Date.now(),
      };

      setLocalPresence(updated);
      setupAwareness(awareness, updated);
    },
    [awareness, localPresence]
  );

  return (
    <RealtimeContext.Provider
      value={{
        doc,
        provider,
        awareness,
        localClientId,
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
