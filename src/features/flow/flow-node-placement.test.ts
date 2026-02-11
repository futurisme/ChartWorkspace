import assert from 'node:assert/strict';
import test from 'node:test';
import type { Edge, Node } from 'reactflow';
import { spreadChildrenForParent, hasSiblingOverlap } from './flow-node-placement';

function buildNode(id: string, x: number, y: number): Node {
  return {
    id,
    position: { x, y },
    data: { label: id },
    type: 'conceptNode',
  } as Node;
}

function buildEdge(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    target,
  } as Edge;
}

test('spreadChildrenForParent repositions overlapping siblings deterministically', () => {
  const parent = buildNode('parent', 300, 100);
  const childA = buildNode('child-a', 280, 260);
  const childB = buildNode('child-b', 300, 260);

  const nodes = [parent, childA, childB];
  const edges = [buildEdge('e1', 'parent', 'child-a'), buildEdge('e2', 'parent', 'child-b')];

  assert.equal(hasSiblingOverlap('parent', nodes, edges), true);

  const spread = spreadChildrenForParent('parent', nodes, edges);

  const spreadA = spread.find((node) => node.id === 'child-a');
  const spreadB = spread.find((node) => node.id === 'child-b');

  assert.ok(spreadA);
  assert.ok(spreadB);
  assert.notEqual(spreadA?.position.x, spreadB?.position.x);
  assert.equal(spreadA?.position.y, spreadB?.position.y);
});

test('spreadChildrenForParent keeps layout unchanged for single child', () => {
  const parent = buildNode('parent', 300, 100);
  const childA = buildNode('child-a', 280, 260);

  const nodes = [parent, childA];
  const edges = [buildEdge('e1', 'parent', 'child-a')];

  const spread = spreadChildrenForParent('parent', nodes, edges);
  assert.deepEqual(spread, nodes);
});

