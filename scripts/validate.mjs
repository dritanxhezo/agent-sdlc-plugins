#!/usr/bin/env node
/**
 * Validates every manifest and component in the repository.
 *
 * A malformed manifest makes a plugin fail to load silently, with no error the
 * user ever sees, so this runs in CI and is the fastest way to catch a mistake
 * before publishing.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { versionSites, readAt, readJsonFile } from './lib/version-sites.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGINS_DIR = join(REPO_ROOT, 'plugins');

/** Closed set from the Agent Plugins 1.0.0 manifest schema. */
const AGENT_PLUGIN_FIELDS = new Set([
  '$schema', 'name', 'version', 'description', 'author',
  'homepage', 'repository', 'license', 'keywords', 'extensions',
]);

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

const errors = [];
const warnings = [];

/** @param {string} message */
const fail = (message) => errors.push(message);
/** @param {string} message */
const warn = (message) => warnings.push(message);

/** @param {string} path @returns {object | null} */
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${path}: invalid JSON - ${error.message}`);
    return null;
  }
};

/** @param {string} path @returns {Record<string, string> | null} */
const readFrontmatter = (path) => {
  const raw = readFileSync(path, 'utf8');
  const match = FRONTMATTER_PATTERN.exec(raw);
  if (!match) return null;

  /** @type {Record<string, string>} */
  const fields = {};
  let currentKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    const keyed = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (keyed) {
      currentKey = keyed[1];
      fields[currentKey] = keyed[2].trim();
    } else if (currentKey && line.trim().length > 0) {
      fields[currentKey] = `${fields[currentKey]} ${line.trim()}`.trim();
    }
  }

  return fields;
};

/** @param {string} dir @returns {string[]} */
const subdirs = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()) : [];

/** @param {string} dir @param {RegExp} pattern @returns {string[]} */
const filesMatching = (dir, pattern) =>
  existsSync(dir) ? readdirSync(dir).filter((name) => pattern.test(name)) : [];

const validateAgentPluginManifest = (pluginDir) => {
  const path = join(pluginDir, 'plugin.json');
  if (!existsSync(path)) {
    warn(`${path}: no portable Agent Plugins manifest, so the plugin is not portable`);
    return;
  }

  const manifest = readJson(path);
  if (!manifest) return;

  if (!manifest.$schema) fail(`${path}: $schema is required by the Agent Plugins spec`);
  if (!manifest.name) fail(`${path}: name is required`);
  else if (!NAME_PATTERN.test(manifest.name)) fail(`${path}: name "${manifest.name}" is not valid`);

  for (const key of Object.keys(manifest)) {
    if (!AGENT_PLUGIN_FIELDS.has(key)) {
      fail(`${path}: "${key}" is not a portable field - client data belongs under extensions`);
    }
  }
};

/** @param {string} pluginDir @param {string} manifestPath @param {string} label */
const validateClientManifest = (pluginDir, manifestPath, label) => {
  const path = join(pluginDir, manifestPath);
  if (!existsSync(path)) {
    warn(`${path}: missing, so this plugin will not load in ${label}`);
    return null;
  }

  const manifest = readJson(path);
  if (!manifest) return null;

  if (!manifest.name) fail(`${path}: name is required`);
  else if (!NAME_PATTERN.test(manifest.name)) fail(`${path}: name "${manifest.name}" is not valid`);

  for (const key of ['skills', 'agents', 'rules', 'hooks', 'mcpServers']) {
    const value = manifest[key];
    if (typeof value !== 'string') continue;
    const resolved = join(pluginDir, value);
    if (!existsSync(resolved)) fail(`${path}: ${key} points at "${value}", which does not exist`);
  }

  return manifest;
};

const validateSkills = (pluginDir) => {
  const skillsDir = join(pluginDir, 'skills');
  const names = subdirs(skillsDir);
  if (names.length === 0) warn(`${skillsDir}: no skills found`);

  for (const name of names) {
    const path = join(skillsDir, name, 'SKILL.md');
    if (!existsSync(path)) {
      fail(`${join(skillsDir, name)}: directory has no SKILL.md`);
      continue;
    }

    const fields = readFrontmatter(path);
    if (!fields) {
      fail(`${path}: missing YAML frontmatter`);
      continue;
    }
    if (!fields.name) fail(`${path}: frontmatter needs a name`);
    else if (fields.name !== name) fail(`${path}: name "${fields.name}" does not match directory "${name}"`);
    if (!fields.description) fail(`${path}: frontmatter needs a description`);
    else if (fields.description.length < 40) {
      warn(`${path}: description is short - it is the only text an agent sees when choosing a skill`);
    }

    validateRelativeLinks(path);
    for (const reference of filesMatching(join(skillsDir, name, 'references'), /\.(md|mdc|markdown)$/)) {
      validateRelativeLinks(join(skillsDir, name, 'references', reference));
    }
  }
};

/**
 * Checks that every relative markdown link resolves. A skill that points an agent at
 * a file which is not there is worse than one that says nothing, because the agent
 * proceeds as though it read it.
 */
const validateRelativeLinks = (path) => {
  const raw = readFileSync(path, 'utf8');
  const linkPattern = /\]\(([^)#][^)]*)\)/g;
  let match;
  while ((match = linkPattern.exec(raw)) !== null) {
    const target = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
    if (!existsSync(join(dirname(path), target.split('#')[0]))) {
      fail(`${path}: links to "${target}", which does not exist`);
    }
  }
};

const validateAgents = (pluginDir) => {
  const agentsDir = join(pluginDir, 'agents');
  for (const file of filesMatching(agentsDir, /\.(md|mdc|markdown)$/)) {
    const path = join(agentsDir, file);
    const fields = readFrontmatter(path);
    if (!fields) {
      fail(`${path}: missing YAML frontmatter`);
      continue;
    }
    if (!fields.name) fail(`${path}: frontmatter needs a name`);
    if (!fields.description) fail(`${path}: frontmatter needs a description`);
    validateRelativeLinks(path);
  }
};

const validateRules = (pluginDir) => {
  const rulesDir = join(pluginDir, 'rules');
  for (const file of filesMatching(rulesDir, /\.(md|mdc|markdown)$/)) {
    const path = join(rulesDir, file);
    const fields = readFrontmatter(path);
    if (!fields) {
      fail(`${path}: missing YAML frontmatter`);
      continue;
    }
    if (!fields.description) fail(`${path}: frontmatter needs a description`);
    if (fields.alwaysApply === undefined) fail(`${path}: frontmatter needs alwaysApply`);
  }
};

const validateHooks = (pluginDir) => {
  const cursorPath = join(pluginDir, 'hooks', 'cursor.json');
  const claudePath = join(pluginDir, 'hooks', 'claude.json');

  if (existsSync(join(pluginDir, 'hooks', 'hooks.json'))) {
    fail(
      `${join(pluginDir, 'hooks', 'hooks.json')}: this filename is auto-discovered by both Cursor ` +
        'and Claude Code, whose formats are incompatible. Use cursor.json and claude.json instead.',
    );
  }

  const cursor = existsSync(cursorPath) ? readJson(cursorPath) : null;
  if (cursor) {
    for (const [event, entries] of Object.entries(cursor.hooks ?? {})) {
      if (event[0] !== event[0].toLowerCase()) fail(`${cursorPath}: "${event}" should be camelCase for Cursor`);
      for (const entry of entries) validateHookCommand(cursorPath, pluginDir, entry.command);
    }
  }

  const claude = existsSync(claudePath) ? readJson(claudePath) : null;
  if (claude) {
    for (const [event, entries] of Object.entries(claude.hooks ?? {})) {
      if (event[0] !== event[0].toUpperCase()) fail(`${claudePath}: "${event}" should be PascalCase for Claude Code`);
      for (const group of entries) {
        for (const entry of group.hooks ?? []) validateHookCommand(claudePath, pluginDir, entry.command);
      }
    }
  }

  validateCopilotHooks(pluginDir);
};

/**
 * Copilot auto-discovers `hooks.json` at the plugin root, which is why the file
 * lives there rather than beside the other two: no client manifest can point at
 * it, and neither Cursor nor Claude Code looks for that name.
 *
 * @param {string} pluginDir
 */
const validateCopilotHooks = (pluginDir) => {
  const path = join(pluginDir, 'hooks.json');
  if (!existsSync(path)) {
    warn(`${path}: missing, so the gates will not fire in GitHub Copilot`);
    return;
  }

  const manifest = readJson(path);
  if (!manifest) return;

  if (manifest.version !== 1) fail(`${path}: version must be 1, or the whole file is rejected`);

  for (const [event, entries] of Object.entries(manifest.hooks ?? {})) {
    if (event[0] !== event[0].toLowerCase()) {
      fail(`${path}: "${event}" should be camelCase - PascalCase switches Copilot to Claude payload names`);
    }
    if (!Array.isArray(entries)) {
      fail(`${path}: "${event}" must be an array`);
      continue;
    }
    for (const entry of entries) validateHookCommand(path, pluginDir, entry.command);
  }
};

/** Extracts the script path from a hook command and checks it exists. */
const validateHookCommand = (manifestPath, pluginDir, command) => {
  if (typeof command !== 'string') {
    fail(`${manifestPath}: a hook entry has no command`);
    return;
  }
  const match = /(?:\.\/)?(hooks\/[A-Za-z0-9_./-]+\.mjs)/.exec(command.replace(/\$\{[^}]+\}\//g, ''));
  if (!match) {
    warn(`${manifestPath}: could not determine the script for "${command}"`);
    return;
  }
  if (!existsSync(join(pluginDir, match[1]))) {
    fail(`${manifestPath}: hook script "${match[1]}" does not exist`);
  }
};

const validateMarketplaces = () => {
  for (const [file, sourceKey] of [
    [join(REPO_ROOT, '.cursor-plugin', 'marketplace.json'), 'cursor'],
    [join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'claude'],
  ]) {
    if (!existsSync(file)) {
      fail(`${file}: missing marketplace manifest`);
      continue;
    }

    const manifest = readJson(file);
    if (!manifest) continue;
    if (!manifest.name) fail(`${file}: name is required`);
    if (!manifest.owner?.name) fail(`${file}: owner.name is required`);
    if (!Array.isArray(manifest.plugins) || manifest.plugins.length === 0) {
      fail(`${file}: plugins must be a non-empty array`);
      continue;
    }

    const prefix = manifest.metadata?.pluginRoot ?? '';
    for (const entry of manifest.plugins) {
      if (!entry.name) fail(`${file}: a plugin entry has no name`);
      const source = typeof entry.source === 'string' ? entry.source : entry.source?.path;
      if (!source) {
        fail(`${file}: plugin "${entry.name}" has no source`);
        continue;
      }
      const resolved = join(REPO_ROOT, prefix, source.replace(/^\.\//, ''));
      if (!existsSync(resolved)) {
        fail(`${file}: plugin "${entry.name}" source "${source}" resolves to a missing directory (${sourceKey})`);
      }
    }
  }
};

/**
 * Clients compare version numbers to decide whether an update exists, and each one
 * reads a different manifest. A version that agrees with itself everywhere is the
 * only way a republish reaches someone who already installed the plugin.
 */
const validateVersions = () => {
  const sites = versionSites(REPO_ROOT).filter((site) => existsSync(site.file));
  const found = sites.map((site) => ({ ...site, version: readAt(readJsonFile(site.file), site.pointer) }));

  for (const site of found) {
    if (typeof site.version !== 'string') fail(`${site.file}: no version at ${site.pointer.join('.')}`);
  }

  const distinct = [...new Set(found.map((site) => site.version).filter((v) => typeof v === 'string'))];
  if (distinct.length > 1) {
    const detail = found.map((site) => `  ${site.version} - ${site.label} (${site.file})`).join('\n');
    fail(`plugin version disagrees across manifests, so clients will not offer the update:\n${detail}`);
  }
};

/**
 * A stdio server must name its script through the plugin-root token in `args`, never
 * through `cwd`.
 *
 * Cursor expands the token in `args` but not in `cwd`, where it passes the literal
 * `${PLUGIN_ROOT}` through as a working directory. Spawning into a directory that does
 * not exist is reported as `spawn node ENOENT`, which reads as a missing Node
 * installation and sends you looking at PATH for as long as you believe it.
 *
 * @param {string} pluginDir
 */
const validateMcpServers = (pluginDir) => {
  for (const file of ['mcp.json', '.mcp.json', 'mcp.source.json']) {
    const path = join(pluginDir, file);
    if (!existsSync(path)) continue;

    const config = readJson(path);
    const servers = config?.mcpServers ?? config?.servers;
    if (!servers) continue;

    for (const [name, server] of Object.entries(servers)) {
      if (server?.cwd !== undefined) {
        fail(
          `${path}: "${name}" sets cwd, which Cursor does not expand the plugin-root token in - ` +
            `it fails as "spawn node ENOENT". Put the token in args instead.`,
        );
      }
    }
  }
};

const main = () => {
  validateMarketplaces();
  validateVersions();

  const pluginDirs = subdirs(PLUGINS_DIR).map((name) => join(PLUGINS_DIR, name));
  if (pluginDirs.length === 0) fail(`${PLUGINS_DIR}: no plugins found`);

  for (const pluginDir of pluginDirs) {
    validateAgentPluginManifest(pluginDir);
    validateClientManifest(pluginDir, join('.cursor-plugin', 'plugin.json'), 'Cursor');
    validateClientManifest(pluginDir, join('.claude-plugin', 'plugin.json'), 'Claude Code');
    validateSkills(pluginDir);
    validateAgents(pluginDir);
    validateRules(pluginDir);
    validateHooks(pluginDir);
    validateMcpServers(pluginDir);
  }

  for (const message of warnings) process.stdout.write(`warning: ${message}\n`);
  for (const message of errors) process.stderr.write(`error: ${message}\n`);

  const summary =
    `\n${errors.length} error(s), ${warnings.length} warning(s) across ` +
    `${pluginDirs.length} plugin(s).\n`;
  process.stdout.write(summary);

  return errors.length > 0 ? 1 : 0;
};

process.exit(main());
