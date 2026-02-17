'use client';

import React, { useMemo } from 'react';
import { useRealtime } from './RealtimeProvider';
import type { UserPresence } from '@/features/collaboration/shared/presence';

interface PresenceBarProps {
  compact?: boolean;
  className?: string;
  showBorder?: boolean;
}


export function PresenceBar({ compact = false, className = "", showBorder = true }: PresenceBarProps) {
  const { localPresence, remoteUsers, isConnected, isDatabaseConnected } = useRealtime();

  const allUsers = useMemo(() => {
    const users = [...remoteUsers];
    if (localPresence) {
      users.unshift(localPresence);
    }
    return users;
  }, [localPresence, remoteUsers]);

  if (!localPresence) {
    return (
      <div className={`flex items-center justify-between bg-slate-50 px-2 py-0.5 sm:px-2 ${showBorder ? 'border-b border-slate-200' : ''} ${className}`.trim()}>
        <span className="text-[11px] text-gray-500">Loading...</span>
      </div>
    );
  }

  const dbLabel = isDatabaseConnected
    ? 'Terkoneksi ke Database'
    : 'Tidak terkoneksi ke Database';

  return (
    <div className={`bg-white px-2 py-0.5 sm:px-2 ${showBorder ? 'border-b border-slate-200' : ''} ${className}`.trim()}>
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-col items-start gap-0 sm:flex-row sm:items-center sm:gap-1.5">
          <span className={`text-[9px] font-semibold leading-tight sm:text-[10px] ${isDatabaseConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {dbLabel}
          </span>
          <span className="text-[9px] text-gray-600 sm:text-[10px]">
            Collaboration: {isConnected ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {allUsers.slice(0, compact ? 4 : allUsers.length).map((user, idx) => (
            <UserAvatar
              key={`${user.userId}-${idx}`}
              user={user}
              isLocal={user.userId === localPresence.userId}
              compact={compact}
            />
          ))}
          {compact && allUsers.length > 4 && (
            <span className="text-[10px] font-medium text-gray-500">+{allUsers.length - 4}</span>
          )}
        </div>
      </div>

      {!compact && allUsers.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
  compact?: boolean;
}

function UserAvatar({ user, isLocal, compact = false }: UserAvatarProps) {
  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative flex items-center justify-center rounded-full font-semibold text-white ${compact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-[11px] sm:h-8 sm:w-8'}`}
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
      className="flex items-center gap-0.5.5 rounded-lg px-2.5 py-1 text-xs font-medium text-white"
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
