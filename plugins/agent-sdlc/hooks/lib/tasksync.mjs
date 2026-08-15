/**
 * Keeps GitHub task state in step with git activity.
 *
 * Recognises the git and gh commands that change a task's real status, extracts
 * the task id, and delegates the update to the tracker CLI so that issue writes
 * happen in exactly one place.
 *
 * @typedef {object} TaskEvent
 * @property {string} taskId
 * @property {'in progress' | 'in review' | 'done'} status
 * @property {string} trigger Human-readable reason, used in the nudge message.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { logDebug, logError } from './log.mjs';

const TASK_ID_PATTERN = /\bT-(\d{1,4})\b/i;
const CLI_TIMEOUT_MS = 15000;

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TRACKER_CLI = join(PLUGIN_ROOT, 'mcp', 'sdlc-tracker', 'src', 'cli.mjs');

/** @type {{ pattern: RegExp, status: TaskEvent['status'], trigger: string }[]} */
const COMMAND_RULES = [
  { pattern: /\bgh\s+pr\s+merge\b/, status: 'done', trigger: 'pull request merged' },
  { pattern: /\bgit\s+merge\b/, status: 'done', trigger: 'branch merged' },
  { pattern: /\bgh\s+pr\s+create\b/, status: 'in review', trigger: 'pull request opened' },
  { pattern: /\bgit\s+(commit|push)\b/, status: 'in progress', trigger: 'work committed' },
  { pattern: /\bgit\s+checkout\s+-b\b/, status: 'in progress', trigger: 'branch created' },
];

/**
 * @param {string} command The shell command that just ran.
 * @param {string} output Its terminal output, which often carries the task id.
 * @returns {TaskEvent | null}
 */
export const parseTaskEvent = (command, output) => {
  if (typeof command !== 'string' || command.length === 0) return null;

  const rule = COMMAND_RULES.find(({ pattern }) => pattern.test(command));
  if (!rule) return null;

  const match = TASK_ID_PATTERN.exec(command) ?? TASK_ID_PATTERN.exec(output ?? '');
  if (!match) {
    logDebug('task-relevant command with no task id, skipping', command);
    return null;
  }

  return {
    taskId: `T-${match[1].padStart(3, '0')}`,
    status: rule.status,
    trigger: rule.trigger,
  };
};

/**
 * @param {TaskEvent} event
 * @param {string} cwd Absolute working directory of the git command.
 * @returns {{ ok: boolean, detail: string }}
 */
export const applyTaskEvent = (event, cwd) => {
  const args = [TRACKER_CLI, 'task-update', '--id', event.taskId, '--status', event.status];
  const result = spawnSync(process.execPath, args, {
    cwd,
    timeout: CLI_TIMEOUT_MS,
    encoding: 'utf8',
  });

  if (result.error) {
    logError('tracker CLI failed to start', result.error.message);
    return { ok: false, detail: result.error.message };
  }
  if (result.status !== 0) {
    const detail = (result.stderr ?? '').trim() || `exit code ${result.status}`;
    logDebug('tracker CLI reported', detail);
    return { ok: false, detail };
  }

  return { ok: true, detail: (result.stdout ?? '').trim() };
};

export { TRACKER_CLI };
