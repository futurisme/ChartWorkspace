'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RealtimeProvider } from '@/components/RealtimeProvider';
import { ConceptFlow } from '@/components/ConceptFlow';
import { PresenceBar } from '@/components/PresenceBar';

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
      displayName="Viewer"
      mode="view"
    >
      <div className="flex h-screen flex-col">
        <header className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="mt-1 text-sm text-gray-500">Viewing</p>
            </div>
            <div className="rounded bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              View Only
            </div>
          </div>
        </header>

        <PresenceBar />

        <div className="flex-1">
          <ConceptFlow isReadOnly={true} />
        </div>
      </div>
    </RealtimeProvider>
  );
}

export default function ViewerPage() {
  return <ViewerContent />;
}
