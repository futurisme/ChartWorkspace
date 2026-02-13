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
      className="flex w-full items-center justify-between rounded-md border border-cyan-500/20 bg-slate-900/70 px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.11em] text-cyan-100/90"
    >
      <span>{title}</span>
      <span className="text-cyan-200/70">{open ? '-' : '+'}</span>
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  tone = 'neutral',
  full = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  full?: boolean;
}) {
  const toneClass =
    tone === 'brand'
      ? 'border-cyan-300/55 bg-cyan-500/22 text-cyan-50 hover:bg-cyan-500/32 active:bg-cyan-500/38'
      : tone === 'success'
        ? 'border-emerald-300/60 bg-emerald-500/24 text-emerald-50 hover:bg-emerald-500/34 active:bg-emerald-500/40'
        : tone === 'warning'
          ? 'border-amber-300/65 bg-amber-500/28 text-amber-50 hover:bg-amber-500/38 active:bg-amber-500/46'
          : tone === 'danger'
            ? 'border-red-300/75 bg-red-600/40 text-red-50 hover:bg-red-600/52 active:bg-red-600/60'
            : tone === 'info'
              ? 'border-violet-300/60 bg-violet-500/24 text-violet-50 hover:bg-violet-500/34 active:bg-violet-500/40'
              : 'border-slate-300/35 bg-slate-800/82 text-slate-100 hover:bg-slate-700/90 active:bg-slate-700';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${full ? 'col-span-2' : ''} rounded-md border px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors ${toneClass} disabled:border-slate-700/60 disabled:bg-slate-900/50 disabled:text-slate-500 disabled:opacity-100`}
    >
      {label}
    </button>
  );
}

function StatusItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-cyan-500/15 bg-slate-900/65 px-1.5 py-1 text-[10px] text-slate-200">
      <span className="mr-1 text-cyan-200/75">{label}:</span>
      <span className="font-semibold text-slate-50">{value}</span>
    </div>
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
        <div className="pointer-events-none absolute left-3 top-2.5 z-30 hidden w-[214px] lg:block xl:w-[228px]">
          <div className="pointer-events-auto max-h-[calc(100vh-0.75rem)] overflow-y-auto rounded-lg border border-cyan-500/25 bg-slate-950/82 p-1.5 shadow-[0_12px_30px_rgba(34,211,238,0.13)] backdrop-blur">
            <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-100">Workspace Controls</h2>

            <div className="space-y-1">
              <div className="space-y-1">
                <SectionHeader title="Node" open={nodeSectionOpen} onToggle={() => setNodeSectionOpen((prev) => !prev)} />
                {nodeSectionOpen && (
                  <div className="grid grid-cols-2 gap-1">
                    <ActionButton label="Add Node" onClick={onAddNode} tone="brand" />
                    <ActionButton label="Rename" onClick={onRename} disabled={!selectedNodeId} tone="info" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <SectionHeader title="Structure" open={structureSectionOpen} onToggle={() => setStructureSectionOpen((prev) => !prev)} />
                {structureSectionOpen && (
                  <div className="grid grid-cols-2 gap-1">
                    <ActionButton label="Child" onClick={onAddChild} disabled={!selectedNodeId} tone="success" />
                    <ActionButton label="Sibling" onClick={onAddSibling} disabled={!selectedNodeId} tone="success" />
                    <ActionButton label="Parent" onClick={onAddParent} disabled={!selectedNodeId} tone="success" full />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <SectionHeader title="Edit" open={editSectionOpen} onToggle={() => setEditSectionOpen((prev) => !prev)} />
                {editSectionOpen && (
                  <div className="grid grid-cols-2 gap-1">
                    <ActionButton label="Undo" onClick={onUndo} disabled={!canUndo} tone="warning" />
                    <ActionButton label="Redo" onClick={onRedo} disabled={!canRedo} tone="warning" />
                    <ActionButton label="Delete" onClick={onDelete} disabled={!selectedNodeId} tone="danger" full />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <SectionHeader title="View" open={viewSectionOpen} onToggle={() => setViewSectionOpen((prev) => !prev)} />
                {viewSectionOpen && (
                  <div className="grid grid-cols-2 gap-1">
                    <ActionButton label={`Snap ${snapEnabled ? 'ON' : 'OFF'}`} onClick={onToggleSnap} tone="neutral" />
                    <ActionButton label="Invite" onClick={onInvite} tone="brand" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showStatusPanel && (
        <div className="pointer-events-none absolute right-3 top-2.5 z-30 hidden w-[214px] lg:block xl:w-[228px]">
          <div className="pointer-events-auto max-h-[calc(100vh-0.75rem)] overflow-y-auto rounded-lg border border-cyan-500/25 bg-slate-950/82 p-1.5 shadow-[0_12px_30px_rgba(34,211,238,0.13)] backdrop-blur">
            <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-100">Status</h2>
            <div className="space-y-1.5">
              <StatusItem label="Selection" value={selectedNodeId ? selectedNodeLabel ?? selectedNodeId : 'None'} />
              <StatusItem label="Parent" value={selectedParentId ?? '-'} />
              <StatusItem label="Children" value={selectedNodeId ? selectedChildCount : 0} />
              <StatusItem
                label="Position"
                value={selectedPosition ? `${selectedPosition.x}, ${selectedPosition.y}` : '-'}
              />
              <StatusItem label="Snap" value={snapEnabled ? 'ON' : 'OFF'} />
              <StatusItem label="Connection" value={isConnected ? 'Online' : 'Offline'} />
              <StatusItem label="Collaborators" value={remoteUsersCount + 1} />
              <StatusItem label="Save warnings" value={saveErrorCount} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
