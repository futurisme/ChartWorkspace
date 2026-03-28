'use client';

import { Panel, Stack, StatusChip } from '@/lib/fadhilweblib';
import { Button } from '@/lib/fadhilweblib/client';

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
  onExportWorkspace: () => void;
  onImportWorkspace: () => void;
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
  onExportWorkspace,
  onImportWorkspace,
}: FlowToolbarDesktopProps) {
  return (
    <>
      {showControlsPanel && (
        <div className="pointer-events-none absolute left-2 top-2 z-30 hidden w-[196px] lg:block">
          <Panel density="compact" className="pointer-events-auto">
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-100">Tools</h2>
            <div className="grid grid-cols-2 gap-1">
              <Button tone="brand" size="xs" fullWidth onClick={onAddNode}>Add</Button>
              <Button
                tone={isConnectArmed ? 'success' : 'info'}
                size="xs"
                fullWidth
                onClick={onConnectStart}
                disabled={!selectedNodeId}
              >
                {isConnectArmed ? 'Connecting...' : 'Connect'}
              </Button>
              <Button
                tone="warning"
                size="xs"
                fullWidth
                onClick={onUnconnectStart}
                disabled={!selectedNodeId}
              >
                {isUnconnectArmed ? 'Unconnecting...' : 'Unconnect'}
              </Button>
              <Button tone="info" size="xs" fullWidth onClick={onRename} disabled={!selectedNodeId}>Rename</Button>
              <Button tone="warning" size="xs" fullWidth onClick={onUndo} disabled={!canUndo}>Undo</Button>
              <Button tone="warning" size="xs" fullWidth onClick={onRedo} disabled={!canRedo}>Redo</Button>
              <Button tone="success" size="xs" fullWidth onClick={onExportWorkspace}>Export</Button>
              <Button tone="info" size="xs" fullWidth onClick={onImportWorkspace}>Import</Button>
              <Button tone="danger" size="xs" fullWidth onClick={onDelete} disabled={!selectedNodeId}>Delete</Button>
            </div>
          </Panel>
        </div>
      )}

      {showStatusPanel && (
        <div className="pointer-events-none absolute right-2 top-2 z-30 hidden w-[196px] lg:block">
          <Panel density="compact" className="pointer-events-auto">
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-100">Status</h2>
            <Stack gap="xs">
              <StatusChip className="w-full justify-between rounded-md" label="Selection" value={selectedNodeId ? selectedNodeLabel ?? selectedNodeId : 'None'} />
              <StatusChip className="w-full justify-between rounded-md" label="Parent" value={selectedParentId ?? '-'} />
              <StatusChip className="w-full justify-between rounded-md" label="Children" value={selectedNodeId ? selectedChildCount : 0} />
              <StatusChip className="w-full justify-between rounded-md" label="Position" value={selectedPosition ? `${selectedPosition.x}, ${selectedPosition.y}` : '-'} />
              <StatusChip className="w-full justify-between rounded-md" label="Connect" value={isConnectArmed ? 'Select target node' : 'Idle'} tone={isConnectArmed ? 'success' : 'neutral'} />
              <StatusChip className="w-full justify-between rounded-md" label="Unconnect" value={isUnconnectArmed ? 'Select target node' : 'Idle'} tone={isUnconnectArmed ? 'warning' : 'neutral'} />
              <StatusChip className="w-full justify-between rounded-md" label="Snap" value={snapEnabled ? 'ON' : 'OFF'} tone={snapEnabled ? 'brand' : 'warning'} />
              <StatusChip className="w-full justify-between rounded-md" label="Connection" value={isConnected ? 'Online' : 'Offline'} tone={isConnected ? 'success' : 'danger'} />
              <StatusChip className="w-full justify-between rounded-md" label="Collaborators" value={remoteUsersCount + 1} tone="info" />
              <StatusChip className="w-full justify-between rounded-md" label="Save warnings" value={saveErrorCount} tone={saveErrorCount > 0 ? 'warning' : 'success'} />
            </Stack>
          </Panel>
        </div>
      )}
    </>
  );
}
