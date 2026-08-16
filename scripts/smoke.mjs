#!/usr/bin/env node
/**
 * End-to-end smoke test for the wire protocols.
 *
 * The unit tests cover the logic; this covers the parts that only fail in
 * integration - the MCP JSON-RPC handshake and the three hook adapters' payload
 * translation. A silent failure in either is invisible until a user hits it.
 */

import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_ROOT = join(REPO_ROOT, 'plugins', 'agent-sdlc');
const SERVER = join(PLUGIN_ROOT, 'mcp', 'sdlc-tracker', 'src', 'index.mjs');
const CURSOR_ADAPTER = join(PLUGIN_ROOT, 'hooks', 'adapters', 'cursor.mjs');
const CLAUDE_ADAPTER = join(PLUGIN_ROOT, 'hooks', 'adapters', 'claude.mjs');
const COPILOT_ADAPTER = join(PLUGIN_ROOT, 'hooks', 'adapters', 'copilot.mjs');

const EXPECTED_TOOLS = [
  'tracker_init', 'plan_sync', 'task_list', 'task_update',
  'dependency_graph', 'render_gantt', 'plan_status',
];

/**
 * Assembled at runtime rather than written out, so this file holds no token-shaped
 * literal. The gate it exercises reads the whole resulting file on every write, so a
 * literal here would deny all later edits to this file - and would equally trip
 * GitHub's own push protection.
 */
const LEAKED_SECRET = `const t = "${['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_')}";`;

const failures = [];

/** @param {string} label @param {boolean} condition @param {string} [detail] */
const check = (label, condition, detail = '') => {
  if (condition) {
    process.stdout.write(`  ok    ${label}\n`);
    return;
  }
  process.stdout.write(`  FAIL  ${label}${detail ? ` - ${detail}` : ''}\n`);
  failures.push(label);
};

/** @param {string} script @param {string[]} args @param {object} payload */
const runWithPayload = (script, args, payload) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 20000,
  });
  return { stdout: (result.stdout ?? '').trim(), status: result.status };
};

process.stdout.write('MCP server handshake\n');
{
  const requests = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'ping' },
  ];

  const result = spawnSync(process.execPath, [SERVER], {
    input: `${requests.map((request) => JSON.stringify(request)).join('\n')}\n`,
    encoding: 'utf8',
    timeout: 20000,
  });

  const responses = (result.stdout ?? '')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const initialize = responses.find((response) => response.id === 1);
  const toolsList = responses.find((response) => response.id === 2);
  const ping = responses.find((response) => response.id === 3);

  check('responds to initialize', Boolean(initialize?.result?.serverInfo?.name));
  check('declares tool capability', Boolean(initialize?.result?.capabilities?.tools));
  check('ignores the initialized notification', responses.every((r) => r.id !== undefined));
  check('answers ping', ping?.result !== undefined);

  const names = (toolsList?.result?.tools ?? []).map((tool) => tool.name);
  check(`lists all ${EXPECTED_TOOLS.length} tools`, EXPECTED_TOOLS.every((name) => names.includes(name)),
    `got: ${names.join(', ')}`);

  const described = (toolsList?.result?.tools ?? []).every(
    (tool) => typeof tool.description === 'string' && tool.description.length > 30 && tool.inputSchema,
  );
  check('every tool has a description and input schema', described);
}

process.stdout.write('\nCursor hook adapter\n');
{
  const deny = runWithPayload(CURSOR_ADAPTER, ['pre-write'], {
    hook_event_name: 'preToolUse',
    workspace_roots: [REPO_ROOT],
    tool_name: 'Write',
    tool_input: { file_path: join(REPO_ROOT, 'src', 'leak.ts'), contents: LEAKED_SECRET },
  });
  const denyBody = JSON.parse(deny.stdout || '{}');
  check('blocks a credential write', denyBody.permission === 'deny', deny.stdout);
  check('explains the block to the agent', /credential/i.test(denyBody.agent_message ?? ''));
  check('exits zero even when denying', deny.status === 0);

  const allow = runWithPayload(CURSOR_ADAPTER, ['pre-write'], {
    hook_event_name: 'preToolUse',
    workspace_roots: [REPO_ROOT],
    tool_name: 'Write',
    tool_input: { file_path: join(REPO_ROOT, 'docs', 'notes.md'), contents: '# notes' },
  });
  check('allows an ordinary write', JSON.parse(allow.stdout || '{}').permission === 'allow', allow.stdout);

  const session = runWithPayload(CURSOR_ADAPTER, ['session-context'], {
    hook_event_name: 'sessionStart',
    workspace_roots: [REPO_ROOT],
    session_id: 'smoke',
  });
  check('returns valid JSON for session start', session.status === 0 && session.stdout.startsWith('{'));

  const malformed = spawnSync(process.execPath, [CURSOR_ADAPTER, 'pre-write'], {
    input: 'not json at all',
    encoding: 'utf8',
    timeout: 20000,
  });
  check('fails open on a malformed payload',
    malformed.status === 0 && JSON.parse((malformed.stdout ?? '{}').trim()).permission === 'allow');
}

