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

const AGENT_PLUGINS_TARGET = join(PLUGIN_DIR, 'mcp.json');
const CLAUDE_TARGET = join(PLUGIN_DIR, '.mcp.json');
const CURSOR_TARGET = join(PLUGIN_DIR, '.cursor-plugin', 'mcp.json');

const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
const CURSOR_PLUGIN_ROOT = '${PLUGIN_ROOT}';
const CLAUDE_PLUGIN_ROOT = '${CLAUDE_PLUGIN_ROOT}';

const GENERATED_NOTICE = 'Generated from mcp.source.json by scripts/build-manifests.mjs. Do not edit.';

/**
 * The plugin's own directory reaches the server through `args`, never through `cwd`.
 *
 * Cursor interpolates `command`, `args`, `env`, `url` and `headers`; `cwd` is not on
 * that list, so a `cwd` of "${PLUGIN_ROOT}" arrived at spawn as a literal path and
 * failed as `spawn node ENOENT` - which is the error for a missing working directory,
 * not for a missing node, and reads as though the client cannot find node at all.
 *
 * Leaving `cwd` unset is also what the tracker wants: it resolves the repository to
 * act on from its own working directory, so inheriting the workspace is correct and
 * the plugin directory would not even be a git repository.
 *
 * @param {string} rootToken The client's placeholder for the plugin's own directory.
 * @returns {(definition: object) => object}
 */
const toServer = (rootToken) => (definition) => {
  const { description, pluginRelativeArgs, ...rest } = definition;
  const server = { ...rest };
  if (pluginRelativeArgs) server.args = pluginRelativeArgs.map((arg) => `${rootToken}/${arg}`);
  return server;
};

/** @param {(definition: object) => object} mapper @param {object} servers */
const buildConfig = (mapper, servers, extras = {}) => {
  const mcpServers = {};
  for (const [name, definition] of Object.entries(servers)) {
    mcpServers[name] = mapper(definition);
  }
  return { ...extras, mcpServers };
};

const serialise = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** Line endings vary by checkout, so --check compares content, not bytes. */
const normalise = (text) => text.replace(/\r\n/g, '\n');

const main = () => {
  const source = JSON.parse(readFileSync(SOURCE_FILE, 'utf8'));
  const servers = source.servers ?? {};

  // Cursor loads MCP servers by two independent routes, and they do not agree. The
  // Agent Plugins route reads the root mcp.json and expands ${PLUGIN_ROOT}. The Cursor
  // plugin route, through .cursor-plugin/plugin.json, does not: it interpolates only
  // ${env:...}, ${userHome} and the workspace tokens, leaving ${PLUGIN_ROOT} literal
  // and resolving what is left against the user's home directory.
  //
  // So anything needing the plugin's own path must reach Cursor by the first route
  // only, and the file named by the Cursor manifest carries just the servers that name
  // no path at all.
  const pathlessServers = Object.fromEntries(
    Object.entries(servers).filter(([, definition]) => !definition.pluginRelativeArgs),
  );

  const outputs = [
    // No generated-notice key on the Agent Plugins document: its schema closes the
    // file to $schema and mcpServers, and a client enforcing that disables MCP for
    // the whole plugin over one extra key. The $schema line and CI's `--check` cover
    // it instead.
    {
      path: AGENT_PLUGINS_TARGET,
      body: serialise(buildConfig(toServer(CURSOR_PLUGIN_ROOT), servers, { $schema: AGENT_PLUGINS_SCHEMA })),
    },
    {
      path: CLAUDE_TARGET,
      body: serialise(buildConfig(toServer(CLAUDE_PLUGIN_ROOT), servers, { _generated: GENERATED_NOTICE })),
    },
    { path: CURSOR_TARGET, body: serialise(buildConfig(toServer(CURSOR_PLUGIN_ROOT), pathlessServers)) },
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
