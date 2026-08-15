/**
 * Every place the plugin's version is written.
 *
 * Clients decide whether an update exists by comparing version numbers, and they
 * each read a different one of these files. Bump only some and a colleague's client
 * reports "already at the latest version" while serving stale code, so the validator
 * requires all of them to agree and `bump-version.mjs` writes all of them at once.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** @typedef {{ file: string, pointer: string[], label: string }} IVersionSite */

/** @param {string} repoRoot @returns {IVersionSite[]} */
export const versionSites = (repoRoot) => {
  const plugin = join(repoRoot, 'plugins', 'agent-sdlc');
  return [
    { file: join(repoRoot, 'package.json'), pointer: ['version'], label: 'repository' },
    { file: join(plugin, 'plugin.json'), pointer: ['version'], label: 'Agent Plugins manifest' },
    { file: join(plugin, '.cursor-plugin', 'plugin.json'), pointer: ['version'], label: 'Cursor manifest' },
    { file: join(plugin, '.claude-plugin', 'plugin.json'), pointer: ['version'], label: 'Claude Code manifest' },
    {
      file: join(repoRoot, '.cursor-plugin', 'marketplace.json'),
      pointer: ['metadata', 'version'],
      label: 'Cursor marketplace metadata',
    },
    {
      file: join(repoRoot, '.cursor-plugin', 'marketplace.json'),
      pointer: ['plugins', '0', 'version'],
      label: 'Cursor marketplace entry',
    },
    {
      file: join(repoRoot, '.claude-plugin', 'marketplace.json'),
      pointer: ['plugins', '0', 'version'],
      label: 'Claude Code marketplace entry',
    },
  ];
};

/** @param {object} root @param {string[]} pointer */
export const readAt = (root, pointer) =>
  pointer.reduce((node, key) => (node === undefined || node === null ? undefined : node[key]), root);

/** @param {string} file @returns {object} */
export const readJsonFile = (file) => JSON.parse(readFileSync(file, 'utf8'));
