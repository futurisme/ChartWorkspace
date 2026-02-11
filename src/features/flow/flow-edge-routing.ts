import type { Edge, Node } from 'reactflow';
import { EDGE_STYLE, ROUTE_ALIGN_TOLERANCE, ROUTE_BUS_PADDING, ROUTE_GRID_SIZE, ROUTE_LANE_GAP } from './flow-constants';
import type { FlowRouteData, FlowRouteKind, FlowRoutePoint, RoutedHierarchyEdge } from './flow-types';
import { getNodeCenter, getNodeSize } from './flow-node-placement';

interface EdgeRoutingMeta {
  edge: Edge;
  kind: FlowRouteKind;
  sign: 1 | -1;
  sourceAnchor: FlowRoutePoint;
  targetAnchor: FlowRoutePoint;
}

function snapToRouteGrid(value: number) {
  return Math.round(value / ROUTE_GRID_SIZE) * ROUTE_GRID_SIZE;
}

function buildPath(points: FlowRoutePoint[]) {
  const normalized: FlowRoutePoint[] = [];

  points.forEach((point) => {
    const snapped = { x: snapToRouteGrid(point.x), y: snapToRouteGrid(point.y) };
    const prev = normalized[normalized.length - 1];
    if (!prev || prev.x !== snapped.x || prev.y !== snapped.y) {
      normalized.push(snapped);
    }
  });

  return normalized;
}

function getVerticalAnchors(source: Node, target: Node, sign: 1 | -1) {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const sourceSize = getNodeSize(source);
  const targetSize = getNodeSize(target);

  if (sign >= 0) {
    return {
      sourceAnchor: { x: sourceCenter.x, y: sourceCenter.y + sourceSize.height / 2 },
      targetAnchor: { x: targetCenter.x, y: targetCenter.y - targetSize.height / 2 },
      sourceHandle: 's-bottom',
      targetHandle: 't-top',
    };
  }

  return {
    sourceAnchor: { x: sourceCenter.x, y: sourceCenter.y - sourceSize.height / 2 },
    targetAnchor: { x: targetCenter.x, y: targetCenter.y + targetSize.height / 2 },
    sourceHandle: 's-top',
    targetHandle: 't-bottom',
  };
}

function getHorizontalAnchors(source: Node, target: Node, sign: 1 | -1) {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const sourceSize = getNodeSize(source);
  const targetSize = getNodeSize(target);

  if (sign >= 0) {
    return {
      sourceAnchor: { x: sourceCenter.x + sourceSize.width / 2, y: sourceCenter.y },
      targetAnchor: { x: targetCenter.x - targetSize.width / 2, y: targetCenter.y },
      sourceHandle: 's-right',
      targetHandle: 't-left',
    };
  }

  return {
    sourceAnchor: { x: sourceCenter.x - sourceSize.width / 2, y: sourceCenter.y },
    targetAnchor: { x: targetCenter.x + targetSize.width / 2, y: targetCenter.y },
    sourceHandle: 's-left',
    targetHandle: 't-right',
  };
}

function edgeToBusRoute(
  source: Node,
  target: Node,
  laneIndex: number,
  sharedBusId: string,
  directionSign: 1 | -1
): { sourceHandle: string; targetHandle: string; data: FlowRouteData } {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const sourceSize = getNodeSize(source);
  const targetSize = getNodeSize(target);

  const isDownward = directionSign >= 0;
  const sourceAnchor = {
    x: sourceCenter.x,
    y: sourceCenter.y + (isDownward ? sourceSize.height / 2 : -sourceSize.height / 2),
  };
  const targetAnchor = {
    x: targetCenter.x,
    y: targetCenter.y + (isDownward ? -targetSize.height / 2 : targetSize.height / 2),
  };

  const span = Math.max(1, Math.abs(targetAnchor.y - sourceAnchor.y));
  const busDistance = Math.max(ROUTE_BUS_PADDING, span * 0.45);
  const busY = snapToRouteGrid(sourceAnchor.y + directionSign * busDistance);

  const points = buildPath([
    sourceAnchor,
    { x: sourceAnchor.x, y: busY },
    { x: targetAnchor.x, y: busY },
    targetAnchor,
  ]);

  return {
    sourceHandle: isDownward ? 's-bottom' : 's-top',
    targetHandle: isDownward ? 't-top' : 't-bottom',
    data: {
      kind: 'bus',
      points,
      laneIndex,
      sharedBusId,
    },
  };
}

