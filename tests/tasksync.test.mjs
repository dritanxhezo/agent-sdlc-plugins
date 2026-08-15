import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskEvent } from '../plugins/agent-sdlc/hooks/lib/tasksync.mjs';

test('a merged pull request completes the task', () => {
  const event = parseTaskEvent('gh pr merge 42 --squash', 'Merged feat/T-007-add-login');
  assert.equal(event.taskId, 'T-007');
  assert.equal(event.status, 'done');
});

test('opening a pull request moves the task to review', () => {
  const event = parseTaskEvent('gh pr create --title "T-012 add validation"', '');
  assert.equal(event.taskId, 'T-012');
  assert.equal(event.status, 'in review');
});

test('a commit marks the task in progress', () => {
  const event = parseTaskEvent('git commit -m "feat: T-003 add parser"', '');
  assert.equal(event.taskId, 'T-003');
  assert.equal(event.status, 'in progress');
});

test('creating a branch marks the task in progress', () => {
  const event = parseTaskEvent('git checkout -b feat/T-9-thing', '');
  assert.equal(event.taskId, 'T-009');
  assert.equal(event.status, 'in progress');
});

test('pads task ids to three digits so they match issue titles', () => {
  assert.equal(parseTaskEvent('git commit -m "T-4 fix"', '').taskId, 'T-004');
  assert.equal(parseTaskEvent('git commit -m "T-1234 fix"', '').taskId, 'T-1234');
});

test('falls back to the command output for the task id', () => {
  const event = parseTaskEvent('gh pr merge', 'Merged pull request for T-021');
  assert.equal(event.taskId, 'T-021');
});

test('ignores task-relevant commands with no task id', () => {
  assert.equal(parseTaskEvent('git commit -m "tidy up"', ''), null);
});

test('ignores commands that do not change task state', () => {
  assert.equal(parseTaskEvent('git status', 'T-001'), null);
  assert.equal(parseTaskEvent('npm test', 'T-001'), null);
  assert.equal(parseTaskEvent('git log --oneline', 'T-001'), null);
});

test('ignores empty input', () => {
  assert.equal(parseTaskEvent('', ''), null);
  assert.equal(parseTaskEvent(undefined, undefined), null);
});
