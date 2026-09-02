/**
 * On Windows, Cursor delivers workspace_roots in URI-path form ('/f:/Repo').
 * Resolving that verbatim makes the config lookup miss sdlc.config.json, so every
 * gate silently runs on defaults - which turns a project that configured
 * `secrets: "warn"` back into a blocking one. These tests pin that the root is
 * normalised and the project's own config is honoured.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ADAPTER = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'plugins',
  'agent-sdlc',
  'hooks',
  'adapters',
  'cursor.mjs',
);

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

/** Cursor's wire form of a root: URI-path style on Windows, the plain path elsewhere. */
const toCursorWireRoot = (root) => (/^[a-zA-Z]:/.test(root) ? '/' + root.replace(/\\/g, '/') : root);

/** @param {string} root @param {string} contents */
const preWritePayload = (root, contents) => ({
  hook_event_name: 'preToolUse',
  workspace_roots: [toCursorWireRoot(root)],
  tool_name: 'Write',
  tool_input: { file_path: join(root, 'src', 'config.ts'), contents },
});

test('denies a credential write under the default config', () => {
  const root = mkdtempSync(join(tmpdir(), 'sdlc-cursor-root-'));
  try {
    const response = run('pre-write', preWritePayload(root, SECRET_LINE));

    assert.equal(response.permission, 'deny');
    assert.match(response.agent_message, /credential/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('honours sdlc.config.json when the root arrives in URI-path form', () => {
  const root = mkdtempSync(join(tmpdir(), 'sdlc-cursor-root-'));
  try {
    writeFileSync(join(root, 'sdlc.config.json'), JSON.stringify({ gates: { secrets: 'warn' } }));

    const response = run('pre-write', preWritePayload(root, SECRET_LINE));

    assert.equal(response.permission, 'allow');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
