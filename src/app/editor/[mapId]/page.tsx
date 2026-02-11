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

  return (
    <RealtimeProvider
      mapId={mapId}
      userId={userId}
      displayName={displayName}
      mode="edit"
    >
      <div className="flex h-screen flex-col">
        <header className="border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">{title}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Collaborative concept workspace</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setShowMobileToolsPanel((prev) => !prev)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 lg:hidden"
              >
                {showMobileToolsPanel ? 'Hide Tools' : 'Show Tools'}
              </button>
              <button
                type="button"
                onClick={() => setShowDesktopControlsPanel((prev) => !prev)}
                className="hidden rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 lg:inline-flex"
              >
                {showDesktopControlsPanel ? 'Hide Controls' : 'Show Controls'}
              </button>
              <button
                type="button"
                onClick={() => setShowDesktopStatusPanel((prev) => !prev)}
                className="hidden rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 lg:inline-flex"
              >
                {showDesktopStatusPanel ? 'Hide Status' : 'Show Status'}
              </button>
              <div className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 sm:text-xs">
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
          />
        </div>
      </div>
    </RealtimeProvider>
  );
}

export default function EditorPage() {
  return <EditorContent />;
}

