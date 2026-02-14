'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { PresenceBar } from '@/components/PresenceBar';

const RealtimeProvider = dynamic(
  () => import('@/components/RealtimeProvider').then((module) => module.RealtimeProvider),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-50" />,
  }
);

const FlowWorkspace = dynamic(
  () => import('@/features/flow/flow-workspace').then((module) => module.FlowWorkspace),
  {
    ssr: false,
    loading: () => <ViewerWorkspaceSkeleton />,
  }
);

function ViewerWorkspaceSkeleton() {
  return (
    <div className="h-full w-full bg-slate-50 p-3 sm:p-4">
      <div className="h-full rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

function ViewerHeaderSkeleton() {
  return (
    <header className="border-b border-slate-200 bg-slate-50/95 px-3 py-1.5 backdrop-blur sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="h-5 w-52 rounded bg-slate-300/70" />
          <div className="hidden h-3 w-40 rounded bg-slate-300/50 sm:block" />
        </div>
        <div className="h-6 w-20 rounded bg-blue-100" />
      </div>
    </header>
  );
}

function ViewerContent() {
  const params = useParams();
  const mapId = params.mapId as string;
  const [title, setTitle] = useState('Untitled Map');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const response = await fetch(`/api/maps/${mapId}`);
        if (response.ok) {
          const data = await response.json();
          setTitle(data.title);
          localStorage.setItem('lastMapId', mapId);
          localStorage.setItem('lastMapTitle', data.title || 'Untitled Map');
        }
      } catch (error) {
        console.error('Failed to load map:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMap();
  }, [mapId]);

  const userId = useMemo(() => {
    if (typeof window === 'undefined') {
      return `user-${Date.now()}`;
    }

    const existing = localStorage.getItem('userId');
    const nextUserId = existing || `user-${Date.now()}`;
    localStorage.setItem('userId', nextUserId);
    return nextUserId;
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {loading ? (
        <ViewerHeaderSkeleton />
      ) : (
        <header className="border-b border-slate-200 bg-slate-50/95 px-3 py-1.5 backdrop-blur sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">{title}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Workspace-focused viewer</p>
            </div>
            <div className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 sm:text-xs">
              View Only
            </div>
          </div>
        </header>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <ViewerWorkspaceSkeleton />
        ) : (
          <RealtimeProvider mapId={mapId} userId={userId} displayName="Viewer" mode="view">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <PresenceBar compact />
              <FlowWorkspace isReadOnly={true} />
            </div>
          </RealtimeProvider>
        )}
      </div>
    </div>
  );
}

export default function ViewerPage() {
  return <ViewerContent />;
}
