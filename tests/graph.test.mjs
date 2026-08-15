import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, parseDependsOn } from '../plugins/agent-sdlc/mcp/sdlc-tracker/src/graph.mjs';

/** @param {string} taskId @param {number} estimate @param {string[]} dependsOn */
const task = (taskId, estimate, dependsOn = []) => ({
  taskId,
  title: `Task ${taskId}`,
  phase: 'Build',
  status: 'Todo',
  estimate,
  dependsOn,
});

test('parses a dependency list', () => {
  assert.deepEqual(parseDependsOn('T-001, t-002; T-003'), ['T-001', 'T-002', 'T-003']);
});

test('discards malformed dependency entries', () => {
  assert.deepEqual(parseDependsOn('T-001, nonsense, , T-2'), ['T-001', 'T-2']);
  assert.deepEqual(parseDependsOn(undefined), []);
});

test('orders tasks so dependencies come first', () => {
  const { order, cycles } = buildGraph([
    task('T-003', 1, ['T-002']),
    task('T-001', 1),
    task('T-002', 1, ['T-001']),
  ]);
  assert.deepEqual(order, ['T-001', 'T-002', 'T-003']);
  assert.deepEqual(cycles, []);
});

test('detects a dependency cycle instead of dropping the tasks', () => {
  const { order, cycles } = buildGraph([
    task('T-001', 1, ['T-002']),
    task('T-002', 1, ['T-001']),
  ]);
  assert.deepEqual(order, []);
  assert.equal(cycles.length, 1);
  assert.deepEqual(cycles[0].sort(), ['T-001', 'T-002']);
});

test('reports dependencies on unknown tasks', () => {
  const { missing, order } = buildGraph([task('T-001', 1, ['T-099'])]);
  assert.deepEqual(missing, ['T-099']);
  assert.deepEqual(order, ['T-001']);
});

test('computes the critical path by summed estimate', () => {
  const { criticalPath, criticalHours } = buildGraph([
    task('T-001', 2),
    task('T-002', 5, ['T-001']),
    task('T-003', 1, ['T-001']),
    task('T-004', 3, ['T-002', 'T-003']),
  ]);
  assert.deepEqual(criticalPath, ['T-001', 'T-002', 'T-004']);
  assert.equal(criticalHours, 10);
});

test('handles an empty task list', () => {
  const result = buildGraph([]);
  assert.deepEqual(result.order, []);
  assert.deepEqual(result.criticalPath, []);
  assert.equal(result.criticalHours, 0);
});

test('handles parallel work with no dependencies', () => {
  const { order, criticalHours } = buildGraph([task('T-001', 4), task('T-002', 7)]);
  assert.equal(order.length, 2);
  assert.equal(criticalHours, 7);
});
