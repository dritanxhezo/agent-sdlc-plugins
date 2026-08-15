/**
 * Path classification shared by every gate.
 *
 * The gates only ever act on production source files. Getting this
 * classification wrong is what makes a hook annoying, so the checks here are
 * deliberately conservative: anything not clearly production source is exempt.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, extname, basename } from 'node:path';

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.cs', '.go', '.rs', '.java', '.kt', '.rb', '.php', '.swift',
]);

const TEST_PATH_MARKERS = ['__tests__', '__mocks__', 'test', 'tests', 'spec', 'e2e', 'cypress'];
const TEST_NAME_PATTERNS = [/\.test\./, /\.spec\./, /^test_/, /_test\./, /Tests?\./];
const EXEMPT_PATH_MARKERS = ['node_modules', 'dist', 'build', 'coverage', '.git', 'docs', '.specify'];
const CONFIG_NAME_PATTERNS = [/^\./, /\.config\./, /^vite\./, /^jest\./, /^webpack\./, /^rollup\./];

/** @param {string} filePath @returns {string[]} */
const segmentsOf = (filePath) => filePath.split(/[\\/]/).filter(Boolean);

/** @param {string} filePath */
export const isTestFile = (filePath) => {
  const name = basename(filePath);
  if (TEST_NAME_PATTERNS.some((pattern) => pattern.test(name))) return true;
  return segmentsOf(filePath).some((segment) => TEST_PATH_MARKERS.includes(segment.toLowerCase()));
};

/** @param {string} filePath */
export const isExemptPath = (filePath) => {
  const segments = segmentsOf(filePath).map((segment) => segment.toLowerCase());
  return segments.some((segment) => EXEMPT_PATH_MARKERS.includes(segment));
};

/** @param {string} filePath */
const isConfigFile = (filePath) => CONFIG_NAME_PATTERNS.some((p) => p.test(basename(filePath)));

/**
 * True only for files the gates should police: production source, not tests,
 * not config, not vendored or generated output.
 *
 * @param {string} filePath Absolute path.
 * @param {string} root Absolute workspace root.
 */
export const isProductionSource = (filePath, root) => {
  if (!SOURCE_EXTENSIONS.has(extname(filePath))) return false;
  const rel = relative(root, filePath);
  if (rel.startsWith('..')) return false;
  if (isExemptPath(rel) || isTestFile(rel) || isConfigFile(rel)) return false;
  return true;
};

/**
 * Finds specification artifacts, from this plugin's docs tree or from Spec Kit.
 *
 * @param {string} root Absolute workspace root.
 * @param {string} docsRoot Relative docs directory from config.
 * @returns {{ hasSpec: boolean, specPaths: string[] }}
 */
export const findSpecs = (root, docsRoot) => {
  const specPaths = [];
  const collect = (dir, matcher) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      try {
        if (statSync(full).isDirectory()) {
          for (const inner of readdirSync(full)) {
            if (matcher(inner)) specPaths.push(join(full, inner));
          }
        }
      } catch {
        // Unreadable entry is not a specification; ignore it.
      }
    }
  };

  collect(join(root, ...docsRoot.split('/')), (name) => name === 'frd.md' || name === 'brd.md');
  collect(join(root, '.specify', 'specs'), (name) => name === 'spec.md');

  return { hasSpec: specPaths.length > 0, specPaths };
};

export { SOURCE_EXTENSIONS, sep };
