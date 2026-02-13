import { createContext, memo, useContext } from 'react';
import { Handle, NodeProps, NodeToolbar, Position } from 'reactflow';
import { COLOR_OPTIONS } from './flow-constants';
import type { ConceptNodeData, NodeActionContextValue } from './flow-types';

export const NodeActionContext = createContext<NodeActionContextValue>({
  onChangeColor: () => {},
  isReadOnly: false,
});

function FlowNodeCardComponent({ data, selected, id }: NodeProps<ConceptNodeData>) {
  const { onChangeColor, isReadOnly } = useContext(NodeActionContext);
  const baseBorder = data.color ?? '#3b82f6';
  const panelColor = data.color ? `${data.color}14` : undefined;

  return (
    <div className="relative">
      <NodeToolbar isVisible={selected && !isReadOnly} position={Position.Right} offset={8}>
        <div className="nodrag nopan flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-2 py-1 shadow-md">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              className={`h-6 w-6 rounded-full border ${
                data.color === color ? 'border-gray-900' : 'border-white/70'
              } shadow-sm`}
              style={{ backgroundColor: color }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onChangeColor(id, color);
              }}
              aria-label={`Set color ${color}`}
            />
          ))}
        </div>
      </NodeToolbar>

      <div
        className={`relative max-w-xs cursor-grab touch-none select-none rounded-lg border-2 bg-white px-3 py-2 shadow-lg active:cursor-grabbing before:absolute before:content-[''] before:rounded-[inherit] before:-inset-[var(--node-hit-inset)] ${
          selected
            ? 'border-lime-400 ring-2 ring-lime-400/80 shadow-[0_0_14px_rgba(132,204,22,0.55)]'
            : ''
        }`}
        style={{
          borderColor: selected ? undefined : baseBorder,
          backgroundColor: panelColor,
          ['--node-hit-inset' as string]: 'clamp(10px, calc(14px / var(--flow-zoom, 1)), 28px)',
        }}
      >
        {selected && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wide text-lime-500">
            Editing This
          </div>
        )}
        <Handle type="target" position={Position.Top} id="t-top" className="opacity-0" />
        <Handle type="target" position={Position.Bottom} id="t-bottom" className="opacity-0" />
        <Handle type="target" position={Position.Left} id="t-left" className="opacity-0" />
        <Handle type="target" position={Position.Right} id="t-right" className="opacity-0" />
        <Handle type="source" position={Position.Top} id="s-top" className="opacity-0" />
        <Handle type="source" position={Position.Bottom} id="s-bottom" className="opacity-0" />
        <Handle type="source" position={Position.Left} id="s-left" className="opacity-0" />
        <Handle type="source" position={Position.Right} id="s-right" className="opacity-0" />
        <div className="pointer-events-none break-words text-sm font-semibold text-gray-900 sm:text-base">
          {data.label}
        </div>
      </div>
    </div>
  );
}

export const FlowNodeCard = memo(FlowNodeCardComponent);
