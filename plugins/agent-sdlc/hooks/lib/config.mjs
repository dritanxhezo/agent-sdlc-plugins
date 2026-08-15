/**
 * Loads per-project hook configuration from sdlc.config.json at the repo root.
 *
 * @typedef {'off' | 'warn' | 'block'} TGateMode
 *
 * @typedef {object} IGateConfig
 * @property {TGateMode} spec    Require a specification before source edits.
 * @property {TGateMode} tdd     Require a test file before source edits.
 * @property {TGateMode} secrets Scan written content for credentials.
 *
 * @typedef {object} ISdlcConfig
 * @property {IGateConfig} gates
 * @property {string} docsRoot
 * @property {string[]} sourceDirs
 * @property {string[]} ignorePatterns
 * @property {boolean} sessionContext
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logDebug } from './log.mjs';

const CONFIG_FILE_NAME = 'sdlc.config.json';

/** @type {ISdlcConfig} */
const DEFAULT_CONFIG = {
  gates: {
    spec: 'warn',
    tdd: 'warn',
    secrets: 'block',
  },
  docsRoot: 'docs/sdlc',
  sourceDirs: ['src', 'lib', 'app', 'server', 'packages'],
  ignorePatterns: ['node_modules', 'dist', 'build', 'coverage', '.git'],
  sessionContext: true,
};

/**
 * @param {string} root Absolute path to the workspace root.
 * @returns {ISdlcConfig}
 */
export const loadConfig = (root) => {
  try {
    const raw = readFileSync(join(root, CONFIG_FILE_NAME), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      gates: { ...DEFAULT_CONFIG.gates, ...(parsed.gates ?? {}) },
    };
  } catch {
    logDebug(`no ${CONFIG_FILE_NAME} at ${root}, using defaults`);
    return DEFAULT_CONFIG;
  }
};

export { DEFAULT_CONFIG, CONFIG_FILE_NAME };
