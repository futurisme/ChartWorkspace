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
  tone?: 'neutral' | 'brand' | 'danger';
  full?: boolean;
}) {
  const toneClass =
    tone === 'brand'
      ? 'border-cyan-300/45 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25'
      : tone === 'danger'
        ? 'border-rose-300/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25'
        : 'border-cyan-500/25 bg-slate-900/75 text-slate-100 hover:bg-slate-800/80';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${full ? 'col-span-2' : ''} rounded-md border px-2 py-1.5 text-[11px] font-semibold tracking-wide transition ${toneClass} disabled:opacity-35`}
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
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-400/20 bg-slate-950/88 p-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] shadow-[0_-8px_30px_rgba(34,211,238,0.14)] backdrop-blur lg:hidden">
      <div className="mb-2 flex items-center justify-between rounded-md border border-cyan-500/20 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100/90">
        <span>{isConnected ? 'Online Sync' : 'Offline Mode'}</span>
        <span>{remoteUsersCount + 1} Active</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <ActionButton label="Add" onClick={onAddNode} tone="brand" />
        <ActionButton label="Child" onClick={onAddChild} disabled={!selectedNodeId} />
        <ActionButton label="Sibling" onClick={onAddSibling} disabled={!selectedNodeId} />
        <ActionButton label="Parent" onClick={onAddParent} disabled={!selectedNodeId} />

        <ActionButton label="Undo" onClick={onUndo} disabled={!canUndo} />
        <ActionButton label="Redo" onClick={onRedo} disabled={!canRedo} />
        <ActionButton label="Rename" onClick={onRename} disabled={!selectedNodeId} />
        <ActionButton label="Delete" onClick={onDelete} disabled={!selectedNodeId} tone="danger" />

        <ActionButton label={`Snap ${snapEnabled ? 'ON' : 'OFF'}`} onClick={onToggleSnap} full />
        <ActionButton label="Invite" onClick={onInvite} full />
      </div>
    </div>
  );
}
