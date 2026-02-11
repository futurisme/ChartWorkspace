import assert from 'node:assert/strict';
import test from 'node:test';
import type { Edge, Node } from 'reactflow';
import { ROUTE_COLUMN_TOLERANCE, ROUTE_ROW_TOLERANCE } from './flow-constants';
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

test('same-row tolerance prefers horizontal routing', () => {
  const nodes = [buildNode('a', 100, 200), buildNode('b', 420, 200 + ROUTE_ROW_TOLERANCE - 1)];
  const [routed] = buildAdaptiveRoutedEdges([buildEdge('e1', 'a', 'b')], nodes);

  assert.equal(routed.data?.kind, 'horizontal');
  assert.equal(routed.sourceHandle, 's-right');
  assert.equal(routed.targetHandle, 't-left');
});

test('same-column tolerance prefers vertical routing', () => {
  const nodes = [buildNode('a', 120, 80), buildNode('b', 120 + ROUTE_COLUMN_TOLERANCE - 1, 360)];
  const [routed] = buildAdaptiveRoutedEdges([buildEdge('e1', 'a', 'b')], nodes);

  assert.equal(routed.data?.kind, 'vertical');
  assert.equal(routed.sourceHandle, 's-bottom');
  assert.equal(routed.targetHandle, 't-top');
});

test('parent with two children below creates downward bus route', () => {
  const nodes = [
    buildNode('parent', 320, 120),
    buildNode('child-a', 180, 360),
    buildNode('child-b', 460, 360),
  ];
  const edges = [buildEdge('e1', 'parent', 'child-a'), buildEdge('e2', 'parent', 'child-b')];
  const routed = buildAdaptiveRoutedEdges(edges, nodes);

  routed.forEach((edge) => {
    assert.equal(edge.data?.kind, 'bus');
    assert.equal(edge.data?.directionGroup, 'down');
    assert.ok((edge.data?.points?.length ?? 0) >= 4);
  });
});

test('parent with two children above creates upward bus route', () => {
  const nodes = [
    buildNode('parent', 320, 420),
    buildNode('child-a', 180, 140),
    buildNode('child-b', 460, 140),
  ];
  const edges = [buildEdge('e1', 'parent', 'child-a'), buildEdge('e2', 'parent', 'child-b')];
  const routed = buildAdaptiveRoutedEdges(edges, nodes);

  routed.forEach((edge) => {
    assert.equal(edge.data?.kind, 'bus');
    assert.equal(edge.data?.directionGroup, 'up');
    assert.ok((edge.data?.sharedBusId ?? '').includes(':up:bus'));
  });
});

test('mixed up/down children create two independent bus groups', () => {
  const nodes = [
    buildNode('parent', 320, 280),
    buildNode('down-a', 180, 520),
    buildNode('down-b', 460, 520),
    buildNode('up-a', 180, 40),
    buildNode('up-b', 460, 40),
  ];
  const edges = [
    buildEdge('e-down-2', 'parent', 'down-b'),
    buildEdge('e-up-2', 'parent', 'up-b'),
    buildEdge('e-down-1', 'parent', 'down-a'),
    buildEdge('e-up-1', 'parent', 'up-a'),
  ];

  const routed = buildAdaptiveRoutedEdges(edges, nodes);
  const downRoutes = routed.filter((edge) => edge.data?.directionGroup === 'down');
  const upRoutes = routed.filter((edge) => edge.data?.directionGroup === 'up');

  assert.equal(downRoutes.length, 2);
  assert.equal(upRoutes.length, 2);
  assert.equal(new Set(downRoutes.map((edge) => edge.data?.sharedBusId)).size, 1);
  assert.equal(new Set(upRoutes.map((edge) => edge.data?.sharedBusId)).size, 1);
});

test('bus lane index remains deterministic regardless edge insertion order', () => {
  const nodes = [
    buildNode('parent', 320, 120),
    buildNode('left', 120, 360),
    buildNode('center', 320, 360),
    buildNode('right', 520, 360),
  ];

  const edges = [
    buildEdge('e-right', 'parent', 'right'),
    buildEdge('e-left', 'parent', 'left'),
    buildEdge('e-center', 'parent', 'center'),
  ];

  const routed = buildAdaptiveRoutedEdges(edges, nodes);
  const laneByTarget = new Map(routed.map((edge) => [edge.target, edge.data?.laneIndex]));

  assert.equal(laneByTarget.get('left'), 0);
  assert.equal(laneByTarget.get('center'), 1);
  assert.equal(laneByTarget.get('right'), 2);
});
