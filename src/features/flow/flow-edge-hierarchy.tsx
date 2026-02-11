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
  const points = Array.isArray(data?.points) ? data.points : [];
  const path = points.length > 1 ? pointsToPath(points) : getStraightPath({ sourceX, sourceY, targetX, targetY })[0];

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}

