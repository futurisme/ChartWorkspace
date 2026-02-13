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
  isConnectArmed: boolean;
  isUnconnectArmed: boolean;
  onAddNode: () => void;
  onRename: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onConnectStart: () => void;
  onUnconnectStart: () => void;
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
      ? 'border-cyan-300 bg-cyan-600 text-white hover:bg-cyan-500'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-500 text-slate-950 hover:bg-amber-400'
        : tone === 'danger'
          ? 'border-red-300 bg-red-600 text-white hover:bg-red-500'
          : tone === 'info'
            ? 'border-violet-300 bg-violet-600 text-white hover:bg-violet-500'
            : tone === 'success'
              ? 'border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-500'
              : 'border-slate-300 bg-slate-600 text-white hover:bg-slate-500';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors ${toneClass} disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500`}
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
  isConnectArmed,
  isUnconnectArmed,
  onAddNode,
  onRename,
  onDelete,
  onUndo,
  onRedo,
  onConnectStart,
  onUnconnectStart,
}: FlowToolbarDesktopProps) {
  return (
    <>
      {showControlsPanel && (
        <div className="pointer-events-none absolute left-2 top-2 z-30 hidden w-[196px] lg:block">
          <div className="pointer-events-auto rounded-lg border border-cyan-500/25 bg-slate-950/82 p-1.5 shadow-[0_10px_26px_rgba(34,211,238,0.12)] backdrop-blur">
            <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-100">Tools</h2>
            <div className="grid grid-cols-2 gap-1">
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
                tone={isUnconnectArmed ? 'warning' : 'warning'}
              />
              <ActionButton label="Rename" onClick={onRename} disabled={!selectedNodeId} tone="info" />
              <ActionButton label="Undo" onClick={onUndo} disabled={!canUndo} tone="warning" />
              <ActionButton label="Redo" onClick={onRedo} disabled={!canRedo} tone="warning" />
              <ActionButton label="Delete" onClick={onDelete} disabled={!selectedNodeId} tone="danger" />
            </div>
          </div>
        </div>
      )}

      {showStatusPanel && (
        <div className="pointer-events-none absolute right-2 top-2 z-30 hidden w-[196px] lg:block">
          <div className="pointer-events-auto rounded-lg border border-cyan-500/25 bg-slate-950/82 p-1.5 shadow-[0_10px_26px_rgba(34,211,238,0.12)] backdrop-blur">
            <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-100">Status</h2>
            <div className="space-y-1">
              <StatusItem label="Selection" value={selectedNodeId ? selectedNodeLabel ?? selectedNodeId : 'None'} />
              <StatusItem label="Parent" value={selectedParentId ?? '-'} />
              <StatusItem label="Children" value={selectedNodeId ? selectedChildCount : 0} />
              <StatusItem label="Position" value={selectedPosition ? `${selectedPosition.x}, ${selectedPosition.y}` : '-'} />
              <StatusItem label="Connect" value={isConnectArmed ? 'Select target node' : 'Idle'} />
              <StatusItem label="Unconnect" value={isUnconnectArmed ? 'Select target node' : 'Idle'} />
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
