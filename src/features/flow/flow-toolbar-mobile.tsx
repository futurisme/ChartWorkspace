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
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur lg:hidden">
      <div className="mb-2 px-1 text-xs font-semibold text-slate-700">
        {isConnected ? 'Online' : 'Offline'} · {remoteUsersCount + 1} online
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button onClick={onAddNode} className="rounded-full bg-blue-600 px-2 py-2 text-xs font-semibold text-white">Add</button>
        <button
          onClick={onAddChild}
          disabled={!selectedNodeId}
          className="rounded-full bg-indigo-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Child
        </button>
        <button
          onClick={onAddSibling}
          disabled={!selectedNodeId}
          className="rounded-full bg-indigo-500 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Sibling
        </button>
        <button
          onClick={onAddParent}
          disabled={!selectedNodeId}
          className="rounded-full bg-indigo-400 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Parent
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-full border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-full border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          Redo
        </button>
        <button
          onClick={onRename}
          disabled={!selectedNodeId}
          className="rounded-full bg-amber-500 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Rename
        </button>
        <button
          onClick={onDelete}
          disabled={!selectedNodeId}
          className="rounded-full bg-red-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Delete
        </button>
        <button
          onClick={onToggleSnap}
          className="col-span-2 rounded-full border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700"
        >
          Snap: {snapEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={onInvite}
          className="col-span-2 rounded-full border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700"
        >
          Invite
        </button>
      </div>
    </div>
  );
}
