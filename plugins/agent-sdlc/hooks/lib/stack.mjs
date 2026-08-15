/**
 * Test stack detection and source-to-test mapping.
 *
 * The TDD guard must never assume a test runner. Everything here is derived from
 * files actually present in the project, and an unrecognised stack yields a
 * null runner so the guard stays quiet rather than guessing.
 *
 * @typedef {object} StackProfile
 * @property {string} id
 * @property {string} runner        Command that runs the suite.
 * @property {string[]} testGlobs   Human-readable description of test locations.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { logDebug } from './log.mjs';

const NODE_MANIFEST = 'package.json';

/** @type {Record<string, StackProfile>} */
const PROFILES = {
  vitest: { id: 'vitest', runner: 'npx vitest run', testGlobs: ['*.test.ts', '*.spec.ts'] },
  jest: { id: 'jest', runner: 'npx jest', testGlobs: ['*.test.ts', '__tests__/*.ts'] },
  playwright: { id: 'playwright', runner: 'npx playwright test', testGlobs: ['e2e/*.spec.ts'] },
  pytest: { id: 'pytest', runner: 'python -m pytest', testGlobs: ['tests/test_*.py'] },
  dotnet: { id: 'dotnet', runner: 'dotnet test', testGlobs: ['*Tests.cs'] },
  go: { id: 'go', runner: 'go test ./...', testGlobs: ['*_test.go'] },
  cargo: { id: 'cargo', runner: 'cargo test', testGlobs: ['tests/*.rs'] },
};

/** @param {string} root @returns {object | null} */
const readNodeManifest = (root) => {
  try {
    return JSON.parse(readFileSync(join(root, NODE_MANIFEST), 'utf8'));
  } catch {
    return null;
  }
};

/** @param {string} root @returns {boolean} */
const hasFileMatching = (root, pattern) => {
  try {
    return readdirSync(root).some((name) => pattern.test(name));
  } catch {
    return false;
  }
};

/**
 * @param {string} root Absolute workspace root.
 * @returns {StackProfile | null} Null when no runner can be identified.
 */
export const detectStack = (root) => {
  const manifest = readNodeManifest(root);
  if (manifest) {
    const deps = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
    if (deps.vitest) return PROFILES.vitest;
    if (deps.jest) return PROFILES.jest;
    if (deps['@playwright/test']) return PROFILES.playwright;
  }
  if (existsSync(join(root, 'pytest.ini')) || existsSync(join(root, 'pyproject.toml'))) {
    return PROFILES.pytest;
  }
  if (hasFileMatching(root, /\.(csproj|sln)$/)) return PROFILES.dotnet;
  if (existsSync(join(root, 'go.mod'))) return PROFILES.go;
  if (existsSync(join(root, 'Cargo.toml'))) return PROFILES.cargo;

  logDebug('no test runner detected');
  return null;
};

/**
 * Candidate test file paths for a source file, ordered by convention strength.
 *
 * @param {string} filePath Absolute path to a source file.
 * @param {string} root Absolute workspace root.
 * @returns {string[]} Absolute candidate paths.
 */
export const testCandidatesFor = (filePath, root) => {
  const dir = dirname(filePath);
  const ext = extname(filePath);
  const stem = basename(filePath, ext);
  const candidates = [];

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    for (const suffix of ['.test', '.spec']) {
      candidates.push(join(dir, `${stem}${suffix}${ext}`));
      candidates.push(join(dir, '__tests__', `${stem}${suffix}${ext}`));
      candidates.push(join(root, 'tests', `${stem}${suffix}${ext}`));
      candidates.push(join(root, 'test', `${stem}${suffix}${ext}`));
    }
  } else if (ext === '.py') {
    candidates.push(join(dir, `test_${stem}.py`));
    candidates.push(join(root, 'tests', `test_${stem}.py`));
  } else if (ext === '.cs') {
    candidates.push(join(dir, `${stem}Tests.cs`));
    candidates.push(join(root, `${stem}.Tests`, `${stem}Tests.cs`));
  } else if (ext === '.go') {
    candidates.push(join(dir, `${stem}_test.go`));
  } else if (ext === '.rs') {
    candidates.push(join(root, 'tests', `${stem}.rs`));
  }

  return candidates;
};

/**
 * @param {string} filePath Absolute path to a source file.
 * @param {string} root Absolute workspace root.
 * @returns {string | null} The existing test file, or null when none covers it.
 */
export const findExistingTest = (filePath, root) =>
  testCandidatesFor(filePath, root).find((candidate) => existsSync(candidate)) ?? null;

export { PROFILES };
