import type { Edge, Node } from 'reactflow';
import {
  EDGE_STYLE,
  ROUTE_ALIGN_TOLERANCE,
  ROUTE_BUS_PADDING,
  ROUTE_COLUMN_TOLERANCE,
  ROUTE_GRID_SIZE,
  ROUTE_LANE_GAP,
  ROUTE_ROW_TOLERANCE,
  ROUTE_SIDE_BY_SIDE_TOLERANCE,
} from './flow-constants';
import type {
  FlowDirectionGroup,
  FlowRouteData,
  FlowRouteKind,
  FlowRoutePoint,
  RoutedHierarchyEdge,
} from './flow-types';
import { getNodeCenter, getNodeSize } from './flow-node-placement';

interface AnchorMeta {
  sourceAnchor: FlowRoutePoint;
  targetAnchor: FlowRoutePoint;
  sourceHandle: string;
  targetHandle: string;
}

interface EdgeRoutingMeta {
  edge: Edge;
  kind: FlowRouteKind;
  sign: 1 | -1;
  sourceAnchor: FlowRoutePoint;
  targetAnchor: FlowRoutePoint;
  sourceHandle: string;
  targetHandle: string;
  directionGroup: FlowDirectionGroup;
}

interface BusEdgeMeta {
  sourceHandle: string;
  targetHandle: string;
  data: FlowRouteData;
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

function resolveDirectionGroup(sourceY: number, targetY: number): FlowDirectionGroup {
  if (targetY > sourceY + ROUTE_ROW_TOLERANCE) {
    return 'down';
  }

  if (targetY < sourceY - ROUTE_ROW_TOLERANCE) {
    return 'up';
  }

  return 'flat';
}

function resolveOrientation(source: Node, target: Node): FlowRouteKind {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const sourceSize = getNodeSize(source);
  const targetSize = getNodeSize(target);

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDy <= ROUTE_ROW_TOLERANCE) {
    return 'horizontal';
  }

  if (absDx <= ROUTE_COLUMN_TOLERANCE) {
    return 'vertical';
  }

  const normDx = absDx / Math.max(1, sourceSize.width + targetSize.width);
  const normDy = absDy / Math.max(1, sourceSize.height + targetSize.height);

  return normDx >= normDy ? 'horizontal' : 'vertical';
}

