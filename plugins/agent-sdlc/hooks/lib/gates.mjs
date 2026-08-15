/**
 * The spec and TDD gates.
 *
 * Both return a finding or null. Whether a finding blocks the edit or merely
 * nudges the agent is decided by the caller from the configured gate mode, so
 * the detection logic exists in exactly one place.
 *
 * @typedef {object} IGateFinding
 * @property {'spec' | 'tdd'} gate
 * @property {string} message   Written for the agent, so it states the remedy.
 */

import { relative } from 'node:path';
import { isProductionSource, findSpecs } from './paths.mjs';
import { detectStack, findExistingTest, testCandidatesFor } from './stack.mjs';
import { CONFIG_FILE_NAME } from './config.mjs';

const MAX_SUGGESTED_PATHS = 3;

/**
 * Flags source edits made before any specification exists.
 *
 * @param {string} filePath Absolute path being written.
 * @param {string} root Absolute workspace root.
 * @param {import('./config.mjs').ISdlcConfig} config
 * @returns {IGateFinding | null}
 */
export const checkSpecGate = (filePath, root, config) => {
  if (config.gates.spec === 'off') return null;
  if (!isProductionSource(filePath, root)) return null;

  const { hasSpec } = findSpecs(root, config.docsRoot);
  if (hasSpec) return null;

  return {
    gate: 'spec',
    message:
      `No specification exists yet for this project, so ${relative(root, filePath)} is being ` +
      `written without one. Use the brd-author and frd-author skills to capture what this ` +
      `should do in ${config.docsRoot}/<feature>/, or set gates.spec to "off" in ` +
      `${CONFIG_FILE_NAME} if this repository is intentionally spec-free.`,
  };
};

/**
 * Flags source edits where no test file covers the file being changed.
 *
 * This checks for the existence of a test, not for a currently failing one:
 * running the suite inside a hook would add seconds to every edit. The red step
 * itself is enforced by the tdd-implement skill.
 *
 * @param {string} filePath Absolute path being written.
 * @param {string} root Absolute workspace root.
 * @param {import('./config.mjs').ISdlcConfig} config
 * @returns {IGateFinding | null}
 */
export const checkTddGate = (filePath, root, config) => {
  if (config.gates.tdd === 'off') return null;
  if (!isProductionSource(filePath, root)) return null;

  const stack = detectStack(root);
  if (stack === null) return null;
  if (findExistingTest(filePath, root) !== null) return null;

  const suggestions = testCandidatesFor(filePath, root)
    .slice(0, MAX_SUGGESTED_PATHS)
    .map((candidate) => relative(root, candidate))
    .join(', ');

  return {
    gate: 'tdd',
    message:
      `No test covers ${relative(root, filePath)}. Write the failing test first and confirm it ` +
      `fails for the expected reason, then implement. Expected test location: ${suggestions}. ` +
      `Run the suite with \`${stack.runner}\`.`,
  };
};

/**
 * @param {string} filePath
 * @param {string} root
 * @param {import('./config.mjs').ISdlcConfig} config
 * @param {'block' | 'warn'} mode Only gates set to this mode are evaluated.
 * @returns {IGateFinding[]}
 */
export const runGates = (filePath, root, config, mode) => {
  const findings = [];
  if (config.gates.spec === mode) {
    const finding = checkSpecGate(filePath, root, config);
    if (finding) findings.push(finding);
  }
  if (config.gates.tdd === mode) {
    const finding = checkTddGate(filePath, root, config);
    if (finding) findings.push(finding);
  }
  return findings;
};
