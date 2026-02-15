import {
  DEFAULT_NODE_SIZE,
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
} from './flow-types';

export interface CompactRouteNode {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface CompactRouteEdge {
  id: string;
  source: string;
  target: string;
}

export interface RoutedEdgeGeometry {
  id: string;
  sourceHandle?: string;
  targetHandle?: string;
  data: FlowRouteData;
}

interface AnchorMeta {
  sourceAnchor: FlowRoutePoint;
  targetAnchor: FlowRoutePoint;
  sourceHandle: string;
  targetHandle: string;
}

interface EdgeRoutingMeta {
  edge: CompactRouteEdge;
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

const FAR_HORIZONTAL_ROUTE_DISTANCE = DEFAULT_NODE_SIZE.width * 3;
const ANCHOR_INSET_RATIO = 0.22;

function getNodeSize(node: CompactRouteNode) {
  const rawWidth = typeof node.width === 'number' && Number.isFinite(node.width)
    ? node.width
    : DEFAULT_NODE_SIZE.width;
  const rawHeight = typeof node.height === 'number' && Number.isFinite(node.height)
    ? node.height
    : DEFAULT_NODE_SIZE.height;

  return {
    width: rawWidth > 0 ? rawWidth : DEFAULT_NODE_SIZE.width,
    height: rawHeight > 0 ? rawHeight : DEFAULT_NODE_SIZE.height,
  };
}

function getNodeCenter(node: CompactRouteNode) {
  const size = getNodeSize(node);
  return {
    x: node.x + size.width / 2,
    y: node.y + size.height / 2,
  };
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

function resolveOrientation(source: CompactRouteNode, target: CompactRouteNode): FlowRouteKind {
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

function getVerticalAnchors(source: CompactRouteNode, target: CompactRouteNode, sign: 1 | -1): AnchorMeta {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const sourceSize = getNodeSize(source);
  const targetSize = getNodeSize(target);

  if (sign >= 0) {
    return {
      sourceAnchor: { x: sourceCenter.x, y: sourceCenter.y + sourceSize.height * ANCHOR_INSET_RATIO },
      targetAnchor: { x: targetCenter.x, y: targetCenter.y - targetSize.height * ANCHOR_INSET_RATIO },
      sourceHandle: 's-bottom',
      targetHandle: 't-top',
    };
  }

  return {
    sourceAnchor: { x: sourceCenter.x, y: sourceCenter.y - sourceSize.height * ANCHOR_INSET_RATIO },
    targetAnchor: { x: targetCenter.x, y: targetCenter.y + targetSize.height * ANCHOR_INSET_RATIO },
    sourceHandle: 's-top',
    targetHandle: 't-bottom',
  };
}

function getHorizontalAnchors(source: CompactRouteNode, target: CompactRouteNode, sign: 1 | -1): AnchorMeta {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const sourceSize = getNodeSize(source);
  const targetSize = getNodeSize(target);

  if (sign >= 0) {
    return {
      sourceAnchor: { x: sourceCenter.x + sourceSize.width * ANCHOR_INSET_RATIO, y: sourceCenter.y },
      targetAnchor: { x: targetCenter.x - targetSize.width * ANCHOR_INSET_RATIO, y: targetCenter.y },
      sourceHandle: 's-right',
      targetHandle: 't-left',
    };
  }

  return {
    sourceAnchor: { x: sourceCenter.x - sourceSize.width * ANCHOR_INSET_RATIO, y: sourceCenter.y },
    targetAnchor: { x: targetCenter.x + targetSize.width * ANCHOR_INSET_RATIO, y: targetCenter.y },
    sourceHandle: 's-left',
    targetHandle: 't-right',
  };
}

function edgeToBusRoute(
  source: CompactRouteNode,
  target: CompactRouteNode,
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
    y: sourceCenter.y + (directionSign > 0 ? sourceSize.height * ANCHOR_INSET_RATIO : -sourceSize.height * ANCHOR_INSET_RATIO),
  };
  const targetAnchor = {
    x: targetCenter.x,
    y: targetCenter.y + (directionSign > 0 ? -targetSize.height * ANCHOR_INSET_RATIO : targetSize.height * ANCHOR_INSET_RATIO),
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

export function buildRoutingCacheKey(edges: CompactRouteEdge[], nodes: CompactRouteNode[]) {
  const nodeParts = [...nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((node) => {
      const size = getNodeSize(node);
      return `${node.id}:${snapToRouteGrid(node.x)}:${snapToRouteGrid(node.y)}:${snapToRouteGrid(size.width)}:${snapToRouteGrid(size.height)}`;
    });

  const edgeParts = [...edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((edge) => `${edge.id}:${edge.source}->${edge.target}`);

  return `${nodeParts.join('|')}__${edgeParts.join('|')}`;
}

export function buildAdaptiveRoutedEdgeGeometry(
  edges: CompactRouteEdge[],
  nodes: CompactRouteNode[]
): RoutedEdgeGeometry[] {
  if (edges.length === 0) {
    return [];
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const busEdgeMap = new Map<string, BusEdgeMeta>();
  const outgoingMap = new Map<string, CompactRouteEdge[]>();

  edges.forEach((edge) => {
    const current = outgoingMap.get(edge.source);
    if (current) {
      current.push(edge);
    } else {
      outgoingMap.set(edge.source, [edge]);
    }
  });

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
      .filter((item): item is { edge: CompactRouteEdge; target: CompactRouteNode } => Boolean(item.target))
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

    const grouped: Record<'down' | 'up', Array<{ edge: CompactRouteEdge; target: CompactRouteNode }>> = {
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
    const bus = busEdgeMap.get(edge.id);
    if (bus) {
      return {
        id: edge.id,
        sourceHandle: bus.sourceHandle,
        targetHandle: bus.targetHandle,
        data: bus.data,
      };
    }

    const meta = linearMetaMap.get(edge.id);
    if (!meta) {
      return {
        id: edge.id,
        data: {
          kind: 'vertical',
          points: [],
          laneIndex: 0,
          directionGroup: 'flat',
        },
      };
    }

    const laneMeta = laneMetaMap.get(edge.id) ?? { offset: 0, index: 0 };

    if (meta.kind === 'horizontal') {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      const sourceCenter = sourceNode ? getNodeCenter(sourceNode) : null;
      const targetCenter = targetNode ? getNodeCenter(targetNode) : null;
      const deltaY = Math.abs(meta.sourceAnchor.y - meta.targetAnchor.y);
      const aligned = deltaY <= ROUTE_SIDE_BY_SIDE_TOLERANCE;
      const nearAligned = deltaY <= ROUTE_SIDE_BY_SIDE_TOLERANCE * 2;
      const absDx = sourceCenter && targetCenter ? Math.abs(targetCenter.x - sourceCenter.x) : 0;
      const farHorizontal = absDx >= FAR_HORIZONTAL_ROUTE_DISTANCE;

      if (farHorizontal && targetCenter) {
        const targetCenterAnchor = {
          x: snapToRouteGrid(targetCenter.x),
          y: snapToRouteGrid(targetCenter.y),
        };

        const points = buildPath([
          meta.sourceAnchor,
          { x: targetCenterAnchor.x, y: meta.sourceAnchor.y },
          targetCenterAnchor,
        ]);

        return {
          id: edge.id,
          sourceHandle: meta.sourceHandle,
          targetHandle: meta.targetHandle,
          data: {
            kind: 'horizontal',
            points,
            laneIndex: laneMeta.index,
            directionGroup: meta.directionGroup,
          },
        };
      }

      const elbowX = nearAligned
        ? snapToRouteGrid((meta.sourceAnchor.x + meta.targetAnchor.x) / 2)
        : snapToRouteGrid((meta.sourceAnchor.x + meta.targetAnchor.x) / 2 + laneMeta.offset);

      const points = aligned
        ? buildPath([meta.sourceAnchor, meta.targetAnchor])
        : buildPath([
            meta.sourceAnchor,
            { x: elbowX, y: meta.sourceAnchor.y },
            { x: elbowX, y: meta.targetAnchor.y },
            meta.targetAnchor,
          ]);

      return {
        id: edge.id,
        sourceHandle: meta.sourceHandle,
        targetHandle: meta.targetHandle,
        data: {
          kind: 'horizontal',
          points,
          laneIndex: laneMeta.index,
          directionGroup: meta.directionGroup,
        },
      };
    }

    const aligned = Math.abs(meta.sourceAnchor.x - meta.targetAnchor.x) <= ROUTE_ALIGN_TOLERANCE;
    const midY = snapToRouteGrid((meta.sourceAnchor.y + meta.targetAnchor.y) / 2 + laneMeta.offset);
    const points = aligned
      ? buildPath([meta.sourceAnchor, meta.targetAnchor])
      : buildPath([
          meta.sourceAnchor,
          { x: meta.sourceAnchor.x, y: midY },
          { x: meta.targetAnchor.x, y: midY },
          meta.targetAnchor,
        ]);

    return {
      id: edge.id,
      sourceHandle: meta.sourceHandle,
      targetHandle: meta.targetHandle,
      data: {
        kind: 'vertical',
        points,
        laneIndex: laneMeta.index,
        directionGroup: meta.directionGroup,
      },
    };
  });
}
