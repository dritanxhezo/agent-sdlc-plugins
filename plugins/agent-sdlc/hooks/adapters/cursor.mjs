#!/usr/bin/env node
/**
 * Cursor hook adapter.
 *
 * Usage: node cursor.mjs <action>
 * Translates Cursor's camelCase hook payloads into a HookContext and its
 * HookDecision back into Cursor's response shape.
 *
 * Response shapes per Cursor's hooks specification:
 *   sessionStart -> { additional_context }
 *   preToolUse   -> { permission, user_message, agent_message }
 *   postToolUse  -> { additional_context }
 */

import { runAction, ACTIONS } from '../lib/core.mjs';
import { readPayload, runAdapter, firstOf } from '../lib/io.mjs';
import { loadConfig } from '../lib/config.mjs';
import { registerTracker } from '../lib/cursormcp.mjs';
import { logDebug } from '../lib/log.mjs';

const FILE_PATH_KEYS = ['file_path', 'path', 'target_file', 'filePath'];
const CONTENT_KEYS = ['contents', 'content', 'new_string', 'text'];

/**
 * Cursor-only, so it lives here rather than in lib/core.mjs, which stays free of
 * anything client-specific.
 */
const MCP_REGISTER = 'mcp-register';

const ALLOW_RESPONSE = { permission: 'allow' };

/** @param {object} payload @returns {string} */
const resolveRoot = (payload) => {
  const roots = payload.workspace_roots;
  if (Array.isArray(roots) && typeof roots[0] === 'string') return roots[0];
  return payload.cwd ?? process.cwd();
};

/**
 * Cursor delivers edits either as tool input or, for afterFileEdit, as an edits
 * array. Both are flattened to a single content string for scanning.
 *
 * @param {object} payload
 */
const resolveContent = (payload) => {
  const fromInput = firstOf(payload.tool_input ?? {}, CONTENT_KEYS);
  if (fromInput) return fromInput;
  if (Array.isArray(payload.edits)) {
    return payload.edits.map((edit) => edit?.new_string ?? '').join('\n');
  }
  return '';
};

/** @param {object} payload */
const resolveShellCommand = (payload) =>
  firstOf(payload.tool_input ?? {}, ['command']) ?? payload.command ?? '';

/** @param {object} payload */
const resolveShellOutput = (payload) => {
  if (typeof payload.output === 'string') return payload.output;
  if (typeof payload.tool_output === 'string') return payload.tool_output;
  return '';
};

const buildContext = (action, payload) => ({
  action,
  root: resolveRoot(payload),
  filePath: firstOf(payload.tool_input ?? {}, FILE_PATH_KEYS) ?? firstOf(payload, FILE_PATH_KEYS),
  content: resolveContent(payload),
  command: resolveShellCommand(payload),
  output: resolveShellOutput(payload),
  cwd: payload.cwd ?? resolveRoot(payload),
});

/** @param {string} action @param {import('../lib/core.mjs').HookDecision} decision */
const toCursorResponse = (action, decision) => {
  if (action === ACTIONS.PRE_WRITE) {
    if (decision.decision === 'deny') {
      return {
        permission: 'deny',
        user_message: 'Blocked by the agent-sdlc plugin.',
        agent_message: decision.message,
      };
    }
    return ALLOW_RESPONSE;
  }
  return decision.context ? { additional_context: decision.context } : {};
};

/**
 * Keeps the tracker's entry in the user's own MCP config pointing at this copy of
 * the plugin, and returns what the user needs to be told, if anything.
 *
 * Cursor does not reload `mcp.json` by itself, so a newly written entry only takes
 * effect on the next window reload. The session context is the only place that can
 * say so: `workspaceOpen` accepts no message back.
 *
 * @param {string} root Absolute workspace root, for the project's own config.
 * @returns {string}
 */
const ensureTrackerRegistered = (root) => {
  if (!loadConfig(root).registerCursorMcp) return '';

  const result = registerTracker();
  if (!result.changed) {
    logDebug('tracker registration:', result.reason);
    return '';
  }

  return (
    `The \`sdlc-tracker\` MCP server was just registered in your Cursor MCP config ` +
    `(${result.reason}). Cursor does not reload that file on its own, so run ` +
    `"Developer: Reload Window" before using the tracker tools.`
  );
};

await runAdapter(async () => {
  const action = process.argv[2] ?? '';
  const payload = await readPayload();

  if (action === MCP_REGISTER) {
    ensureTrackerRegistered(resolveRoot(payload));
    return {};
  }

  const response = toCursorResponse(action, runAction(buildContext(action, payload)));
  if (action !== ACTIONS.SESSION_CONTEXT) return response;

  const notice = ensureTrackerRegistered(resolveRoot(payload));
  if (!notice) return response;

  const existing = response.additional_context;
  return { additional_context: existing ? `${notice}\n\n${existing}` : notice };
}, ALLOW_RESPONSE);