process.stdout.write('\nClaude hook adapter\n');
{
  const deny = runWithPayload(CLAUDE_ADAPTER, ['pre-write'], {
    hook_event_name: 'PreToolUse',
    cwd: REPO_ROOT,
    tool_name: 'Write',
    tool_input: { file_path: join(REPO_ROOT, 'src', 'leak.ts'), content: LEAKED_SECRET },
  });
  const denyBody = JSON.parse(deny.stdout || '{}');
  check('blocks a credential write',
    denyBody.hookSpecificOutput?.permissionDecision === 'deny', deny.stdout);
  check('uses the PreToolUse event name',
    denyBody.hookSpecificOutput?.hookEventName === 'PreToolUse');
  check('gives a decision reason',
    /credential/i.test(denyBody.hookSpecificOutput?.permissionDecisionReason ?? ''));

  const multiEdit = runWithPayload(CLAUDE_ADAPTER, ['pre-write'], {
    hook_event_name: 'PreToolUse',
    cwd: REPO_ROOT,
    tool_name: 'MultiEdit',
    tool_input: {
      file_path: join(REPO_ROOT, 'src', 'leak.ts'),
      edits: [{ old_string: 'x', new_string: LEAKED_SECRET }],
    },
  });
  check('scans MultiEdit replacement text',
    JSON.parse(multiEdit.stdout || '{}').hookSpecificOutput?.permissionDecision === 'deny',
    multiEdit.stdout);

  const allow = runWithPayload(CLAUDE_ADAPTER, ['pre-write'], {
    hook_event_name: 'PreToolUse',
    cwd: REPO_ROOT,
    tool_name: 'Write',
    tool_input: { file_path: join(REPO_ROOT, 'docs', 'notes.md'), content: '# notes' },
  });
  check('allows an ordinary write', allow.stdout === '{}' || !allow.stdout.includes('deny'), allow.stdout);
}

process.stdout.write('\nCopilot hook adapter\n');
{
  const deny = runWithPayload(COPILOT_ADAPTER, ['pre-write'], {
    cwd: REPO_ROOT,
    toolName: 'create',
    toolArgs: { path: join(REPO_ROOT, 'src', 'leak.ts'), content: LEAKED_SECRET },
  });
  const denyBody = JSON.parse(deny.stdout || '{}');
  check('blocks a credential write', denyBody.permissionDecision === 'deny', deny.stdout);
  check('gives a decision reason', /credential/i.test(denyBody.permissionDecisionReason ?? ''));

  const allow = runWithPayload(COPILOT_ADAPTER, ['pre-write'], {
    cwd: REPO_ROOT,
    toolName: 'create',
    toolArgs: { path: join(REPO_ROOT, 'docs', 'notes.md'), content: '# notes' },
  });
  check('allows an ordinary write',
    JSON.parse(allow.stdout || '{}').permissionDecision === 'allow', allow.stdout);

  const postWrite = runWithPayload(COPILOT_ADAPTER, ['task-sync'], {
    cwd: REPO_ROOT,
    toolName: 'bash',
    toolArgs: { command: 'git checkout -b feature/T-001-thing' },
    toolResult: { resultType: 'success', textResultForLlm: 'Switched to a new branch' },
  });
  check('reports task sync as additionalContext',
    typeof JSON.parse(postWrite.stdout || '{}').additionalContext === 'string', postWrite.stdout);
}

process.stdout.write('\nTracker CLI\n');
{
  const result = spawnSync(process.execPath, [join(PLUGIN_ROOT, 'mcp', 'sdlc-tracker', 'src', 'cli.mjs'), 'list-tools'], {
    encoding: 'utf8',
    timeout: 20000,
  });
  check('lists tools from the command line',
    result.status === 0 && EXPECTED_TOOLS.every((name) => (result.stdout ?? '').includes(name)));
}

process.stdout.write(
  failures.length === 0
    ? '\nAll smoke checks passed.\n'
    : `\n${failures.length} smoke check(s) failed.\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
