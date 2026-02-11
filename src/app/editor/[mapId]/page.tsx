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

  useEffect(() => {
    const loadMap = async () => {
      try {
        const response = await fetch(`/api/maps/${mapId}`);
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
        <header className="border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
              <p className="text-xs text-slate-500 sm:text-sm">Workspace-first collaborative editing</p>
            </div>
            <div className="rounded border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Edit Mode - Map #{mapId}
            </div>
          </div>
        </header>

        <PresenceBar />

        <div className="flex-1">
          <FlowWorkspace isReadOnly={false} />
        </div>
      </div>
    </RealtimeProvider>
  );
}

export default function EditorPage() {
  return <EditorContent />;
}

