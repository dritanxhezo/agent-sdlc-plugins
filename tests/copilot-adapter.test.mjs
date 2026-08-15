/**
 * The Copilot adapter's response shape is not interchangeable with Cursor's or
 * Claude Code's: a wrong key name is silently ignored by the client, so a gate
 * would appear to run while never blocking anything. These tests pin the shape.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADAPTER = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'plugins',
  'agent-sdlc',
  'hooks',
  'adapters',
  'copilot.mjs',
);

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SECRET_LINE = 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";';

/** @param {string} action @param {object} payload */
const run = (action, payload) => {
  const result = spawnSync(process.execPath, [ADAPTER, action], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, 'the adapter must always exit 0 so a crash cannot block a tool call');
  return JSON.parse(result.stdout);
};

test('denies a write containing a credential, with a reason', () => {
  const response = run('pre-write', {
    cwd: REPO_ROOT,
    toolName: 'create',
    toolArgs: { path: 'src/config.ts', content: SECRET_LINE },
  });

  assert.equal(response.permissionDecision, 'deny');
  assert.match(response.permissionDecisionReason, /credential/);
});

test('allows an ordinary write', () => {
  const response = run('pre-write', {
    cwd: REPO_ROOT,
    toolName: 'create',
    toolArgs: { path: 'src/add.ts', content: 'export const add = (a, b) => a + b;' },
  });

  assert.deepEqual(response, { permissionDecision: 'allow' });
});

test('reads toolArgs delivered as a JSON string', () => {
  const response = run('pre-write', {
    cwd: REPO_ROOT,
    toolName: 'edit',
    toolArgs: JSON.stringify({ path: 'src/config.ts', new_string: SECRET_LINE }),
  });

  assert.equal(response.permissionDecision, 'deny');
});

test('returns task-sync feedback as additionalContext, not as a decision', () => {
  const response = run('task-sync', {
    cwd: REPO_ROOT,
    toolName: 'bash',
    toolArgs: { command: 'git checkout -b feature/T-001-thing' },
    toolResult: { resultType: 'success', textResultForLlm: 'Switched to a new branch' },
  });

  assert.ok(response.additionalContext.includes('T-001'));
  assert.equal(response.permissionDecision, undefined);
});

test('fails open when the payload is unreadable', () => {
  const result = spawnSync(process.execPath, [ADAPTER, 'pre-write'], {
    input: 'not json at all',
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { permissionDecision: 'allow' });
});
