import type { Edge, Node } from 'reactflow';

export interface ConceptNodeData {
  label: string;
  color?: string;
}

export type ConceptNode = Node<ConceptNodeData>;

export interface NodeActionContextValue {
  onChangeColor: (nodeId: string, color: string) => void;
  isReadOnly: boolean;
}

export interface FlowRoutePoint {
  x: number;
  y: number;
}

export type FlowRouteKind = 'vertical' | 'horizontal' | 'bus';

export interface FlowRouteData {
  kind: FlowRouteKind;
  points: FlowRoutePoint[];
  laneIndex: number;
  sharedBusId?: string;
}

export type RoutedHierarchyEdge = Edge<FlowRouteData>;

