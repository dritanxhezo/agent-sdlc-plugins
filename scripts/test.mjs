#!/usr/bin/env node
/**
 * Test runner.
 *
 * `node --test` accepts glob patterns only from Node 22, and passing a directory
 * behaves differently again across versions and shells. Enumerating the files
 * and passing them explicitly is the one form that works everywhere.
 */

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TESTS_DIR = join(REPO_ROOT, 'tests');
const TEST_FILE_SUFFIX = '.test.mjs';

const files = readdirSync(TESTS_DIR)
  .filter((name) => name.endsWith(TEST_FILE_SUFFIX))
  .sort()
  .map((name) => join(TESTS_DIR, name));

if (files.length === 0) {
  process.stderr.write(`No ${TEST_FILE_SUFFIX} files in ${TESTS_DIR}\n`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
