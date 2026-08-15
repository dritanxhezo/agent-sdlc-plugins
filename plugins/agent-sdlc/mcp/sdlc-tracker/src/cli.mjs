#!/usr/bin/env node
/**
 * Command line entry point for the tracker.
 *
 * The task-sync hook needs to update a task without an MCP session, and being
 * able to run any tool from a terminal makes the server debuggable.
 *
 * Usage:
 *   node cli.mjs <tool-name> [--key value ...]
 *   node cli.mjs task-update --id T-001 --status "In Review"
 *   node cli.mjs list-tools
 */

import { TOOLS, callTool } from './tools.mjs';

const TOOL_ALIASES = {
  'task-update': 'task_update',
  'task-list': 'task_list',
  'plan-sync': 'plan_sync',
  'plan-status': 'plan_status',
  'dependency-graph': 'dependency_graph',
  'render-gantt': 'render_gantt',
  'tracker-init': 'tracker_init',
};

const NUMERIC_FLAGS = new Set(['estimate']);
const LIST_FLAGS = new Set(['dependsOn', 'traces']);

/** @param {string[]} argv @returns {Record<string, unknown>} */
const parseFlags = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    if (NUMERIC_FLAGS.has(key)) args[key] = Number(next);
    else if (LIST_FLAGS.has(key)) args[key] = next.split(',').map((part) => part.trim());
    else args[key] = next;

    index += 1;
  }
  return args;
};

const main = () => {
  const [rawName, ...rest] = process.argv.slice(2);

  if (!rawName || rawName === 'list-tools' || rawName === '--help') {
    process.stdout.write(
      ['Available tools:', ...TOOLS.map((tool) => `  ${tool.name}`)].join('\n') + '\n',
    );
    return 0;
  }

  const name = TOOL_ALIASES[rawName] ?? rawName;
  const result = callTool(name, parseFlags(rest));
  const text = result.content.map((part) => part.text).join('\n');

  if (result.isError) {
    process.stderr.write(`${text}\n`);
    return 1;
  }

  process.stdout.write(`${text}\n`);
  return 0;
};

process.exit(main());
