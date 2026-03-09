import type { Edge, Node, XYPosition } from 'reactflow';

export interface ConceptNodeData {
  label: string;
  color?: string;
  description?: string;
  variant?: 'default' | 'descript';
  descriptionExpanded?: boolean;
  collaboratorNames?: string[];
  editedByOthers?: boolean;
}

export type ConceptNode = Node<ConceptNodeData>;

export interface NodeActionContextValue {
  onChangeColor: (nodeId: string, color: string) => void;
  onToggleDescriptionPanel: (nodeId: string) => void;
  isReadOnly: boolean;
}

export interface FlowRoutePoint {
  x: number;
  y: number;
}

export type FlowRouteKind = 'vertical' | 'horizontal' | 'bus';
export type FlowDirectionGroup = 'up' | 'down' | 'flat';

export interface FlowRouteData {
  kind: FlowRouteKind;
  points: FlowRoutePoint[];
  laneIndex: number;
  sharedBusId?: string;
  directionGroup: FlowDirectionGroup;
}

export type RoutedHierarchyEdge = Edge<FlowRouteData>;

export interface PersistedNodeRecord {
  id: string;
  label: string;
  position: XYPosition;
  color?: string;
  description?: string;
  variant?: 'default' | 'descript';
  descriptionExpanded?: boolean;
}

export interface PersistedEdgeRecord {
  id: string;
  source: string;
  target: string;
  label?: string;
}
