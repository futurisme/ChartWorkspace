interface FlowToolbarMobileProps {
  isOpen: boolean;
  selectedNodeId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  isConnected: boolean;
  remoteUsersCount: number;
  isConnectArmed: boolean;
  isUnconnectArmed: boolean;
  onAddNode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRename: () => void;
  onDelete: () => void;
  onConnectStart: () => void;
  onUnconnectStart: () => void;
  onExportWorkspace: () => void;
  onImportWorkspace: () => void;
}

function ActionButton({
  label,
  onClick,
  disabled,
  tone = 'neutral',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'brand' | 'warning' | 'danger' | 'info' | 'success';
}) {
  const toneClass =
    tone === 'brand'
      ? 'border-cyan-300 bg-cyan-600 text-white'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-500 text-slate-950'
        : tone === 'danger'
          ? 'border-red-300 bg-red-600 text-white'
          : tone === 'info'
            ? 'border-violet-300 bg-violet-600 text-white'
            : tone === 'success'
              ? 'border-emerald-300 bg-emerald-600 text-white'
              : 'border-slate-300 bg-slate-600 text-white';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold tracking-wide transition-colors ${toneClass} disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500`}
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
  isConnected,
  remoteUsersCount,
  isConnectArmed,
  isUnconnectArmed,
  onAddNode,
  onUndo,
  onRedo,
  onRename,
  onDelete,
  onConnectStart,
  onUnconnectStart,
  onExportWorkspace,
  onImportWorkspace,
}: FlowToolbarMobileProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-400/20 bg-slate-950/90 p-1 pb-[max(env(safe-area-inset-bottom),0.35rem)] shadow-[0_-8px_24px_rgba(34,211,238,0.12)] backdrop-blur lg:hidden">
      <div className="mb-1 flex items-center justify-between rounded-md border border-cyan-500/20 bg-slate-900/70 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-100/90">
        <span>{isConnected ? 'Online' : 'Offline'}</span>
        <span>
          {isConnectArmed
            ? 'Select connect target'
            : isUnconnectArmed
              ? 'Select unconnect target'
              : `${remoteUsersCount + 1} Active`}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1">
        <ActionButton label="Add" onClick={onAddNode} tone="brand" />
        <ActionButton
          label={isConnectArmed ? 'Connecting…' : 'Connect'}
          onClick={onConnectStart}
          disabled={!selectedNodeId}
          tone={isConnectArmed ? 'success' : 'info'}
        />
        <ActionButton
          label={isUnconnectArmed ? 'Unconnecting…' : 'Unconnect'}
          onClick={onUnconnectStart}
          disabled={!selectedNodeId}
          tone="warning"
        />
        <ActionButton label="Rename" onClick={onRename} disabled={!selectedNodeId} tone="info" />
        <ActionButton label="Undo" onClick={onUndo} disabled={!canUndo} tone="warning" />
        <ActionButton label="Redo" onClick={onRedo} disabled={!canRedo} tone="warning" />
        <ActionButton label="Export" onClick={onExportWorkspace} tone="success" />
        <ActionButton label="Import" onClick={onImportWorkspace} tone="info" />
        <ActionButton label="Delete" onClick={onDelete} disabled={!selectedNodeId} tone="danger" />
      </div>
    </div>
  );
}
