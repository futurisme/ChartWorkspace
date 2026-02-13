interface FlowToolbarMobileProps {
  isOpen: boolean;
  selectedNodeId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  snapEnabled: boolean;
  isConnected: boolean;
  remoteUsersCount: number;
  onAddNode: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onAddParent: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRename: () => void;
  onDelete: () => void;
  onToggleSnap: () => void;
  onInvite: () => void;
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
      ? 'border-cyan-300 bg-cyan-600 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.3)] hover:bg-cyan-500 active:bg-cyan-700'
      : tone === 'success'
        ? 'border-emerald-300 bg-emerald-600 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.3)] hover:bg-emerald-500 active:bg-emerald-700'
        : tone === 'warning'
          ? 'border-amber-300 bg-amber-500 text-slate-950 shadow-[0_0_0_1px_rgba(245,158,11,0.3)] hover:bg-amber-400 active:bg-amber-600'
          : tone === 'danger'
            ? 'border-red-300 bg-red-600 text-white shadow-[0_0_0_1px_rgba(239,68,68,0.35)] hover:bg-red-500 active:bg-red-700'
            : tone === 'info'
              ? 'border-violet-300 bg-violet-600 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.3)] hover:bg-violet-500 active:bg-violet-700'
              : 'border-slate-300 bg-slate-600 text-white shadow-[0_0_0_1px_rgba(148,163,184,0.2)] hover:bg-slate-500 active:bg-slate-700';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${full ? 'col-span-2' : ''} rounded-md border px-1.5 py-1 text-[10px] font-semibold tracking-wide transition-colors ${toneClass} disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none`}
    >
      {label}
    </button>
  );
}

export function FlowToolbarMobile({
  isOpen,
  selectedNodeId,
  canUndo,
  canRedo,
  snapEnabled,
  isConnected,
  remoteUsersCount,
  onAddNode,
  onAddChild,
  onAddSibling,
  onAddParent,
  onUndo,
  onRedo,
  onRename,
  onDelete,
  onToggleSnap,
  onInvite,
}: FlowToolbarMobileProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-400/20 bg-slate-950/88 p-1.5 pb-[max(env(safe-area-inset-bottom),0.35rem)] shadow-[0_-8px_30px_rgba(34,211,238,0.14)] backdrop-blur lg:hidden">
      <div className="mb-1.5 flex items-center justify-between rounded-md border border-cyan-500/20 bg-slate-900/70 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-100/90">
        <span>{isConnected ? 'Online Sync' : 'Offline Mode'}</span>
        <span>{remoteUsersCount + 1} Active</span>
      </div>

      <div className="grid grid-cols-4 gap-1">
        <ActionButton label="Add" onClick={onAddNode} tone="brand" />
        <ActionButton label="Child" onClick={onAddChild} disabled={!selectedNodeId} tone="success" />
        <ActionButton label="Sibling" onClick={onAddSibling} disabled={!selectedNodeId} tone="success" />
        <ActionButton label="Parent" onClick={onAddParent} disabled={!selectedNodeId} tone="success" />

        <ActionButton label="Undo" onClick={onUndo} disabled={!canUndo} tone="warning" />
        <ActionButton label="Redo" onClick={onRedo} disabled={!canRedo} tone="warning" />
        <ActionButton label="Rename" onClick={onRename} disabled={!selectedNodeId} tone="info" />
        <ActionButton label="Delete" onClick={onDelete} disabled={!selectedNodeId} tone="danger" />

        <ActionButton label={`Snap ${snapEnabled ? 'ON' : 'OFF'}`} onClick={onToggleSnap} tone="neutral" full />
        <ActionButton label="Invite" onClick={onInvite} tone="brand" full />
      </div>
    </div>
  );
}
