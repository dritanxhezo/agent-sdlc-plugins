#!/usr/bin/env node
/**
 * GitHub Copilot hook adapter.
 *
 * Usage: node copilot.mjs <action>
 * Translates Copilot's camelCase hook payloads into an IHookContext and its
 * IHookDecision back into Copilot's response shape.
 *
 * Response shapes per Copilot's hooks reference:
 *   sessionStart -> { additionalContext }
 *   preToolUse   -> { permissionDecision, permissionDecisionReason }
 *   postToolUse  -> { additionalContext }
 *
 * Copilot fails a preToolUse command hook closed on a non-zero exit, so the
 * shared runAdapter wrapper matters more here than elsewhere: it always exits 0
 * and emits an allow, keeping a broken gate from blocking every edit.
 */

import { runAction, ACTIONS } from '../lib/core.mjs';
import { readPayload, runAdapter, firstOf } from '../lib/io.mjs';

const FILE_PATH_KEYS = ['path', 'file_path', 'filePath', 'target_file'];

/**
 * `file_text` is what Copilot's own `create` tool sends, and `new_str` is the
 * str_replace_editor convention its edit tools follow. Getting this list wrong
 * fails silently: the gate sees empty content, finds nothing and allows the write.
 */
const CONTENT_KEYS = [
  'file_text',
  'fileText',
  'content',
  'contents',
  'new_str',
  'newStr',
  'new_string',
  'newString',
  'text',
];

const ALLOW_RESPONSE = { permissionDecision: 'allow' };

/**
 * toolArgs is typed as unknown and some tools deliver it as a JSON string, so it
 * is normalised to an object before any field is read.
 *
 * @param {object} payload
 */
const resolveToolArgs = (payload) => {
  const args = payload.toolArgs ?? payload.tool_input;
  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return args !== null && typeof args === 'object' ? args : {};
};

/** @param {object} payload */
const resolveOutput = (payload) =>
  payload.toolResult?.textResultForLlm ?? payload.tool_result?.text_result_for_llm ?? '';

/** @param {string} action @param {object} payload */
const buildContext = (action, payload) => {
  const args = resolveToolArgs(payload);
  const root = payload.cwd ?? process.cwd();
  return {
    action,
    root,
    filePath: firstOf(args, FILE_PATH_KEYS),
    content: firstOf(args, CONTENT_KEYS) ?? '',
    command: firstOf(args, ['command']) ?? '',
    output: resolveOutput(payload),
    cwd: root,
  };
};

/** @param {string} action @param {import('../lib/core.mjs').IHookDecision} decision */
const toCopilotResponse = (action, decision) => {
  if (action === ACTIONS.PRE_WRITE) {
    if (decision.decision === 'deny') {
      return { permissionDecision: 'deny', permissionDecisionReason: decision.message };
    }
    return ALLOW_RESPONSE;
  }
  return decision.context ? { additionalContext: decision.context } : {};
};

await runAdapter(async () => {
  const action = process.argv[2] ?? '';
  const payload = await readPayload();
  const decision = runAction(buildContext(action, payload));
  return toCopilotResponse(action, decision);
}, ALLOW_RESPONSE);
