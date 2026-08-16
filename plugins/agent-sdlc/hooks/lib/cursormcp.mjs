/**
 * Points Cursor at the bundled tracker by writing an absolute path into the user's
 * own MCP config.
 *
 * Cursor cannot start an MCP server that lives inside a plugin. It expands no
 * plugin-root placeholder in `mcp.json`, injects no `PLUGIN_ROOT` into the server
 * process, and resolves a relative argument against the user's home directory, so
 * nothing a marketplace install can write in its own config names a file inside
 * itself. Hooks are the exception: Cursor runs them from the plugin root, so a hook
 * is the one place that knows where the plugin actually is.
 *
 * Only Cursor needs this. Claude Code expands `${CLAUDE_PLUGIN_ROOT}` and Copilot
 * injects `PLUGIN_ROOT`, so both start the bundled server directly.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { logDebug } from './log.mjs';

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER_RELATIVE_PATH = 'mcp/sdlc-tracker/src/index.mjs';
const SERVER_NAME = 'sdlc-tracker';

/** Windows accepts forward slashes, and they survive JSON without escaping. */
const toPosix = (path) => path.replaceAll('\\', '/');

/** @returns {string} */
const defaultConfigPath = () => join(homedir(), '.cursor', 'mcp.json');

/**
 * @typedef {object} RegisterResult
 * @property {boolean} changed   Whether the file was written.
 * @property {string} reason     Why, in a form that can be shown to the user.
 * @property {string} [serverPath]
 */

/** Cursor's own plugin directory, the only place an entry is ours to rewrite. */
const MANAGED_DIRECTORY = '/.cursor/plugins/';

/**
 * Whether an existing entry is one this hook may replace.
 *
 * Two things have to be true. It has to name this plugin's server script, so that a
 * `sdlc-tracker` pointing at somebody's own fork is left alone. And it has to be a
 * copy Cursor manages, or one that no longer exists on disk: an install path carries
 * a commit sha, so every plugin update leaves the previous entry stale, and rewriting
 * it is the whole point.
 *
 * A path outside Cursor's plugin directory is somebody working on the plugin itself,
 * pointing at their checkout deliberately. That path has no sha in it and so never
 * goes stale, which makes overwriting it purely destructive.
 *
 * @param {unknown} entry
 * @returns {boolean}
 */
const isReplaceable = (entry) => {
  const args = /** @type {{ args?: unknown }} */ (entry)?.args;
  if (!Array.isArray(args)) return false;

  const script = args.find((arg) => typeof arg === 'string' && toPosix(arg).endsWith(SERVER_RELATIVE_PATH));
  if (script === undefined) return false;

  return toPosix(script).includes(MANAGED_DIRECTORY) || !existsSync(script);
};

/**
 * @param {{ configPath?: string, serverPath?: string }} [options]
 * @returns {RegisterResult}
 */
export const registerTracker = (options = {}) => {
  const configPath = options.configPath ?? defaultConfigPath();
  const serverPath = toPosix(options.serverPath ?? join(PLUGIN_ROOT, SERVER_RELATIVE_PATH));

  if (!existsSync(serverPath)) {
    return { changed: false, reason: `the bundled server is not at ${serverPath}` };
  }

  /** @type {Record<string, unknown>} */
  let config = { mcpServers: {} };
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
      // Anything but an object means we cannot merge without guessing, and this is
      // the user's own file: leaving it alone and saying so beats replacing it.
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { changed: false, reason: `${configPath} is not a JSON object, so it was left alone` };
      }
      config = parsed;
    } catch (error) {
      return { changed: false, reason: `${configPath} is not valid JSON (${error.message}), so it was left alone` };
    }
  }

  const servers = typeof config.mcpServers === 'object' && config.mcpServers !== null ? config.mcpServers : {};
  const existing = /** @type {Record<string, unknown>} */ (servers)[SERVER_NAME];

  const wanted = { type: 'stdio', command: 'node', args: [serverPath] };
  if (existing !== undefined && JSON.stringify(existing) === JSON.stringify(wanted)) {
    logDebug(`${SERVER_NAME} already registered at ${serverPath}`);
    return { changed: false, reason: 'already registered' };
  }

  if (existing !== undefined && !isReplaceable(existing)) {
    return {
      changed: false,
      reason: `${configPath} points ${SERVER_NAME} at a copy this hook does not manage, so it was left alone`,
    };
  }

  const updated = { ...config, mcpServers: { ...servers, [SERVER_NAME]: wanted } };

  // Written via a temporary file so an interrupted write cannot truncate a config
  // that also holds the user's other servers.
  const temporary = `${configPath}.agent-sdlc.tmp`;
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(temporary, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  renameSync(temporary, configPath);

  logDebug(`registered ${SERVER_NAME} at ${serverPath}`);
  return {
    changed: true,
    reason: existing === undefined ? `registered ${SERVER_NAME} in ${configPath}` : `updated ${SERVER_NAME} in ${configPath}`,
    serverPath,
  };
};

export { SERVER_NAME, SERVER_RELATIVE_PATH };
