'use client';

import React, { useMemo } from 'react';
import { useRealtime } from './RealtimeProvider';
import type { UserPresence } from '@/lib/presence';

interface PresenceBarProps {
  compact?: boolean;
}

export function PresenceBar({ compact = false }: PresenceBarProps) {
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
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 sm:px-4">
        <span className="text-xs text-gray-500 sm:text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-1.5 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-gray-900 sm:text-sm">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <span className="text-xs text-gray-600 sm:text-sm">{allUsers.length} online</span>
        </div>

        <div className="flex items-center gap-1.5">
          {allUsers.slice(0, compact ? 5 : allUsers.length).map((user, idx) => (
            <UserAvatar
              key={`${user.userId}-${idx}`}
              user={user}
              isLocal={user.userId === localPresence.userId}
            />
          ))}
          {compact && allUsers.length > 5 && (
            <span className="text-xs font-medium text-slate-500">+{allUsers.length - 5}</span>
          )}
        </div>
      </div>

      {!compact && allUsers.length > 0 && (
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
  user: UserPresence;
  isLocal?: boolean;
}

function UserAvatar({ user, isLocal }: UserAvatarProps) {
  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white sm:h-8 sm:w-8"
      style={{ backgroundColor: user.color }}
      title={`${user.displayName}${isLocal ? ' (you)' : ''}`}
    >
      {initials}
      {isLocal && (
        <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
      )}
    </div>
  );
}

interface UserBadgeProps {
  user: UserPresence;
  isLocal?: boolean;
}

function UserBadge({ user, isLocal }: UserBadgeProps) {
  const hasCamera = typeof user.cameraX === 'number' && typeof user.cameraY === 'number';

  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: `${user.color}90` }}
    >
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: user.color }} />
      <span>{user.displayName}</span>
      <span className="ml-1 rounded px-1.5 py-0.5 text-xs font-semibold opacity-75">
        {user.mode === 'edit' ? 'Editing' : 'Viewing'}
      </span>
      {user.deviceKind && (
        <span className="text-[11px] uppercase opacity-85">{user.deviceKind === 'hp' ? 'HP' : 'PC'}</span>
      )}
      {user.currentNodeId && <span className="text-[11px] opacity-90">Node: {user.currentNodeId}</span>}
      {hasCamera && (
        <span className="text-[11px] opacity-80">Cam: {Math.round(user.cameraX!)} , {Math.round(user.cameraY!)}</span>
      )}
      {isLocal && <span className="ml-0.5 text-xs">(you)</span>}
    </div>
  );
}
