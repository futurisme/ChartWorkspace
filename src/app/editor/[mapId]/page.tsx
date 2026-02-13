'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RealtimeProvider } from '@/components/RealtimeProvider';
import { FlowWorkspace } from '@/features/flow/flow-workspace';
import { PresenceBar } from '@/components/PresenceBar';

function EditorContent() {
  const params = useParams();
  const mapId = params.mapId as string;
  const [title, setTitle] = useState('Untitled Map');
  const [loading, setLoading] = useState(true);
  const [displayName] = useState(() => (Math.random() > 0.5 ? 'Alice' : 'Bob'));
  const [showDesktopControlsPanel, setShowDesktopControlsPanel] = useState(true);
  const [showDesktopStatusPanel, setShowDesktopStatusPanel] = useState(true);
  const [showMobileToolsPanel, setShowMobileToolsPanel] = useState(false);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const response = await fetch(`/api/maps/${mapId}?ensure=1`);
        if (response.ok) {
          const data = await response.json();
          setTitle(data.title);
          if (typeof window !== 'undefined') {
            localStorage.setItem('lastMapId', mapId);
            localStorage.setItem('lastMapTitle', data.title || 'Untitled Map');
          }
        }
      } catch (error) {
        console.error('Failed to load map:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMap();
  }, [mapId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  const userId = typeof window !== 'undefined'
    ? localStorage.getItem('userId') || `user-${Date.now()}`
    : `user-${Date.now()}`;

  if (typeof window !== 'undefined') {
    localStorage.setItem('userId', userId);
  }
  const handleNodeSelection = (nodeId: string | null) => {
    if (!nodeId || typeof window === 'undefined') {
      return;
    }

    if (window.matchMedia('(max-width: 1023px)').matches) {
      setShowMobileToolsPanel(true);
    }
  };

  return (
    <RealtimeProvider
      mapId={mapId}
      userId={userId}
      displayName={displayName}
      mode="edit"
    >
      <div className="flex h-screen flex-col">
        <header className="border-b border-cyan-500/25 bg-slate-950/90 px-2.5 py-1.5 shadow-[0_6px_20px_rgba(6,182,212,0.12)] backdrop-blur sm:px-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-wide text-cyan-100 sm:text-base">{title}</h1>
              <p className="hidden text-[10px] uppercase tracking-[0.12em] text-cyan-300/70 sm:block">Collaborative concept workspace</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setShowMobileToolsPanel((prev) => !prev)}
                className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-100 transition hover:bg-cyan-500/20 lg:hidden"
              >
                {showMobileToolsPanel ? 'Hide Tools' : 'Show Tools'}
              </button>
              <button
                type="button"
                onClick={() => setShowDesktopControlsPanel((prev) => !prev)}
                className="hidden rounded-md border border-cyan-400/30 bg-slate-900/70 px-2 py-1 text-[11px] font-semibold text-cyan-100 transition hover:bg-slate-900 lg:inline-flex"
              >
                {showDesktopControlsPanel ? 'Hide Controls' : 'Show Controls'}
              </button>
              <button
                type="button"
                onClick={() => setShowDesktopStatusPanel((prev) => !prev)}
                className="hidden rounded-md border border-cyan-400/30 bg-slate-900/70 px-2 py-1 text-[11px] font-semibold text-cyan-100 transition hover:bg-slate-900 lg:inline-flex"
              >
                {showDesktopStatusPanel ? 'Hide Status' : 'Show Status'}
              </button>
              <div className="rounded-md border border-cyan-300/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 sm:text-[11px]">
                Edit #{mapId}
              </div>
            </div>
          </div>
        </header>

        <PresenceBar compact />

        <div className="min-h-0 flex-1">
          <FlowWorkspace
            isReadOnly={false}
            showDesktopControlsPanel={showDesktopControlsPanel}
            showDesktopStatusPanel={showDesktopStatusPanel}
            showMobileToolsPanel={showMobileToolsPanel}
            onSelectNode={handleNodeSelection}
          />
        </div>
      </div>
    </RealtimeProvider>
  );
}

export default function EditorPage() {
  return <EditorContent />;
}

