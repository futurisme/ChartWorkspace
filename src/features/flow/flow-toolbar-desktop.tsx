import { useState } from 'react';

interface FlowToolbarDesktopProps {
  showControlsPanel: boolean;
  showStatusPanel: boolean;
  selectedNodeId: string | null;
  selectedNodeLabel: string | null;
  selectedParentId: string | null;
  selectedChildCount: number;
  selectedPosition: { x: number; y: number } | null;
  canUndo: boolean;
  canRedo: boolean;
  snapEnabled: boolean;
  remoteUsersCount: number;
  isConnected: boolean;
  saveErrorCount: number;
  onAddNode: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onAddParent: () => void;
  onRename: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onInvite: () => void;
  onToggleSnap: () => void;
}

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700"
    >
      <span>{title}</span>
      <span>{open ? 'Hide' : 'Show'}</span>
    </button>
  );
}

export function FlowToolbarDesktop({
  showControlsPanel,
  showStatusPanel,
  selectedNodeId,
  selectedNodeLabel,
  selectedParentId,
  selectedChildCount,
  selectedPosition,
  canUndo,
  canRedo,
  snapEnabled,
  remoteUsersCount,
  isConnected,
  saveErrorCount,
  onAddNode,
  onAddChild,
  onAddSibling,
  onAddParent,
  onRename,
  onDelete,
  onUndo,
  onRedo,
  onInvite,
  onToggleSnap,
}: FlowToolbarDesktopProps) {
  const [nodeSectionOpen, setNodeSectionOpen] = useState(true);
  const [structureSectionOpen, setStructureSectionOpen] = useState(true);
  const [editSectionOpen, setEditSectionOpen] = useState(true);
  const [viewSectionOpen, setViewSectionOpen] = useState(true);

  return (
    <>
      {showControlsPanel && (
        <div className="pointer-events-none absolute left-4 top-3 z-30 hidden w-[252px] lg:block xl:w-[280px]">
          <div className="pointer-events-auto max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Workspace Controls</h2>

            <div className="space-y-3">
              <div className="space-y-2">
                <SectionHeader title="Node" open={nodeSectionOpen} onToggle={() => setNodeSectionOpen((prev) => !prev)} />
                {nodeSectionOpen && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onAddNode}
                      className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Add Node
                    </button>
                    <button
                      onClick={onRename}
                      disabled={!selectedNodeId}
                      className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Rename
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <SectionHeader
                  title="Structure"
                  open={structureSectionOpen}
                  onToggle={() => setStructureSectionOpen((prev) => !prev)}
                />
                {structureSectionOpen && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onAddChild}
                      disabled={!selectedNodeId}
                      className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Child
                    </button>
                    <button
                      onClick={onAddSibling}
                      disabled={!selectedNodeId}
                      className="rounded bg-indigo-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Sibling
                    </button>
                    <button
                      onClick={onAddParent}
                      disabled={!selectedNodeId}
                      className="col-span-2 rounded bg-indigo-400 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Parent
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <SectionHeader title="Edit" open={editSectionOpen} onToggle={() => setEditSectionOpen((prev) => !prev)} />
                {editSectionOpen && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onUndo}
                      disabled={!canUndo}
                      className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Undo
                    </button>
                    <button
                      onClick={onRedo}
                      disabled={!canRedo}
                      className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Redo
                    </button>
                    <button
                      onClick={onDelete}
                      disabled={!selectedNodeId}
                      className="col-span-2 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <SectionHeader title="View" open={viewSectionOpen} onToggle={() => setViewSectionOpen((prev) => !prev)} />
                {viewSectionOpen && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onToggleSnap}
                      className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Snap: {snapEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={onInvite}
                      className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Invite
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showStatusPanel && (
        <div className="pointer-events-none absolute right-4 top-3 z-30 hidden w-[252px] lg:block xl:w-[280px]">
          <div className="pointer-events-auto max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Status Panel</h2>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="rounded bg-slate-100 px-3 py-2">
                Selection: <span className="font-semibold">{selectedNodeId ? selectedNodeLabel ?? selectedNodeId : 'None'}</span>
              </div>
              <div className="rounded bg-slate-100 px-3 py-2">
                Parent: <span className="font-semibold">{selectedParentId ?? '-'}</span>
              </div>
              <div className="rounded bg-slate-100 px-3 py-2">
                Child count: <span className="font-semibold">{selectedNodeId ? selectedChildCount : 0}</span>
              </div>
              <div className="rounded bg-slate-100 px-3 py-2">
                Position: <span className="font-semibold">{selectedPosition ? `${selectedPosition.x}, ${selectedPosition.y}` : '-'}</span>
              </div>
              <div className="rounded bg-slate-100 px-3 py-2">
                Snap state: <span className="font-semibold">{snapEnabled ? 'ON' : 'OFF'}</span>
              </div>
              <div className="rounded bg-slate-100 px-3 py-2">
                Connection: <span className="font-semibold">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
              <div className="rounded bg-slate-100 px-3 py-2">
                Collaborators: <span className="font-semibold">{remoteUsersCount + 1}</span>
              </div>
              <div className="rounded bg-slate-100 px-3 py-2">
                Save warnings: <span className="font-semibold">{saveErrorCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
