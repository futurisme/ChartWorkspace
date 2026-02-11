import assert from 'node:assert/strict';
import test from 'node:test';
import type { Edge, Node } from 'reactflow';
import { buildAdaptiveRoutedEdges } from './flow-edge-routing';

function buildNode(id: string, x: number, y: number): Node {
  return {
    id,
    position: { x, y },
    data: { label: id },
    type: 'conceptNode',
  } as Node;
}

function buildEdge(id: string, source: string, target: string): Edge {
  return { id, source, target } as Edge;
}

test('buildAdaptiveRoutedEdges creates bus route for parent with two children', () => {
  const nodes = [
    buildNode('parent', 300, 100),
    buildNode('child-a', 180, 320),
    buildNode('child-b', 420, 320),
  ];

  const edges = [
    buildEdge('e1', 'parent', 'child-a'),
    buildEdge('e2', 'parent', 'child-b'),
  ];

  const routed = buildAdaptiveRoutedEdges(edges, nodes);

  assert.equal(routed.length, 2);
  assert.equal(routed[0].data?.kind, 'bus');
  assert.equal(routed[1].data?.kind, 'bus');
  assert.ok((routed[0].data?.points?.length ?? 0) >= 4);
});

test('buildAdaptiveRoutedEdges uses horizontal side-to-side routing when nodes are aligned horizontally', () => {
  const nodes = [buildNode('a', 100, 200), buildNode('b', 450, 210)];
  const edges = [buildEdge('e1', 'a', 'b')];

  const [routed] = buildAdaptiveRoutedEdges(edges, nodes);

  assert.equal(routed.data?.kind, 'horizontal');
  assert.equal(routed.sourceHandle, 's-right');
  assert.equal(routed.targetHandle, 't-left');
});

test('buildAdaptiveRoutedEdges uses vertical middle-to-middle routing when nodes are vertical', () => {
  const nodes = [buildNode('a', 100, 100), buildNode('b', 100, 420)];
  const edges = [buildEdge('e1', 'a', 'b')];

  const [routed] = buildAdaptiveRoutedEdges(edges, nodes);

  assert.equal(routed.data?.kind, 'vertical');
  assert.equal(routed.sourceHandle, 's-bottom');
  assert.equal(routed.targetHandle, 't-top');
});

