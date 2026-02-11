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

interface NodeSize {
  width: number;
  height: number;
}

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap: number
) {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
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
          NODE_GAP * 0.25
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function chooseChildRowY(parent: Node, childNodes: Node[]) {
  const parentSize = getNodeSize(parent);
  const minAllowed = parent.position.y + parentSize.height + NODE_GAP;
  const avgY = childNodes.reduce((sum, node) => sum + node.position.y, 0) / childNodes.length;
  return snap(Math.max(minAllowed, avgY), GRID_SIZE);
}

function buildNonSiblingNodes(nodes: Node[], parentId: string, childIds: Set<string>) {
  return nodes.filter((node) => node.id !== parentId && !childIds.has(node.id));
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

  const children = childIds
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is Node => Boolean(node))
    .sort((a, b) => (a.position.x === b.position.x ? a.id.localeCompare(b.id) : a.position.x - b.position.x));

  if (children.length < 2) {
    return nodes;
  }

  const parentCenter = getNodeCenter(parent);
  const childIdsSet = new Set(children.map((node) => node.id));
  const blockers = buildNonSiblingNodes(nodes, parentId, childIdsSet);

  const spacing = DEFAULT_NODE_SIZE.width + NODE_GAP;
  const startCenterX = parentCenter.x - ((children.length - 1) * spacing) / 2;

  let rowY = chooseChildRowY(parent, children);

  const candidatePositions = (targetY: number) =>
    children.map((child, index) => {
      const centerX = startCenterX + index * spacing;
      return {
        id: child.id,
        x: snap(centerX - DEFAULT_NODE_SIZE.width / 2, GRID_SIZE),
        y: targetY,
      };
    });

  const hasBlockingCollision = (candidates: Array<{ id: string; x: number; y: number }>) => {
    return candidates.some((candidate) => {
      return blockers.some((blocker) => {
        const blockerSize = getNodeSize(blocker);
        return rectsOverlap(
          {
            x: candidate.x,
            y: candidate.y,
            width: DEFAULT_NODE_SIZE.width,
            height: DEFAULT_NODE_SIZE.height,
          },
          {
            x: blocker.position.x,
            y: blocker.position.y,
            width: blockerSize.width,
            height: blockerSize.height,
          },
          NODE_GAP * 0.2
        );
      });
    });
  };

  let chosen = candidatePositions(rowY);

  for (let i = 0; i < AUTO_MAX_TRIES; i += 1) {
    if (!hasBlockingCollision(chosen)) {
      break;
    }

    rowY = snap(rowY + GRID_SIZE, GRID_SIZE);
    chosen = candidatePositions(rowY);
  }

  const positionMap = new Map(chosen.map((item) => [item.id, { x: item.x, y: item.y }]));

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