function getVerticalAnchors(source: Node, target: Node, sign: 1 | -1): AnchorMeta {
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

function getHorizontalAnchors(source: Node, target: Node, sign: 1 | -1): AnchorMeta {
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
  directionGroup: Extract<FlowDirectionGroup, 'up' | 'down'>
): BusEdgeMeta {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const sourceSize = getNodeSize(source);
  const targetSize = getNodeSize(target);

  const directionSign: 1 | -1 = directionGroup === 'down' ? 1 : -1;
  const sourceAnchor = {
    x: sourceCenter.x,
    y: sourceCenter.y + (directionSign > 0 ? sourceSize.height / 2 : -sourceSize.height / 2),
  };
  const targetAnchor = {
    x: targetCenter.x,
    y: targetCenter.y + (directionSign > 0 ? -targetSize.height / 2 : targetSize.height / 2),
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
    sourceHandle: directionSign > 0 ? 's-bottom' : 's-top',
    targetHandle: directionSign > 0 ? 't-top' : 't-bottom',
    data: {
      kind: 'bus',
      points,
      laneIndex,
      sharedBusId,
      directionGroup,
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

  const offsetMap = new Map<string, { offset: number; index: number }>();
  sorted.forEach((item, index) => {
    const offset = (index - (sorted.length - 1) / 2) * ROUTE_LANE_GAP;
    offsetMap.set(item.edge.id, { offset: snapToRouteGrid(offset), index });
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

  const busEdgeMap = new Map<string, BusEdgeMeta>();

  outgoingMap.forEach((outgoing, sourceId) => {
    if (outgoing.length < 2) {
      return;
    }

    const sourceNode = nodeMap.get(sourceId);
    if (!sourceNode) {
      return;
    }

    const withTargets = outgoing
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

    if (withTargets.length < 2) {
      return;
    }

    const grouped: Record<'down' | 'up', Array<{ edge: Edge; target: Node }>> = {
      down: [],
      up: [],
    };

    withTargets.forEach((item) => {
      const sourceCenter = getNodeCenter(sourceNode);
      const targetCenter = getNodeCenter(item.target);
      const directionGroup = resolveDirectionGroup(sourceCenter.y, targetCenter.y);
      if (directionGroup === 'down' || directionGroup === 'up') {
        grouped[directionGroup].push(item);
      }
    });

    (['down', 'up'] as const).forEach((groupKey) => {
      const groupItems = grouped[groupKey];
      if (groupItems.length < 2) {
        return;
      }

      const sharedBusId = `${sourceId}:${groupKey}:bus`;
      groupItems.forEach((item, index) => {
        busEdgeMap.set(item.edge.id, edgeToBusRoute(sourceNode, item.target, index, sharedBusId, groupKey));
      });
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
    const directionGroup = resolveDirectionGroup(sourceCenter.y, targetCenter.y);

    const orientation = resolveOrientation(sourceNode, targetNode);

    if (orientation === 'horizontal') {
      const sign = (targetCenter.x >= sourceCenter.x ? 1 : -1) as 1 | -1;
      const anchors = getHorizontalAnchors(sourceNode, targetNode, sign);
      linearMetas.push({
        edge,
        kind: 'horizontal',
        sign,
        sourceAnchor: anchors.sourceAnchor,
        targetAnchor: anchors.targetAnchor,
        sourceHandle: anchors.sourceHandle,
        targetHandle: anchors.targetHandle,
        directionGroup,
      });
      return;
    }

    const sign = (targetCenter.y >= sourceCenter.y ? 1 : -1) as 1 | -1;
    const anchors = getVerticalAnchors(sourceNode, targetNode, sign);
    linearMetas.push({
      edge,
      kind: 'vertical',
      sign,
      sourceAnchor: anchors.sourceAnchor,
      targetAnchor: anchors.targetAnchor,
      sourceHandle: anchors.sourceHandle,
      targetHandle: anchors.targetHandle,
      directionGroup,
    });
  });

  const groupedLinear = new Map<string, EdgeRoutingMeta[]>();
  linearMetas.forEach((meta) => {
    const key = `${meta.edge.source}:${meta.kind}:${meta.sign}:${meta.directionGroup}`;
    const list = groupedLinear.get(key);
    if (list) {
      list.push(meta);
    } else {
      groupedLinear.set(key, [meta]);
    }
  });

  const laneMetaMap = new Map<string, { offset: number; index: number }>();
  groupedLinear.forEach((items, key) => {
    if (items.length === 1) {
      laneMetaMap.set(items[0].edge.id, { offset: 0, index: 0 });
      return;
    }

    const axis = key.includes(':horizontal:') ? 'y' : 'x';
    const offsets = buildLaneOffsets(items, axis);
    offsets.forEach((meta, edgeId) => laneMetaMap.set(edgeId, meta));
  });

  const linearMetaMap = new Map(linearMetas.map((meta) => [meta.edge.id, meta]));

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
          directionGroup: 'flat',
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

    const meta = linearMetaMap.get(edge.id);
    if (!meta) {
      return {
        ...edge,
        type: 'hierarchy',
        style: EDGE_STYLE,
        data: {
          kind: 'vertical',
          points: [],
          laneIndex: 0,
          directionGroup: 'flat',
        },
      } as RoutedHierarchyEdge;
    }

    const laneMeta = laneMetaMap.get(edge.id) ?? { offset: 0, index: 0 };

    if (meta.kind === 'horizontal') {
      const aligned = Math.abs(meta.sourceAnchor.y - meta.targetAnchor.y) <= ROUTE_SIDE_BY_SIDE_TOLERANCE;

      const points = aligned
        ? buildPath([meta.sourceAnchor, meta.targetAnchor])
        : buildPath([
            meta.sourceAnchor,
            {
              x: snapToRouteGrid((meta.sourceAnchor.x + meta.targetAnchor.x) / 2 + laneMeta.offset),
              y: meta.sourceAnchor.y,
            },
            {
              x: snapToRouteGrid((meta.sourceAnchor.x + meta.targetAnchor.x) / 2 + laneMeta.offset),
              y: meta.targetAnchor.y,
            },
            meta.targetAnchor,
          ]);

      return {
        ...edge,
        type: 'hierarchy',
        style: EDGE_STYLE,
        sourceHandle: meta.sourceHandle,
        targetHandle: meta.targetHandle,
        data: {
          kind: 'horizontal',
          points,
          laneIndex: laneMeta.index,
          directionGroup: meta.directionGroup,
        },
      } as RoutedHierarchyEdge;
    }

    const aligned = Math.abs(meta.sourceAnchor.x - meta.targetAnchor.x) <= ROUTE_ALIGN_TOLERANCE;
    const points = aligned
      ? buildPath([meta.sourceAnchor, meta.targetAnchor])
      : buildPath([
          meta.sourceAnchor,
          {
            x: meta.sourceAnchor.x,
            y: snapToRouteGrid((meta.sourceAnchor.y + meta.targetAnchor.y) / 2 + laneMeta.offset),
          },
          {
            x: meta.targetAnchor.x,
            y: snapToRouteGrid((meta.sourceAnchor.y + meta.targetAnchor.y) / 2 + laneMeta.offset),
          },
          meta.targetAnchor,
        ]);

    return {
      ...edge,
      type: 'hierarchy',
      style: EDGE_STYLE,
      sourceHandle: meta.sourceHandle,
      targetHandle: meta.targetHandle,
      data: {
        kind: 'vertical',
        points,
        laneIndex: laneMeta.index,
        directionGroup: meta.directionGroup,
      },
    } as RoutedHierarchyEdge;
  });
}
