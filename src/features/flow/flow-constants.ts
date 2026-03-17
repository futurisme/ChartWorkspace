import type { CSSProperties } from 'react';

export const EDGE_STYLE: CSSProperties = { stroke: '#0f172a', strokeWidth: 2 };

export const DEFAULT_NODE_SIZE = { width: 172, height: 15 };

export const GRID_SIZE = 8;
export const ROUTE_GRID_SIZE = 8;
export const ROUTE_ALIGN_TOLERANCE = 10;
export const ROUTE_ROW_TOLERANCE = 18;
export const ROUTE_COLUMN_TOLERANCE = 18;
export const ROUTE_SIDE_BY_SIDE_TOLERANCE = 4;
export const ROUTE_LANE_GAP = 18;
export const ROUTE_BUS_PADDING = 28;

export const NODE_GAP = GRID_SIZE;
export const AUTO_GAP = 24;
export const AUTO_SHIFT = GRID_SIZE;
export const AUTO_MAX_TRIES = 20;

export const WORKSPACE_PADDING = 320;
export const MIN_WORKSPACE_SIZE = { width: 1200, height: 800 };
export const UNBOUNDED_TRANSLATE_EXTENT: [[number, number], [number, number]] = [
  [-1_000_000, -1_000_000],
  [1_000_000, 1_000_000],
];

export const COLOR_OPTIONS = [
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#6366f1',
  '#14b8a6',
  '#06b6d4',
  '#10b981',
  '#84cc16',
  '#f59e0b',
  '#fb7185',
  '#f43f5e',
  '#8b5cf6',
  '#3b82f6',
  '#64748b',
];
