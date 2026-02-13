import assert from 'node:assert/strict';
import test from 'node:test';
import type { Edge, Node } from 'reactflow';
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

test('spreadChildrenForParent repositions overlapping downward siblings deterministically', () => {
  const parent = buildNode('parent', 320, 120);
  const childA = buildNode('child-a', 300, 360);
  const childB = buildNode('child-b', 320, 360);

  const nodes = [parent, childA, childB];
  const edges = [buildEdge('e1', 'parent', 'child-a'), buildEdge('e2', 'parent', 'child-b')];

  assert.equal(hasSiblingOverlap('parent', nodes, edges), true);
  const spread = spreadChildrenForParent('parent', nodes, edges);

  const nextA = spread.find((node) => node.id === 'child-a');
  const nextB = spread.find((node) => node.id === 'child-b');

  assert.ok(nextA);
  assert.ok(nextB);
  assert.notEqual(nextA?.position.x, nextB?.position.x);
  assert.equal(nextA?.position.y, nextB?.position.y);
  assert.ok((nextA?.position.y ?? 0) > parent.position.y);
});

test('hasSiblingOverlap stays false for siblings that are close but not overlapping', () => {
  const parent = buildNode('parent', 320, 120);
  const childA = buildNode('child-a', 160, 360);
  const childB = buildNode('child-b', 340, 360);
  const nodes = [parent, childA, childB];
  const edges = [buildEdge('e1', 'parent', 'child-a'), buildEdge('e2', 'parent', 'child-b')];

  assert.equal(hasSiblingOverlap('parent', nodes, edges), false);
});

test('spreadChildrenForParent keeps upward cluster above parent', () => {
  const parent = buildNode('parent', 320, 420);
  const childA = buildNode('child-a', 300, 180);
  const childB = buildNode('child-b', 320, 180);

  const nodes = [parent, childA, childB];
  const edges = [buildEdge('e1', 'parent', 'child-a'), buildEdge('e2', 'parent', 'child-b')];

  const spread = spreadChildrenForParent('parent', nodes, edges);
  const nextA = spread.find((node) => node.id === 'child-a');
  const nextB = spread.find((node) => node.id === 'child-b');

  assert.ok(nextA);
  assert.ok(nextB);
  assert.ok((nextA?.position.y ?? 9999) < parent.position.y);
  assert.ok((nextB?.position.y ?? 9999) < parent.position.y);
});

test('spreadChildrenForParent separates mixed up/down clusters', () => {
  const parent = buildNode('parent', 320, 280);
  const upA = buildNode('up-a', 300, 100);
  const upB = buildNode('up-b', 320, 100);
  const downA = buildNode('down-a', 300, 500);
  const downB = buildNode('down-b', 320, 500);

  const nodes = [parent, upA, upB, downA, downB];
  const edges = [
    buildEdge('e1', 'parent', 'up-a'),
    buildEdge('e2', 'parent', 'up-b'),
    buildEdge('e3', 'parent', 'down-a'),
    buildEdge('e4', 'parent', 'down-b'),
  ];

  const spread = spreadChildrenForParent('parent', nodes, edges);

  const topNodes = spread.filter((node) => node.id.startsWith('up-'));
  const bottomNodes = spread.filter((node) => node.id.startsWith('down-'));

  topNodes.forEach((node) => assert.ok(node.position.y < parent.position.y));
  bottomNodes.forEach((node) => assert.ok(node.position.y > parent.position.y));
});

test('spreadChildrenForParent is idempotent for same input state', () => {
  const parent = buildNode('parent', 300, 120);
  const childA = buildNode('child-a', 280, 360);
  const childB = buildNode('child-b', 300, 360);
  const childC = buildNode('child-c', 320, 360);

  const nodes = [parent, childA, childB, childC];
  const edges = [
    buildEdge('e1', 'parent', 'child-a'),
    buildEdge('e2', 'parent', 'child-b'),
    buildEdge('e3', 'parent', 'child-c'),
  ];

  const first = spreadChildrenForParent('parent', nodes, edges);
  const second = spreadChildrenForParent('parent', first, edges);

  assert.deepEqual(second, first);
});

test('spreadChildrenForParent keeps layout unchanged for single child', () => {
  const parent = buildNode('parent', 300, 100);
  const childA = buildNode('child-a', 280, 260);

  const nodes = [parent, childA];
  const edges = [buildEdge('e1', 'parent', 'child-a')];

  const spread = spreadChildrenForParent('parent', nodes, edges);
  assert.deepEqual(spread, nodes);
});


test('spreadChildrenForParent keeps one child vertically centered under parent as anchor for odd clusters', () => {
  const parent = buildNode('parent', 320, 120);
  const childLeft = buildNode('child-left', 120, 360);
  const childCenter = buildNode('child-center', 320, 360);
  const childRight = buildNode('child-right', 520, 360);

  const nodes = [parent, childLeft, childCenter, childRight];
  const edges = [
    buildEdge('e1', 'parent', 'child-left'),
    buildEdge('e2', 'parent', 'child-center'),
    buildEdge('e3', 'parent', 'child-right'),
  ];

  const spread = spreadChildrenForParent('parent', nodes, edges);
  const centered = spread.find((node) => node.id === 'child-center');

  assert.ok(centered);
  assert.equal(centered?.position.x, parent.position.x);
});
