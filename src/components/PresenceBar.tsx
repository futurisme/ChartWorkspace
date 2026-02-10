'use client';

import React, { useMemo } from 'react';
import { useRealtime } from './RealtimeProvider';

export function PresenceBar() {
  const { localPresence, remoteUsers, isConnected } = useRealtime();

  const allUsers = useMemo(() => {
    const users = [...remoteUsers];
    if (localPresence) {
      users.unshift(localPresence);
    }
    return users;
  }, [localPresence, remoteUsers]);

  if (!localPresence) {
    return (
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-900">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>

          <div className="hidden h-6 border-l border-gray-300 sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {allUsers.length} online
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allUsers.map((user, idx) => (
            <UserAvatar
              key={`${user.userId}-${idx}`}
              user={user}
              isLocal={user.userId === localPresence.userId}
            />
          ))}
        </div>
      </div>

      {allUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {allUsers.map((user, idx) => (
            <UserBadge
              key={`${user.userId}-${idx}`}
              user={user}
              isLocal={user.userId === localPresence.userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface UserAvatarProps {
  user: any;
  isLocal?: boolean;
}

function UserAvatar({ user, isLocal }: UserAvatarProps) {
  const initials = user.displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: user.color }}
      title={`${user.displayName}${isLocal ? ' (you)' : ''}`}
    >
      {initials}
      {isLocal && (
        <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
      )}
    </div>
  );
}

interface UserBadgeProps {
  user: any;
  isLocal?: boolean;
}

function UserBadge({ user, isLocal }: UserBadgeProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: user.color + '90' }}
    >
      <div
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: user.color }}
      />
      <span>{user.displayName}</span>
      <span className="ml-1 rounded px-1.5 py-0.5 text-xs font-semibold opacity-75">
        {user.mode === 'edit' ? 'Editing' : 'Viewing'}
      </span>
      {isLocal && <span className="ml-0.5 text-xs">(you)</span>}
    </div>
  );
}
