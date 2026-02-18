'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { PresenceBar } from '@/components/PresenceBar';
import { BroadcastRefreshSettings } from '@/components/BroadcastRefreshSettings';

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
    <div className="editor-shell-loading h-full w-full bg-slate-50 p-3 sm:p-4">
      <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
        <div className="rounded-xl border border-slate-200 bg-white" />
        <div className="hidden rounded-xl border border-slate-200 bg-white lg:block" />
      </div>
    </div>
  );
}

function EditorHeaderSkeleton() {
  return (
    <header className="editor-shell-header border-b border-cyan-500/25 bg-slate-950/95 px-2 py-0.5 shadow-[0_3px_10px_rgba(6,182,212,0.12)] backdrop-blur sm:px-2">
      <div className="flex items-start justify-between gap-1 sm:items-center">
        <div className="min-w-0 space-y-1">
          <div className="h-4 w-44 rounded bg-cyan-200/30" />
          <div className="hidden h-3 w-56 rounded bg-cyan-200/20 sm:block" />
        </div>
        <div className="h-6 w-20 rounded bg-cyan-200/20" />
      </div>
    </header>
  );
}

function EditorShell({ mapId, title, userId, displayName, showMobileToolsPanel, canEdit, onEditAccessChange, onSelectNode }: {
  mapId: string;
  title: string;
  userId: string;
  displayName: string;
  showMobileToolsPanel: boolean;
  canEdit: boolean;
  onEditAccessChange: (nextCanEdit: boolean) => void;
  onSelectNode: (nodeId: string | null) => void;
}) {
  return (
    <RealtimeProvider mapId={mapId} userId={userId} displayName={displayName} mode={canEdit ? 'edit' : 'view'}>
      <header className="editor-shell-header border-b border-cyan-500/25 bg-slate-950/95 px-2 py-0.5 shadow-[0_3px_10px_rgba(6,182,212,0.12)] backdrop-blur sm:px-2">
        <div className="flex items-start justify-between gap-1 sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-1.5 leading-tight">
            <BroadcastRefreshSettings canEdit={canEdit} onEditAccessChange={onEditAccessChange} />
            <div className="min-w-0">
              <h1 className="text-[11px] font-semibold tracking-wide text-cyan-100 break-words sm:truncate sm:text-[13px]">{title}</h1>
              <p className="hidden text-[8px] uppercase tracking-[0.08em] text-cyan-300/65 sm:block">Collaborative concept workspace</p>
            </div>
          </div>
          <div className="ml-1 flex shrink-0 flex-col items-end gap-0.5 sm:ml-0 sm:flex-row sm:items-center sm:gap-1">
            <div className="shrink-0 rounded border border-cyan-300/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-100 sm:text-[10px]">
              {canEdit ? 'Edit' : 'View'} #{mapId}
            </div>
            <PresenceBar compact showBorder={false} className="rounded border border-cyan-300/20 bg-slate-900/75" />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <FlowWorkspace
            isReadOnly={!canEdit}
            showDesktopControlsPanel={canEdit}
            showDesktopStatusPanel
            showMobileToolsPanel={canEdit && showMobileToolsPanel}
            onSelectNode={onSelectNode}
            snapEnabled
            inviteRequestToken={0}
          />
        </div>
      </div>
    </RealtimeProvider>
  );
}

function EditorContent() {
  const params = useParams();
  const mapId = params.mapId as string;
  const [title, setTitle] = useState('Untitled Map');
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState('');
  const [showMobileToolsPanel, setShowMobileToolsPanel] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('collabDisplayName');
    if (savedName && savedName.trim()) {
      setDisplayName(savedName.trim());
      setDraftDisplayName(savedName.trim());
      setShowNameModal(false);
      return;
    }

    const generated = `User-${Math.floor(Math.random() * 9000) + 1000}`;
    setDisplayName(generated);
    setDraftDisplayName(generated);
    setShowNameModal(true);
  }, []);

  useEffect(() => {
    const savedAccessCode = localStorage.getItem('workspaceEditAccessCode');
    setCanEdit(savedAccessCode === 'IzinEditKhususGG123');

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

  const handleEditAccessChange = useCallback((nextCanEdit: boolean) => {
    setCanEdit(nextCanEdit);
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

  const handleSubmitName = useCallback(() => {
    const normalized = draftDisplayName.trim() || `User-${Math.floor(Math.random() * 9000) + 1000}`;
    setDisplayName(normalized);
    localStorage.setItem('collabDisplayName', normalized);
    setShowNameModal(false);
  }, [draftDisplayName]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {loading || !displayName ? (
        <>
          <EditorHeaderSkeleton />
          <EditorWorkspaceSkeleton />
        </>
      ) : (
        <EditorShell
          mapId={mapId}
          title={title}
          userId={userId}
          displayName={displayName}
          showMobileToolsPanel={showMobileToolsPanel}
          canEdit={canEdit}
          onEditAccessChange={handleEditAccessChange}
          onSelectNode={handleNodeSelection}
        />
      )}

      {showNameModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-cyan-300/30 bg-slate-950 p-5 text-cyan-100 shadow-2xl">
            <h2 className="text-lg font-semibold">Masukkan nama kolaborator</h2>
            <p className="mt-1 text-sm text-cyan-200/80">Nama ini akan ditampilkan ke user lain saat live collaboration.</p>
            <input
              type="text"
              value={draftDisplayName}
              onChange={(event) => setDraftDisplayName(event.target.value)}
              className="mt-4 w-full rounded-md border border-cyan-300/40 bg-slate-900 px-3 py-2 text-sm text-cyan-50 outline-none focus:border-cyan-200"
              placeholder="Contoh: Budi"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmitName();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSubmitName}
              className="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Lanjut ke Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return <EditorContent />;
}
