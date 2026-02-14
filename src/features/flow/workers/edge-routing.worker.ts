import {
  buildAdaptiveRoutedEdgeGeometry,
  buildRoutingCacheKey,
  type CompactRouteEdge,
  type CompactRouteNode,
  type RoutedEdgeGeometry,
} from '../flow-edge-routing-core';

interface RouteRequestMessage {
  type: 'route';
  hash?: string;
  nodes: CompactRouteNode[];
  edges: CompactRouteEdge[];
}

interface RouteResponseMessage {
  type: 'route-result';
  hash: string;
  edges: RoutedEdgeGeometry[];
}

const cache = new Map<string, RoutedEdgeGeometry[]>();

self.onmessage = (event: MessageEvent<RouteRequestMessage>) => {
  if (event.data.type !== 'route') {
    return;
  }

  const hash = event.data.hash ?? buildRoutingCacheKey(event.data.edges, event.data.nodes);
  const routed = cache.get(hash) ?? buildAdaptiveRoutedEdgeGeometry(event.data.edges, event.data.nodes);

  if (!cache.has(hash)) {
    cache.set(hash, routed);
  }

  const message: RouteResponseMessage = {
    type: 'route-result',
    hash,
    edges: routed,
  };

  self.postMessage(message);
};
