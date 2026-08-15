import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGantt } from '../plugins/agent-sdlc/mcp/sdlc-tracker/src/gantt.mjs';

const START_DATE = '2026-09-01';

/** @param {object} overrides */
const task = (overrides) => ({
  taskId: 'T-001',
  title: 'Do the thing',
  phase: 'Setup',
  status: 'Todo',
  estimate: 4,
  dependsOn: [],
  ...overrides,
});

test('emits a valid gantt header', () => {
  const chart = renderGantt([task({})], { title: 'Plan', startDate: START_DATE, order: ['T-001'] });
  const lines = chart.split('\n');
  assert.equal(lines[0], 'gantt');
  assert.match(chart, /dateFormat YYYY-MM-DD/);
  assert.match(chart, /title Plan/);
});

test('anchors the first task on the start date', () => {
  const chart = renderGantt([task({})], { title: 'Plan', startDate: START_DATE, order: ['T-001'] });
  assert.match(chart, /Do the thing :T-001, 2026-09-01, 4h/);
});

test('anchors a dependent task after its dependency', () => {
  const tasks = [task({}), task({ taskId: 'T-002', title: 'Next thing', dependsOn: ['T-001'] })];
  const chart = renderGantt(tasks, { title: 'Plan', startDate: START_DATE, order: ['T-001', 'T-002'] });
  assert.match(chart, /Next thing :T-002, after T-001, 4h/);
});

test('creates one section per phase', () => {
  const tasks = [task({}), task({ taskId: 'T-002', phase: 'Build' })];
  const chart = renderGantt(tasks, { title: 'Plan', startDate: START_DATE, order: ['T-001', 'T-002'] });
  assert.match(chart, /section Setup/);
  assert.match(chart, /section Build/);
});

test('marks completed and active work', () => {
  const tasks = [
    task({ status: 'Done' }),
    task({ taskId: 'T-002', title: 'Ongoing', status: 'In Progress', dependsOn: ['T-001'] }),
  ];
  const chart = renderGantt(tasks, { title: 'Plan', startDate: START_DATE, order: ['T-001', 'T-002'] });
  assert.match(chart, /:done, T-001/);
  assert.match(chart, /:active, T-002/);
});

test('converts estimates over a working day into days', () => {
  const chart = renderGantt([task({ estimate: 12 })], {
    title: 'Plan',
    startDate: START_DATE,
    order: ['T-001'],
  });
  assert.match(chart, /2d/);
});

test('strips characters that would break mermaid parsing', () => {
  const chart = renderGantt([task({ title: 'Add: user #login' })], {
    title: 'Plan',
    startDate: START_DATE,
    order: ['T-001'],
  });
  assert.match(chart, /Add user login :T-001/);
  assert.equal(chart.split('\n').filter((line) => line.includes('T-001')).length, 1);
});

test('falls back to a minimum duration for a zero estimate', () => {
  const chart = renderGantt([task({ estimate: 0 })], {
    title: 'Plan',
    startDate: START_DATE,
    order: ['T-001'],
  });
  assert.match(chart, /1h/);
});
