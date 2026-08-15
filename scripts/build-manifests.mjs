#!/usr/bin/env node
/**
 * Generates the per-client MCP config files from mcp.source.json.
 *
 * Cursor and the Agent Plugins standard read mcp.json; Claude Code reads
 * .mcp.json, and each resolves the plugin's own directory with a different
 * placeholder. Generating both from one source is what stops them drifting.
 *
 * Run with --check to verify the committed files match, which is what CI does.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_DIR = join(REPO_ROOT, 'plugins', 'agent-sdlc');
const SOURCE_FILE = join(PLUGIN_DIR, 'mcp.source.json');

const CURSOR_TARGET = join(PLUGIN_DIR, 'mcp.json');
const CLAUDE_TARGET = join(PLUGIN_DIR, '.mcp.json');

const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
const CURSOR_PLUGIN_ROOT = '${PLUGIN_ROOT}';
const CLAUDE_PLUGIN_ROOT = '${CLAUDE_PLUGIN_ROOT}';

const GENERATED_NOTICE = 'Generated from mcp.source.json by scripts/build-manifests.mjs. Do not edit.';

/** @param {object} definition @returns {object} */
const toCursorServer = (definition) => {
  const { description, pluginRelativeArgs, ...rest } = definition;
  const server = { ...rest };
  if (pluginRelativeArgs) {
    server.args = pluginRelativeArgs;
    server.cwd = CURSOR_PLUGIN_ROOT;
  }
  return server;
};

/** @param {object} definition @returns {object} */
const toClaudeServer = (definition) => {
  const { description, pluginRelativeArgs, ...rest } = definition;
  const server = { ...rest };
  if (pluginRelativeArgs) {
    server.args = pluginRelativeArgs.map((arg) => `${CLAUDE_PLUGIN_ROOT}/${arg}`);
  }
  return server;
};

/** @param {(definition: object) => object} mapper @param {object} servers */
const buildConfig = (mapper, servers, extras = {}) => {
  const mcpServers = {};
  for (const [name, definition] of Object.entries(servers)) {
    mcpServers[name] = mapper(definition);
  }
  return { ...extras, _generated: GENERATED_NOTICE, mcpServers };
};

const serialise = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** Line endings vary by checkout, so --check compares content, not bytes. */
const normalise = (text) => text.replace(/\r\n/g, '\n');

const main = () => {
  const source = JSON.parse(readFileSync(SOURCE_FILE, 'utf8'));
  const servers = source.servers ?? {};

  const outputs = [
    { path: CURSOR_TARGET, body: serialise(buildConfig(toCursorServer, servers, { $schema: AGENT_PLUGINS_SCHEMA })) },
    { path: CLAUDE_TARGET, body: serialise(buildConfig(toClaudeServer, servers)) },
  ];

  const isCheck = process.argv.includes('--check');
  const stale = [];

  for (const { path, body } of outputs) {
    if (isCheck) {
      let current = '';
      try {
        current = readFileSync(path, 'utf8');
      } catch {
        current = '';
      }
      if (normalise(current) !== normalise(body)) stale.push(path);
      continue;
    }
    writeFileSync(path, body, 'utf8');
    process.stdout.write(`wrote ${path}\n`);
  }

  if (stale.length > 0) {
    process.stderr.write(
      `MCP config out of date:\n${stale.map((path) => `  ${path}`).join('\n')}\n` +
        'Run `npm run build` and commit the result.\n',
    );
    return 1;
  }

  return 0;
};

process.exit(main());
