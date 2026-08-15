#!/usr/bin/env node
/**
 * Claude Code hook adapter.
 *
 * Usage: node claude.mjs <action>
 * Translates Claude's PascalCase hook payloads into an IHookContext and its
 * IHookDecision back into Claude's hookSpecificOutput shape.
 */

import { runAction, ACTIONS } from '../lib/core.mjs';
import { readPayload, runAdapter, firstOf } from '../lib/io.mjs';

const FILE_PATH_KEYS = ['file_path', 'path', 'notebook_path'];
const CONTENT_KEYS = ['content', 'new_string', 'new_source'];
const PROJECT_DIR_ENV_VAR = 'CLAUDE_PROJECT_DIR';

const EVENT_BY_ACTION = {
  [ACTIONS.SESSION_CONTEXT]: 'SessionStart',
  [ACTIONS.PRE_WRITE]: 'PreToolUse',
  [ACTIONS.POST_WRITE]: 'PostToolUse',
  [ACTIONS.TASK_SYNC]: 'PostToolUse',
};

const EMPTY_RESPONSE = {};

/** @param {object} payload */
const resolveRoot = (payload) => payload.cwd ?? process.env[PROJECT_DIR_ENV_VAR] ?? process.cwd();

/**
 * Claude's Edit tool carries the replacement text, MultiEdit carries an array of
 * them. Both are flattened so the secret scanner sees everything being written.
 *
 * @param {object} toolInput
 */
const resolveContent = (toolInput) => {
  const direct = firstOf(toolInput, CONTENT_KEYS);
  if (direct) return direct;
  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map((edit) => edit?.new_string ?? '').join('\n');
  }
  return '';
};

/** @param {object} payload */
const resolveOutput = (payload) => {
  const response = payload.tool_response;
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object') return JSON.stringify(response);
  return '';
};

const buildContext = (action, payload) => {
  const toolInput = payload.tool_input ?? {};
  return {
    action,
    root: resolveRoot(payload),
    filePath: firstOf(toolInput, FILE_PATH_KEYS),
    content: resolveContent(toolInput),
    command: firstOf(toolInput, ['command']) ?? '',
    output: resolveOutput(payload),
    cwd: resolveRoot(payload),
  };
};

/** @param {string} action @param {import('../lib/core.mjs').IHookDecision} decision */
const toClaudeResponse = (action, decision) => {
  const hookEventName = EVENT_BY_ACTION[action] ?? 'PostToolUse';

  if (action === ACTIONS.PRE_WRITE && decision.decision === 'deny') {
    return {
      hookSpecificOutput: {
        hookEventName,
        permissionDecision: 'deny',
        permissionDecisionReason: decision.message,
      },
    };
  }

  if (decision.context) {
    return { hookSpecificOutput: { hookEventName, additionalContext: decision.context } };
  }

  return EMPTY_RESPONSE;
};

await runAdapter(async () => {
  const action = process.argv[2] ?? '';
  const payload = await readPayload();
  const decision = runAction(buildContext(action, payload));
  return toClaudeResponse(action, decision);
}, EMPTY_RESPONSE);
