import { createContext, memo, useContext } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import type { ConceptNodeData, NodeActionContextValue } from './flow-types';

export const NodeActionContext = createContext<NodeActionContextValue>({
  onChangeColor: () => {},
  isReadOnly: false,
});

function isLightColor(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

function FlowNodeCardComponent({ data, selected }: NodeProps<ConceptNodeData>) {
  const { isReadOnly } = useContext(NodeActionContext);
  const baseColor = data.color ?? '#3b82f6';
  const lightBackground = isLightColor(baseColor);
  const collaboratorNames = data.collaboratorNames ?? [];
  const editedByOthers = Boolean(data.editedByOthers && collaboratorNames.length > 0);

  return (
    <div className="relative flow-node-drag-hitbox">
      <div className="absolute inset-0 z-30 rounded-lg" aria-hidden="true" />

      <div
        className={`relative z-20 max-w-xs cursor-grab touch-none select-none rounded-lg border-2 px-3 py-2 shadow-lg active:cursor-grabbing ${
          selected
            ? 'ring-2 ring-lime-400/80 shadow-[0_0_14px_rgba(132,204,22,0.55)]'
            : editedByOthers
              ? 'ring-2 ring-amber-300/80 shadow-[0_0_12px_rgba(252,211,77,0.45)]'
              : ''
        }`}
        style={{
          borderColor: selected ? '#84cc16' : baseColor,
          backgroundColor: baseColor,
          color: lightBackground ? '#0f172a' : '#f8fafc',
        }}
      >
        {editedByOthers && !selected && (
          <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-900">
            {`Sedang diedit: ${collaboratorNames.join(', ')}`}
          </div>
        )}
        {selected && !isReadOnly && (
          <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wide text-lime-500">
            Editing This
          </div>
        )}
        <Handle type="target" position={Position.Top} id="t-top" className="pointer-events-none opacity-0" />
        <Handle type="target" position={Position.Bottom} id="t-bottom" className="pointer-events-none opacity-0" />
        <Handle type="target" position={Position.Left} id="t-left" className="pointer-events-none opacity-0" />
        <Handle type="target" position={Position.Right} id="t-right" className="pointer-events-none opacity-0" />
        <Handle type="source" position={Position.Top} id="s-top" className="pointer-events-none opacity-0" />
        <Handle type="source" position={Position.Bottom} id="s-bottom" className="pointer-events-none opacity-0" />
        <Handle type="source" position={Position.Left} id="s-left" className="pointer-events-none opacity-0" />
        <Handle type="source" position={Position.Right} id="s-right" className="pointer-events-none opacity-0" />
        <div className="pointer-events-none break-words text-sm font-semibold sm:text-base">{data.label}</div>
      </div>
    </div>
  );
}

export const FlowNodeCard = memo(FlowNodeCardComponent);
