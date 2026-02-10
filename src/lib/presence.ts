import * as Y from 'yjs';

export interface UserPresence {
  userId: string;
  displayName: string;
  color: string;
  mode: 'edit' | 'view';
  currentNodeId?: string;
  cursorX?: number;
  cursorY?: number;
  lastUpdated: number;
}

export interface AwarenessUpdate {
  added: number[];
  updated: number[];
  removed: number[];
}

/**
 * Get a random color for user presence
 */
export function generateUserColor(): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Create user presence object
 */
export function createPresence(
  userId: string,
  displayName: string,
  mode: 'edit' | 'view' = 'edit'
): UserPresence {
  return {
    userId,
    displayName,
    color: generateUserColor(),
    mode,
    lastUpdated: Date.now(),
  };
}

/**
 * Update user presence
 */
export function updatePresence(
  presence: UserPresence,
  updates: Partial<UserPresence>
): UserPresence {
  return {
    ...presence,
    ...updates,
    lastUpdated: Date.now(),
  };
}

/**
 * Setup Yjs Awareness for presence
 */
export function setupAwareness(
  awareness: any,
  userPresence: UserPresence
): void {
  awareness.setLocalState(userPresence);
}

/**
 * Get all remote users (excluding self)
 */
export function getRemoteUsers(
  awareness: any,
  localClientId: number
): UserPresence[] {
  const users: UserPresence[] = [];

  awareness.getStates().forEach((state: any, clientId: number) => {
    if (clientId !== localClientId && state) {
      users.push(state as UserPresence);
    }
  });

  return users;
}

/**
 * Listen for presence changes
 */
export function onPresenceChange(
  awareness: any,
  callback: (update: AwarenessUpdate & { changes: Map<number, UserPresence> }) => void
): () => void {
  const handler = (
    update: AwarenessUpdate,
    origin: any
  ) => {
    const changes = new Map<number, UserPresence>();

    [...update.added, ...update.updated].forEach((clientId) => {
      const state = awareness.getClientState(clientId);
      if (state) {
        changes.set(clientId, state as UserPresence);
      }
    });

    callback({ ...update, changes });
  };

  awareness.on('change', handler);

  return () => {
    awareness.off('change', handler);
  };
}

/**
 * Clean up old presence data (stale users)
 */
export function pruneStalePresence(
  awareness: any,
  maxAgeMs: number = 30000
): void {
  const now = Date.now();

  awareness.getStates().forEach((state: any, clientId: number) => {
    if (
      state &&
      state.lastUpdated &&
      now - state.lastUpdated > maxAgeMs
    ) {
      // Mark for removal (in real implementation, they'd disconnect)
      console.warn(`Stale presence detected for client ${clientId}`);
    }
  });
}