function buildLaneOffsets(items: EdgeRoutingMeta[], axis: 'x' | 'y') {
  const sorted = [...items].sort((a, b) => {
    const aValue = axis === 'x' ? a.targetAnchor.x : a.targetAnchor.y;
    const bValue = axis === 'x' ? b.targetAnchor.x : b.targetAnchor.y;
    if (aValue === bValue) {
      return a.edge.id.localeCompare(b.edge.id);
    }
    return aValue - bValue;
  });

  const offsetMap = new Map<string, number>();
  sorted.forEach((item, index) => {
    const offset = (index - (sorted.length - 1) / 2) * ROUTE_LANE_GAP;
    offsetMap.set(item.edge.id, snapToRouteGrid(offset));
  });

  return offsetMap;
}

export function buildAdaptiveRoutedEdges(edges: Edge[], nodes: Node[]): RoutedHierarchyEdge[] {
  if (edges.length === 0) {
    return [];
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const outgoingMap = new Map<string, Edge[]>();
  edges.forEach((edge) => {
    const current = outgoingMap.get(edge.source);
    if (current) {
      current.push(edge);
    } else {
      outgoingMap.set(edge.source, [edge]);
    }
  });

  const busEdgeMap = new Map<string, { sourceHandle: string; targetHandle: string; data: FlowRouteData }>();

  outgoingMap.forEach((outgoing, sourceId) => {
    if (outgoing.length < 2) {
      return;
    }

    const sourceNode = nodeMap.get(sourceId);
    if (!sourceNode) {
      return;
    }

    const sourceCenter = getNodeCenter(sourceNode);

    const sortedTargets = outgoing
      .map((edge) => ({ edge, target: nodeMap.get(edge.target) }))
      .filter((item): item is { edge: Edge; target: Node } => Boolean(item.target))
      .sort((a, b) => {
        const centerA = getNodeCenter(a.target);
        const centerB = getNodeCenter(b.target);
        if (centerA.x === centerB.x) {
          return a.edge.id.localeCompare(b.edge.id);
        }
        return centerA.x - centerB.x;
      });

    if (sortedTargets.length < 2) {
      return;
    }

    const avgTargetY =
      sortedTargets.reduce((sum, item) => sum + getNodeCenter(item.target).y, 0) / sortedTargets.length;
    const directionSign = (avgTargetY >= sourceCenter.y ? 1 : -1) as 1 | -1;
    const sharedBusId = `${sourceId}:${directionSign > 0 ? 'down' : 'up'}:bus`;

    sortedTargets.forEach((item, index) => {
      busEdgeMap.set(item.edge.id, edgeToBusRoute(sourceNode, item.target, index, sharedBusId, directionSign));
    });
  });

  const linearMetas: EdgeRoutingMeta[] = [];

  edges.forEach((edge) => {
    if (busEdgeMap.has(edge.id)) {
      return;
    }

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) {
      return;
    }

    const sourceCenter = getNodeCenter(sourceNode);
    const targetCenter = getNodeCenter(targetNode);

    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      const sign = (dx >= 0 ? 1 : -1) as 1 | -1;
      const anchors = getHorizontalAnchors(sourceNode, targetNode, sign);
      linearMetas.push({
        edge,
        kind: 'horizontal',
        sign,
        sourceAnchor: anchors.sourceAnchor,
        targetAnchor: anchors.targetAnchor,
      });
      return;
    }

    const sign = (dy >= 0 ? 1 : -1) as 1 | -1;
    const anchors = getVerticalAnchors(sourceNode, targetNode, sign);
    linearMetas.push({
      edge,
      kind: 'vertical',
      sign,
      sourceAnchor: anchors.sourceAnchor,
      targetAnchor: anchors.targetAnchor,
    });
  });

  const grouped = new Map<string, EdgeRoutingMeta[]>();
  linearMetas.forEach((meta) => {
    const key = `${meta.edge.source}:${meta.kind}:${meta.sign}`;
    const list = grouped.get(key);
    if (list) {
      list.push(meta);
    } else {
      grouped.set(key, [meta]);
    }
  });

  const laneOffsets = new Map<string, number>();
  grouped.forEach((items, key) => {
    if (items.length === 1) {
      laneOffsets.set(items[0].edge.id, 0);
      return;
    }

    const axis = key.includes(':horizontal:') ? 'y' : 'x';
    const offsets = buildLaneOffsets(items, axis);
    offsets.forEach((offset, edgeId) => laneOffsets.set(edgeId, offset));
  });

  return edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      return {
        ...edge,
        type: 'hierarchy',
        style: EDGE_STYLE,
        data: {
          kind: 'vertical',
          points: [],
          laneIndex: 0,
        },
      } as RoutedHierarchyEdge;
    }

    const bus = busEdgeMap.get(edge.id);
    if (bus) {
      return {
        ...edge,
        type: 'hierarchy',
        style: EDGE_STYLE,
        sourceHandle: bus.sourceHandle,
        targetHandle: bus.targetHandle,
        data: bus.data,
      } as RoutedHierarchyEdge;
    }

    const sourceCenter = getNodeCenter(sourceNode);
    const targetCenter = getNodeCenter(targetNode);
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      const sign = (dx >= 0 ? 1 : -1) as 1 | -1;
      const anchors = getHorizontalAnchors(sourceNode, targetNode, sign);
      const laneOffset = laneOffsets.get(edge.id) ?? 0;
      const aligned = Math.abs(anchors.sourceAnchor.y - anchors.targetAnchor.y) <= ROUTE_ALIGN_TOLERANCE;

      const points = aligned
        ? buildPath([anchors.sourceAnchor, anchors.targetAnchor])
        : buildPath([
            anchors.sourceAnchor,
            {
              x: snapToRouteGrid((anchors.sourceAnchor.x + anchors.targetAnchor.x) / 2 + laneOffset),
              y: anchors.sourceAnchor.y,
            },
            {
              x: snapToRouteGrid((anchors.sourceAnchor.x + anchors.targetAnchor.x) / 2 + laneOffset),
              y: anchors.targetAnchor.y,
            },
            anchors.targetAnchor,
          ]);

      return {
        ...edge,
        type: 'hierarchy',
        style: EDGE_STYLE,
        sourceHandle: anchors.sourceHandle,
        targetHandle: anchors.targetHandle,
        data: {
          kind: 'horizontal',
          points,
          laneIndex: laneOffset,
        },
      } as RoutedHierarchyEdge;
    }

    const sign = (dy >= 0 ? 1 : -1) as 1 | -1;
    const anchors = getVerticalAnchors(sourceNode, targetNode, sign);
    const laneOffset = laneOffsets.get(edge.id) ?? 0;
    const aligned = Math.abs(anchors.sourceAnchor.x - anchors.targetAnchor.x) <= ROUTE_ALIGN_TOLERANCE;

    const points = aligned
      ? buildPath([anchors.sourceAnchor, anchors.targetAnchor])
      : buildPath([
          anchors.sourceAnchor,
          {
            x: anchors.sourceAnchor.x,
            y: snapToRouteGrid((anchors.sourceAnchor.y + anchors.targetAnchor.y) / 2 + laneOffset),
          },
          {
            x: anchors.targetAnchor.x,
            y: snapToRouteGrid((anchors.sourceAnchor.y + anchors.targetAnchor.y) / 2 + laneOffset),
          },
          anchors.targetAnchor,
        ]);

    return {
      ...edge,
      type: 'hierarchy',
      style: EDGE_STYLE,
      sourceHandle: anchors.sourceHandle,
      targetHandle: anchors.targetHandle,
      data: {
        kind: 'vertical',
        points,
        laneIndex: laneOffset,
      },
    } as RoutedHierarchyEdge;
  });
}
