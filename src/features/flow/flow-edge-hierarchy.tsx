import { BaseEdge, getStraightPath, type EdgeProps } from 'reactflow';
import type { FlowRouteData, FlowRoutePoint } from './flow-types';

function pointsToPath(points: FlowRoutePoint[]) {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function isValidPoint(value: unknown): value is FlowRoutePoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const point = value as { x?: unknown; y?: unknown };
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function FlowEdgeHierarchy({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
}: EdgeProps<FlowRouteData>) {
  const points = Array.isArray(data?.points) ? data.points.filter(isValidPoint) : [];
  const path = points.length > 1 ? pointsToPath(points) : getStraightPath({ sourceX, sourceY, targetX, targetY })[0];
  const edgeStyle = {
    ...(style ?? {}),
    pointerEvents: 'none' as const,
  };

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={edgeStyle} interactionWidth={0} />;
}
