/**
 * The single implementation of every hook behaviour.
 *
 * Client adapters normalise their payload into a HookContext, call runAction,
 * and translate the returned HookDecision back into their own response shape.
 * Nothing client-specific belongs in this file.
 *
 * @typedef {object} HookContext
 * @property {string} action   One of ACTIONS.
 * @property {string} root     Absolute workspace root.
 * @property {string} [filePath]
 * @property {string} [content]
 * @property {string} [command]
 * @property {string} [output]
 * @property {string} [cwd]
 *
 * @typedef {object} HookDecision
 * @property {'allow' | 'deny'} decision
 * @property {string} [message]  Explanation and remedy, addressed to the agent.
 * @property {string} [context]  Extra context to inject into the conversation.
 */

import { loadConfig } from './config.mjs';
import { runGates } from './gates.mjs';
import { scanForSecrets } from './secrets.mjs';
import { buildSessionContext } from './session.mjs';
import { parseTaskEvent, applyTaskEvent } from './tasksync.mjs';
import { logDebug } from './log.mjs';

const ACTIONS = Object.freeze({
  SESSION_CONTEXT: 'session-context',
  PRE_WRITE: 'pre-write',
  POST_WRITE: 'post-write',
  TASK_SYNC: 'task-sync',
});

const ALLOW = Object.freeze({ decision: 'allow' });

/** @param {HookContext} ctx @param {import('./config.mjs').SdlcConfig} config */
const handleSessionContext = (ctx, config) => {
  const context = buildSessionContext(ctx.root, config);
  return context ? { decision: 'allow', context } : ALLOW;
};

/**
 * Blocking checks. Secrets always block; the spec and TDD gates only block when
 * explicitly configured to, which is not the default.
 *
 * @param {HookContext} ctx
 * @param {import('./config.mjs').SdlcConfig} config
 * @returns {HookDecision}
 */
const handlePreWrite = (ctx, config) => {
  if (!ctx.filePath) return ALLOW;

  if (config.gates.secrets === 'block') {
    const findings = scanForSecrets(ctx.content ?? '');
    if (findings.length > 0) {
      const detail = findings.map((f) => `${f.label} on line ${f.line}`).join('; ');
      return {
        decision: 'deny',
        message:
          `This write appears to contain a credential (${detail}). Move the value to an ` +
          `environment variable or secret store and reference it instead. If this is a false ` +
          `positive, rename the identifier or add a placeholder marker such as <example>.`,
      };
    }
  }

  const blocking = runGates(ctx.filePath, ctx.root, config, 'block');
  if (blocking.length > 0) {
    return { decision: 'deny', message: blocking.map((f) => f.message).join('\n\n') };
  }

  return ALLOW;
};

/**
 * Advisory checks. These run after the write succeeded and only ever nudge,
 * which is what makes the gates soft.
 *
 * @param {HookContext} ctx
 * @param {import('./config.mjs').SdlcConfig} config
 * @returns {HookDecision}
 */
const handlePostWrite = (ctx, config) => {
  if (!ctx.filePath) return ALLOW;

  const warnings = runGates(ctx.filePath, ctx.root, config, 'warn');
  if (warnings.length === 0) return ALLOW;

  return {
    decision: 'allow',
    context: `SDLC gate reminder:\n\n${warnings.map((f) => `- ${f.message}`).join('\n')}`,
  };
};

/** @param {HookContext} ctx @returns {HookDecision} */
const handleTaskSync = (ctx) => {
  const event = parseTaskEvent(ctx.command ?? '', ctx.output ?? '');
  if (!event) return ALLOW;

  const result = applyTaskEvent(event, ctx.cwd ?? ctx.root);
  if (!result.ok) {
    return {
      decision: 'allow',
      context:
        `Task ${event.taskId} could not be updated automatically after ${event.trigger} ` +
        `(${result.detail}). Update it with the sdlc-tracker task_update tool.`,
    };
  }

  return {
    decision: 'allow',
    context: `Task ${event.taskId} set to "${event.status}" after ${event.trigger}.`,
  };
};

/**
 * @param {HookContext} ctx
 * @returns {HookDecision}
 */
export const runAction = (ctx) => {
  const config = loadConfig(ctx.root);
  logDebug('action', ctx.action, 'file', ctx.filePath ?? '-');

  switch (ctx.action) {
    case ACTIONS.SESSION_CONTEXT:
      return handleSessionContext(ctx, config);
    case ACTIONS.PRE_WRITE:
      return handlePreWrite(ctx, config);
    case ACTIONS.POST_WRITE:
      return handlePostWrite(ctx, config);
    case ACTIONS.TASK_SYNC:
      return handleTaskSync(ctx);
    default:
      logDebug('unknown action, allowing', ctx.action);
      return ALLOW;
  }
};

export { ACTIONS };
