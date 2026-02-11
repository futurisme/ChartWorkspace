import assert from 'node:assert/strict';
import test from 'node:test';
import type { Edge, Node } from 'reactflow';
import { buildAdaptiveRoutedEdges } from './flow-edge-routing';
import { hasSiblingOverlap, spreadChildrenForParent } from './flow-node-placement';

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

test('integration: add sibling overlap then spread and reroute remain stable', () => {
  const parent = buildNode('parent', 320, 120);
  const childA = buildNode('child-a', 300, 360);
  const childB = buildNode('child-b', 300, 360); // intentionally overlapping

  const baseNodes = [parent, childA, childB];
  const baseEdges = [buildEdge('e1', 'parent', 'child-a'), buildEdge('e2', 'parent', 'child-b')];

  assert.equal(hasSiblingOverlap('parent', baseNodes, baseEdges), true);

  const spreadNodes = spreadChildrenForParent('parent', baseNodes, baseEdges);
  const routed = buildAdaptiveRoutedEdges(baseEdges, spreadNodes);

  const a = spreadNodes.find((node) => node.id === 'child-a');
  const b = spreadNodes.find((node) => node.id === 'child-b');

  assert.ok(a);
  assert.ok(b);
  assert.notEqual(a?.position.x, b?.position.x);
  assert.equal(a?.position.y, b?.position.y);

  routed.forEach((edge) => {
    assert.equal(edge.data?.kind, 'bus');
    assert.equal(edge.data?.directionGroup, 'down');
    assert.ok((edge.data?.points?.length ?? 0) >= 4);
  });
});
