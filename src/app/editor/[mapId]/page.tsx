'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    loading: () => <EditorWorkspaceSkeleton />,
  }
);

function EditorWorkspaceSkeleton() {
  return (
    <div className="h-full w-full bg-slate-50 p-3 sm:p-4">
      <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
        <div className="rounded-xl border border-slate-200 bg-white" />
        <div className="hidden rounded-xl border border-slate-200 bg-white lg:block" />
      </div>
    </div>
  );
}

function EditorHeaderSkeleton() {
  return (
    <header className="border-b border-cyan-500/25 bg-slate-950/90 px-2.5 py-1.5 shadow-[0_6px_20px_rgba(6,182,212,0.12)] backdrop-blur sm:px-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="h-4 w-44 rounded bg-cyan-200/30" />
          <div className="hidden h-3 w-56 rounded bg-cyan-200/20 sm:block" />
        </div>
        <div className="h-6 w-20 rounded bg-cyan-200/20" />
      </div>
    </header>
  );
}

function EditorContent() {
  const params = useParams();
  const mapId = params.mapId as string;
  const [title, setTitle] = useState('Untitled Map');
  const [loading, setLoading] = useState(true);
  const [displayName] = useState(() => (Math.random() > 0.5 ? 'Alice' : 'Bob'));
  const [showMobileToolsPanel, setShowMobileToolsPanel] = useState(false);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const response = await fetch(`/api/maps/${mapId}?ensure=1`);
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

  const handleNodeSelection = useCallback((nodeId: string | null) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!window.matchMedia('(max-width: 1023px)').matches) {
      return;
    }

    setShowMobileToolsPanel(Boolean(nodeId));
  }, []);

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
        <EditorHeaderSkeleton />
      ) : (
        <header className="border-b border-cyan-500/25 bg-slate-950/90 px-2.5 py-1.5 shadow-[0_6px_20px_rgba(6,182,212,0.12)] backdrop-blur sm:px-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-wide text-cyan-100 sm:text-base">{title}</h1>
              <p className="hidden text-[10px] uppercase tracking-[0.12em] text-cyan-300/70 sm:block">Collaborative concept workspace</p>
            </div>
            <div className="rounded-md border border-cyan-300/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 sm:text-[11px]">
              Edit #{mapId}
            </div>
          </div>
        </header>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <EditorWorkspaceSkeleton />
        ) : (
          <RealtimeProvider mapId={mapId} userId={userId} displayName={displayName} mode="edit">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <PresenceBar compact />
              <FlowWorkspace
                isReadOnly={false}
                showDesktopControlsPanel
                showDesktopStatusPanel
                showMobileToolsPanel={showMobileToolsPanel}
                onSelectNode={handleNodeSelection}
                snapEnabled
                inviteRequestToken={0}
              />
            </div>
          </RealtimeProvider>
        )}
      </div>
    </div>
  );
}

export default function EditorPage() {
  return <EditorContent />;
}
