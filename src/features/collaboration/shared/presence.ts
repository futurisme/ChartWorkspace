export interface UserPresence {
  userId: string;
  displayName: string;
  color: string;
  mode: 'edit' | 'view';
  deviceKind?: 'pc' | 'hp';
  currentNodeId?: string;
  cursorX?: number;
  cursorY?: number;
  cameraX?: number;
  cameraY?: number;
  lastUpdated: number;
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
