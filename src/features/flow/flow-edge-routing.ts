import type { Edge, Node } from 'reactflow';
import { EDGE_STYLE } from './flow-constants';
import {
  buildAdaptiveRoutedEdgeGeometry,
  buildRoutingCacheKey,
  type CompactRouteEdge,
  type CompactRouteNode,
  type RoutedEdgeGeometry,
} from './flow-edge-routing-core';
import type { RoutedHierarchyEdge } from './flow-types';

const routingCache = new Map<string, RoutedEdgeGeometry[]>();

export function toCompactRouteNodes(nodes: Node[]): CompactRouteNode[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: node.width ?? undefined,
    height: node.height ?? undefined,
  }));
}

export function toCompactRouteEdges(edges: Edge[]): CompactRouteEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
}

export function applyRoutedEdgeGeometry(edges: Edge[], geometry: RoutedEdgeGeometry[]): RoutedHierarchyEdge[] {
  const geometryById = new Map(geometry.map((item) => [item.id, item]));

  return edges.map((edge) => {
    const route = geometryById.get(edge.id);
    return {
      ...edge,
      type: 'hierarchy',
      style: EDGE_STYLE,
      sourceHandle: route?.sourceHandle,
      targetHandle: route?.targetHandle,
      data: route?.data ?? {
        kind: 'vertical',
        points: [],
        laneIndex: 0,
        directionGroup: 'flat',
      },
    } as RoutedHierarchyEdge;
  });
}

export function buildAdaptiveRoutedEdges(edges: Edge[], nodes: Node[]): RoutedHierarchyEdge[] {
  if (edges.length === 0) {
    return [];
  }

  const compactEdges = toCompactRouteEdges(edges);
  const compactNodes = toCompactRouteNodes(nodes);
  const cacheKey = buildRoutingCacheKey(compactEdges, compactNodes);

  const geometry = routingCache.get(cacheKey) ?? buildAdaptiveRoutedEdgeGeometry(compactEdges, compactNodes);
  if (!routingCache.has(cacheKey)) {
    routingCache.set(cacheKey, geometry);
  }

  return applyRoutedEdgeGeometry(edges, geometry);
}

export { buildRoutingCacheKey, buildAdaptiveRoutedEdgeGeometry };
export type { CompactRouteEdge, CompactRouteNode, RoutedEdgeGeometry };
