import { createContext, memo, useContext } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import type { ConceptNodeData, NodeActionContextValue } from './flow-types';

export const NodeActionContext = createContext<NodeActionContextValue>({
  onChangeColor: () => {},
  onToggleDescriptionPanel: (_nodeId: string) => {},
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

function getFirstHexFromGradient(value: string) {
  const match = value.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#3b82f6';
}

function isGradientColor(value: string) {
  return value.includes('gradient(');
}

function normalizeNodeVariant(variant: ConceptNodeData['variant']) {
  return variant === 'descript' ? 'descript' : 'default';
}

function FlowNodeCardComponent({ id, data, selected }: NodeProps<ConceptNodeData>) {
  const { isReadOnly, onToggleDescriptionPanel } = useContext(NodeActionContext);
  const variant = normalizeNodeVariant(data.variant);
  const description = data.description?.trim() ?? '';
  const hasDescriptionPanel = variant === 'descript' && description.length > 0;
  const isExpanded = Boolean(data.descriptionExpanded && hasDescriptionPanel);
  const colorValue = data.color ?? '#3b82f6';
  const gradientEnabled = isGradientColor(colorValue);
  const baseColor = gradientEnabled ? getFirstHexFromGradient(colorValue) : colorValue;
  const lightBackground = isLightColor(baseColor);
  const collaboratorNames = data.collaboratorNames ?? [];
  const editedByOthers = Boolean(data.editedByOthers && collaboratorNames.length > 0);

  const toggleDescriptionPanel = () => {
    if (!hasDescriptionPanel || isReadOnly) {
      return;
    }

    onToggleDescriptionPanel(id);
  };

  return (
    <div className="relative nopan inline-flex flex-col items-start">
      <div className="relative flex w-auto items-start gap-1">
        <div className="pointer-events-none absolute inset-0 z-30 rounded-lg" aria-hidden="true" />

        <div
          className={`flow-node-drag-handle relative z-20 flex min-h-[15px] w-fit max-w-[240px] items-center justify-center cursor-grab touch-none select-none rounded border px-1.5 py-0.5 shadow-sm active:cursor-grabbing sm:px-2 ${
            selected
              ? 'ring-2 ring-lime-400/80 shadow-[0_0_14px_rgba(132,204,22,0.55)]'
              : editedByOthers
                ? 'ring-2 ring-amber-300/80 shadow-[0_0_12px_rgba(252,211,77,0.45)]'
                : ''
          }`}
          style={{
            borderColor: selected ? '#84cc16' : baseColor,
            backgroundColor: baseColor,
            backgroundImage: gradientEnabled ? colorValue : undefined,
            color: lightBackground ? '#0f172a' : '#f8fafc',
          }}
          onClick={toggleDescriptionPanel}
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

          <div
            className="pointer-events-none whitespace-pre-wrap text-center text-[9px] font-semibold leading-[1.15] [overflow-wrap:anywhere] sm:text-[10px]"
            title={data.label}
          >
            {data.label}
          </div>
        </div>

        {hasDescriptionPanel && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleDescriptionPanel();
            }}
            className="nodrag relative z-50 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-slate-950 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50"
            aria-label={isExpanded ? 'Collapse description' : 'Expand description'}
          >
              <span className="flex flex-col gap-px" aria-hidden="true">
              <span className="h-0.5 w-2.5 rounded-full bg-slate-900" />
              <span className="h-0.5 w-2.5 rounded-full bg-slate-900" />
              <span className="h-0.5 w-2.5 rounded-full bg-slate-900" />
            </span>
          </button>
        )}
      </div>

      {hasDescriptionPanel && isExpanded && (
        <div className="mt-2 max-h-28 w-full overflow-y-auto rounded-md border border-slate-900 bg-white px-3 py-2 text-xs font-medium leading-relaxed text-slate-900 sm:max-h-40">
          {description}
        </div>
      )}
    </div>
  );
}

export const FlowNodeCard = memo(FlowNodeCardComponent);
