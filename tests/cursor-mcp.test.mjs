/**
 * The tracker registrar writes to `~/.cursor/mcp.json`, which belongs to the user and
 * holds their other MCP servers. Every test here is about not damaging it: the merge
 * preserves what it finds, a file it cannot parse is left untouched rather than
 * replaced, and an entry somebody else pointed elsewhere is left alone.
 *
 * The stale-path case is the one that makes updates work at all, since the install
 * path carries a commit sha and changes on every plugin update.
 */

import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerTracker, SERVER_NAME, SERVER_RELATIVE_PATH } from '../plugins/agent-sdlc/hooks/lib/cursormcp.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REAL_SERVER = join(REPO_ROOT, 'plugins', 'agent-sdlc', SERVER_RELATIVE_PATH);

const workspace = mkdtempSync(join(tmpdir(), 'agent-sdlc-cursor-mcp-'));
let configPath = '';
let counter = 0;

const register = (options = {}) => registerTracker({ configPath, serverPath: REAL_SERVER, ...options });
const read = () => JSON.parse(readFileSync(configPath, 'utf8'));

beforeEach(() => {
  counter += 1;
  configPath = join(workspace, `run-${counter}`, 'mcp.json');
});

after(() => rmSync(workspace, { recursive: true, force: true }));

test('creates the config, and the directory, when neither exists', () => {
  const result = register();

  assert.equal(result.changed, true);
  assert.deepEqual(read().mcpServers[SERVER_NAME], {
    type: 'stdio',
    command: 'node',
    args: [REAL_SERVER.replaceAll('\\', '/')],
  });
});

test('the path it writes has no unexpanded placeholder left in it', () => {
  register();

  const [script] = read().mcpServers[SERVER_NAME].args;
  assert.doesNotMatch(script, /\$\{/, 'a placeholder survived, which is the bug this whole module exists for');
  assert.ok(script.endsWith(SERVER_RELATIVE_PATH), `expected the server script, got ${script}`);
});

test('other servers and other top-level keys survive the merge', () => {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    JSON.stringify({
      mcpServers: { github: { type: 'http', url: 'https://example.test/mcp' } },
      someOtherSetting: { keep: true },
    }),
    'utf8',
  );

  register();
  const after = read();

  assert.deepEqual(after.mcpServers.github, { type: 'http', url: 'https://example.test/mcp' });
  assert.deepEqual(after.someOtherSetting, { keep: true });
  assert.ok(after.mcpServers[SERVER_NAME]);
});

test('running twice writes once', () => {
  assert.equal(register().changed, true);

  const second = register();
  assert.equal(second.changed, false, second.reason);
  assert.equal(second.reason, 'already registered');
});

/** @param {object} entry */
const seedEntry = (entry) => {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify({ mcpServers: { [SERVER_NAME]: entry } }));
};

test('a stale path from a previous plugin version is rewritten', () => {
  seedEntry({
    command: 'node',
    args: [`C:/Users/someone/.cursor/plugins/cache/x/agent-sdlc/0000000/${SERVER_RELATIVE_PATH}`],
  });

  assert.equal(register().changed, true);
  assert.equal(read().mcpServers[SERVER_NAME].args[0], REAL_SERVER.replaceAll('\\', '/'));
});

test('an entry pointing at somebody\'s own fork is left alone', () => {
  const theirs = { command: 'node', args: ['/opt/my-own-fork/server.mjs'] };
  seedEntry(theirs);

  const result = register();

  assert.equal(result.changed, false);
  assert.match(result.reason, /does not manage/);
  assert.deepEqual(read().mcpServers[SERVER_NAME], theirs);
});

test('a working-tree checkout of this plugin is deliberate, and is left alone', () => {
  // The entry points at a checkout: it exists, and it sits outside Cursor's plugin
  // directory. It carries no sha and so never goes stale, which is what separates it
  // from the stale case above. Registering runs as the installed copy would.
  const theirs = { command: 'node', args: [REAL_SERVER.replaceAll('\\', '/')] };
  seedEntry(theirs);

  const installed = join(workspace, '.cursor', 'plugins', 'cache', 'agent-sdlc', 'abc1234', SERVER_RELATIVE_PATH);
  mkdirSync(dirname(installed), { recursive: true });
  writeFileSync(installed, '// a real file, so the existence check is not what decides this test\n', 'utf8');

  const result = register({ serverPath: installed });

  assert.equal(result.changed, false, 'a developer checkout must not be overwritten by an installed copy');
  assert.match(result.reason, /does not manage/);
  assert.deepEqual(read().mcpServers[SERVER_NAME], theirs);
});

test('an entry naming a path that no longer exists is rewritten', () => {
  seedEntry({ command: 'node', args: [join(workspace, 'deleted-checkout', SERVER_RELATIVE_PATH)] });

  const result = register();

  assert.equal(result.changed, true, result.reason);
  assert.equal(read().mcpServers[SERVER_NAME].args[0], REAL_SERVER.replaceAll('\\', '/'));
});

test('a config that is not valid JSON is reported, never overwritten', () => {
  const damaged = '{ "mcpServers": { "github": ';
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, damaged);

  const result = register();

  assert.equal(result.changed, false);
  assert.match(result.reason, /not valid JSON/);
  assert.equal(readFileSync(configPath, 'utf8'), damaged);
});

test('a config holding something other than an object is left alone', () => {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, '["not", "an", "object"]');

  const result = register();

  assert.equal(result.changed, false);
  assert.match(result.reason, /not a JSON object/);
});

test('a missing server script is reported instead of registered', () => {
  const result = register({ serverPath: join(workspace, 'nowhere', 'index.mjs') });

  assert.equal(result.changed, false);
  assert.match(result.reason, /not at/);
});
