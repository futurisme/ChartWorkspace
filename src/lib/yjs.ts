import * as Y from 'yjs';

export interface ConceptNode {
  id: string;
  label: string;
  position: { x: number; y: number };
  color?: string;
}

export interface ConceptEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

/**
 * Create a new Yjs document with Map structure
 */
export function createYjsDoc(): Y.Doc {
  const doc = new Y.Doc();

  // Shared state
  doc.getMap('nodes');
  doc.getMap('edges');
  doc.getMap('selected');
  doc.getText('title');

  return doc;
}

/**
 * Add a node to the Yjs document
 */
export function addNode(
  ymap: Y.Map<any>,
  node: ConceptNode
) {
  const nodeMap = new Y.Map();
  nodeMap.set('id', node.id);
  nodeMap.set('label', node.label);
  nodeMap.set('position', {
    x: node.position.x,
    y: node.position.y,
  });
  if (node.color) {
    nodeMap.set('color', node.color);
  }
  ymap.set(node.id, nodeMap);
}

/**
 * Add an edge to the Yjs document
 */
export function addEdge(
  ymap: Y.Map<any>,
  edge: ConceptEdge
) {
  const edgeMap = new Y.Map();
  edgeMap.set('id', edge.id);
  edgeMap.set('source', edge.source);
  edgeMap.set('target', edge.target);
  if (edge.label) {
    edgeMap.set('label', edge.label);
  }
  ymap.set(edge.id, edgeMap);
}

/**
 * Get all nodes from Yjs document
 */
export function getNodesFromYjs(ymap: Y.Map<any>): ConceptNode[] {
  const nodes: ConceptNode[] = [];
  ymap.forEach((value: any, key: string) => {
    nodes.push({
      id: value.get('id'),
      label: value.get('label'),
      position: value.get('position'),
      color: value.get('color'),
    });
  });
  return nodes;
}

/**
 * Get all edges from Yjs document
 */
export function getEdgesFromYjs(ymap: Y.Map<any>): ConceptEdge[] {
  const edges: ConceptEdge[] = [];
  ymap.forEach((value: any, key: string) => {
    edges.push({
      id: value.get('id'),
      source: value.get('source'),
      target: value.get('target'),
      label: value.get('label'),
    });
  });
  return edges;
}
