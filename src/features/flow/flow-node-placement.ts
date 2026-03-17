import type { Edge, Node } from 'reactflow';
import {
  AUTO_GAP,
  AUTO_MAX_TRIES,
  DEFAULT_NODE_SIZE,
  GRID_SIZE,
  MIN_WORKSPACE_SIZE,
  NODE_GAP,
  WORKSPACE_PADDING,
} from './flow-constants';
import type { FlowDirectionGroup } from './flow-types';

interface NodeSize {
  width: number;
  height: number;
}

interface PlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CandidatePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

function rectsOverlap(a: PlacementRect, b: PlacementRect, gap: number) {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

function candidateToRect(candidate: CandidatePosition): PlacementRect {
  return {
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
  };
}

function sortNodesStable(nodes: Node[]) {
  return [...nodes].sort((a, b) => (a.position.x === b.position.x ? a.id.localeCompare(b.id) : a.position.x - b.position.x));
}

function getChildDirection(parentCenterY: number, childCenterY: number): FlowDirectionGroup {
  if (childCenterY > parentCenterY + GRID_SIZE * 0.25) {
    return 'down';
  }

  if (childCenterY < parentCenterY - GRID_SIZE * 0.25) {
    return 'up';
  }

  return 'flat';
}


function rebalanceClusterAroundParent(children: Node[], parentCenterX: number) {
  if (children.length < 3) {
    return children;
  }

  const ordered = sortNodesStable(children);
  const middleIndex = Math.floor(ordered.length / 2);

  let pivotIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;
  ordered.forEach((child, index) => {
    const childCenter = getNodeCenter(child);
    const distance = Math.abs(childCenter.x - parentCenterX);
    if (distance < minDistance) {
      minDistance = distance;
      pivotIndex = index;
    }
  });

  const pivot = ordered[pivotIndex];
  const remaining = ordered.filter((_, index) => index !== pivotIndex);

  const result: Node[] = new Array(ordered.length);
  result[middleIndex] = pivot;

  let left = middleIndex - 1;
  let right = middleIndex + 1;
  remaining.forEach((child, index) => {
    if (index % 2 === 0) {
      result[left] = child;
      left -= 1;
      return;
    }

    result[right] = child;
    right += 1;
  });

  return result.filter((node): node is Node => Boolean(node));
}

function buildClusterCandidates(children: Node[], centerStartX: number, rowY: number) {
  const spacing = DEFAULT_NODE_SIZE.width + NODE_GAP;

  return children.map((child, index) => {
    const childSize = getNodeSize(child);
    const centerX = centerStartX + index * spacing;
    return {
      id: child.id,
      x: snap(centerX - childSize.width / 2, GRID_SIZE),
      y: rowY,
      width: childSize.width,
      height: childSize.height,
    };
  });
}

function hasCollision(
  candidates: CandidatePosition[],
  blockerRects: PlacementRect[],
  occupiedRects: PlacementRect[]
) {
  return candidates.some((candidate) => {
    const rect = candidateToRect(candidate);

    const collidesBlocker = blockerRects.some((blocker) => rectsOverlap(rect, blocker, NODE_GAP * 0.2));
    if (collidesBlocker) {
      return true;
    }

    return occupiedRects.some((occupied) => rectsOverlap(rect, occupied, NODE_GAP * 0.2));
  });
}

function chooseClusterRowY(direction: Extract<FlowDirectionGroup, 'up' | 'down'>, parent: Node, children: Node[]) {
  const parentSize = getNodeSize(parent);
  const avgY = children.reduce((sum, node) => sum + node.position.y, 0) / Math.max(1, children.length);

  if (direction === 'down') {
    const minAllowed = parent.position.y + parentSize.height + NODE_GAP;
    return snap(Math.max(minAllowed, avgY), GRID_SIZE);
  }

  const maxAllowed = parent.position.y - DEFAULT_NODE_SIZE.height - NODE_GAP;
  return snap(Math.min(maxAllowed, avgY), GRID_SIZE);
}

export function getNodeSize(node: Node): NodeSize {
  return {
    width: node.width ?? DEFAULT_NODE_SIZE.width,
    height: node.height ?? DEFAULT_NODE_SIZE.height,
  };
}

export function getNodeCenter(node: Node) {
  const size = getNodeSize(node);
  return {
    x: node.position.x + size.width / 2,
    y: node.position.y + size.height / 2,
  };
}

export function snapToGridPosition(position: { x: number; y: number }) {
  return {
    x: snap(position.x, GRID_SIZE),
    y: snap(position.y, GRID_SIZE),
  };
}

export function getWorkspaceExtent(nodes: Node[]) {
  if (nodes.length === 0) {
    const halfWidth = MIN_WORKSPACE_SIZE.width / 2;
    const halfHeight = MIN_WORKSPACE_SIZE.height / 2;
    return [
      [-halfWidth, -halfHeight],
      [halfWidth, halfHeight],
    ] as [[number, number], [number, number]];
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const size = getNodeSize(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  });

  const width = Math.max(maxX - minX, MIN_WORKSPACE_SIZE.width);
  const height = Math.max(maxY - minY, MIN_WORKSPACE_SIZE.height);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return [
    [centerX - width / 2 - WORKSPACE_PADDING, centerY - height / 2 - WORKSPACE_PADDING],
    [centerX + width / 2 + WORKSPACE_PADDING, centerY + height / 2 + WORKSPACE_PADDING],
  ] as [[number, number], [number, number]];
}

export function findOpenPosition(
  start: { x: number; y: number },
  nodes: Node[],
  step: { x: number; y: number }
) {
  let candidate = { ...start };

  for (let i = 0; i < AUTO_MAX_TRIES; i += 1) {
    const overlaps = nodes.some((node) => {
      const size = getNodeSize(node);
      return rectsOverlap(
        { x: candidate.x, y: candidate.y, width: DEFAULT_NODE_SIZE.width, height: DEFAULT_NODE_SIZE.height },
        { x: node.position.x, y: node.position.y, width: size.width, height: size.height },
        AUTO_GAP
      );
    });

    if (!overlaps) {
      return candidate;
    }

    candidate = { x: candidate.x + step.x, y: candidate.y + step.y };
  }

  return candidate;
}

export function hasSiblingOverlap(parentId: string, nodes: Node[], edges: Edge[]) {
  const childIds = edges.filter((edge) => edge.source === parentId).map((edge) => edge.target);
  if (childIds.length < 2) {
    return false;
  }

  const childNodes = childIds
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is Node => Boolean(node));

  for (let i = 0; i < childNodes.length; i += 1) {
    const a = childNodes[i];
    const sizeA = getNodeSize(a);

    for (let j = i + 1; j < childNodes.length; j += 1) {
      const b = childNodes[j];
      const sizeB = getNodeSize(b);
      if (
        rectsOverlap(
          { x: a.position.x, y: a.position.y, width: sizeA.width, height: sizeA.height },
          { x: b.position.x, y: b.position.y, width: sizeB.width, height: sizeB.height },
          0
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function buildNonSiblingRects(nodes: Node[], parentId: string, childIds: Set<string>) {
  return nodes
    .filter((node) => node.id !== parentId && !childIds.has(node.id))
    .map((node) => {
      const size = getNodeSize(node);
      return {
        x: node.position.x,
        y: node.position.y,
        width: size.width,
        height: size.height,
      };
    });
}

export function spreadChildrenForParent(parentId: string, nodes: Node[], edges: Edge[]) {
  const parent = nodes.find((node) => node.id === parentId);
  if (!parent) {
    return nodes;
  }

  const childIds = edges.filter((edge) => edge.source === parentId).map((edge) => edge.target);
  if (childIds.length < 2) {
    return nodes;
  }

  const children = sortNodesStable(
    childIds
      .map((id) => nodes.find((node) => node.id === id))
      .filter((node): node is Node => Boolean(node))
  );

  if (children.length < 2) {
    return nodes;
  }

  const parentCenter = getNodeCenter(parent);
  const childIdsSet = new Set(children.map((node) => node.id));

  let downCount = 0;
  let upCount = 0;

  const clusterById = new Map<string, FlowDirectionGroup>();
  children.forEach((child) => {
    const childCenter = getNodeCenter(child);
    const direction = getChildDirection(parentCenter.y, childCenter.y);
    clusterById.set(child.id, direction);
    if (direction === 'down') {
      downCount += 1;
    } else if (direction === 'up') {
      upCount += 1;
    }
  });

  const dominant: Extract<FlowDirectionGroup, 'up' | 'down'> = downCount >= upCount ? 'down' : 'up';

  const clusters: Record<'down' | 'up', Node[]> = {
    down: [],
    up: [],
  };

  children.forEach((child) => {
    const direction = clusterById.get(child.id) ?? 'flat';
    if (direction === 'flat') {
      clusters[dominant].push(child);
      return;
    }

    clusters[direction].push(child);
  });

  clusters.down = sortNodesStable(clusters.down);
  clusters.up = sortNodesStable(clusters.up);

  const blockerRects = buildNonSiblingRects(nodes, parentId, childIdsSet);
  const occupiedRects: PlacementRect[] = [];
  const positionMap = new Map<string, { x: number; y: number }>();

  const placeCluster = (direction: Extract<FlowDirectionGroup, 'up' | 'down'>) => {
    const clusterNodes = rebalanceClusterAroundParent(clusters[direction], parentCenter.x);
    if (clusterNodes.length === 0) {
      return;
    }

    const spacing = DEFAULT_NODE_SIZE.width + NODE_GAP;
    const startCenterX = parentCenter.x - ((clusterNodes.length - 1) * spacing) / 2;
    let rowY = chooseClusterRowY(direction, parent, clusterNodes);

    let candidates = buildClusterCandidates(clusterNodes, startCenterX, rowY);

    for (let i = 0; i < AUTO_MAX_TRIES; i += 1) {
      if (!hasCollision(candidates, blockerRects, occupiedRects)) {
        break;
      }

      rowY = snap(rowY + (direction === 'down' ? GRID_SIZE : -GRID_SIZE), GRID_SIZE);
      candidates = buildClusterCandidates(clusterNodes, startCenterX, rowY);
    }

    candidates.forEach((candidate) => {
      positionMap.set(candidate.id, { x: candidate.x, y: candidate.y });
      occupiedRects.push(candidateToRect(candidate));
    });
  };

  placeCluster('down');
  placeCluster('up');

  let changed = false;
  const next = nodes.map((node) => {
    const nextPos = positionMap.get(node.id);
    if (!nextPos) {
      return node;
    }

    if (node.position.x === nextPos.x && node.position.y === nextPos.y) {
      return node;
    }

    changed = true;
    return { ...node, position: nextPos };
  });

  return changed ? next : nodes;
}

export function spreadChildrenForAllParents(nodes: Node[], edges: Edge[]) {
  const parentIds = Array.from(new Set(edges.map((edge) => edge.source))).sort();

  let nextNodes = nodes;
  parentIds.forEach((parentId) => {
    if (hasSiblingOverlap(parentId, nextNodes, edges)) {
      nextNodes = spreadChildrenForParent(parentId, nextNodes, edges);
    }
  });

  return nextNodes;
}

export function getUpdatedNodePositions(before: Node[], after: Node[]) {
  const beforeMap = new Map(before.map((node) => [node.id, node]));

  return after
    .filter((node) => {
      const prev = beforeMap.get(node.id);
      return !prev || prev.position.x !== node.position.x || prev.position.y !== node.position.y;
    })
    .map((node) => ({ id: node.id, position: node.position }));
}
