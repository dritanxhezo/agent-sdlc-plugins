#!/usr/bin/env node
/**
 * Sets the plugin version in every manifest that carries one.
 *
 * Publishing a change nobody can install is the failure this prevents: clients
 * compare version numbers against their cached copy, so an unbumped republish is
 * invisible, and a partially bumped one is worse - whichever manifest the client
 * happens to read decides the answer.
 *
 * Usage: node scripts/bump-version.mjs <major|minor|patch|x.y.z>
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { versionSites, readAt, readJsonFile } from './lib/version-sites.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const LEVELS = ['major', 'minor', 'patch'];

/** @param {string} current @param {string} level */
const increment = (current, level) => {
  const match = SEMVER_PATTERN.exec(current);
  if (!match) throw new Error(`current version "${current}" is not x.y.z, so it cannot be bumped by level`);

  const parts = match.slice(1).map(Number);
  const index = LEVELS.indexOf(level);
  parts[index] += 1;
  for (let i = index + 1; i < parts.length; i += 1) parts[i] = 0;
  return parts.join('.');
};

const main = () => {
  const argument = process.argv[2];
  if (!argument) throw new Error('usage: node scripts/bump-version.mjs <major|minor|patch|x.y.z>');

  const sites = versionSites(REPO_ROOT).filter((site) => existsSync(site.file));
  const current = readAt(readJsonFile(sites[0].file), sites[0].pointer);
  const next = LEVELS.includes(argument) ? increment(current, argument) : argument;

  if (!SEMVER_PATTERN.test(next)) throw new Error(`"${next}" is not a valid x.y.z version`);
  if (next === current) throw new Error(`already at ${current} - a republish at the same version is invisible`);

  // Counted per file so a marketplace manifest carrying two versions is written once.
  const expected = new Map();
  for (const site of sites) expected.set(site.file, (expected.get(site.file) ?? 0) + 1);

  // Every file is prepared and checked before any of them is written. Writing as we
  // went left the repository half-bumped whenever a later file disagreed, which is
  // the exact state this script exists to prevent.
  const planned = [];
  for (const [file, count] of expected) {
    const before = readFileSync(file, 'utf8');
    const pattern = new RegExp(`("version":\\s*)"${current.replace(/\./g, '\\.')}"`, 'g');

    // A rewrite is preferred over re-serialising the parsed object, which would
    // reflow every array in the file and bury the one-line change in noise.
    const replaced = (before.match(pattern) ?? []).length;
    if (replaced !== count) {
      throw new Error(`${file}: expected ${count} version field(s) at ${current}, found ${replaced}`);
    }
    planned.push({ file, body: before.replace(pattern, `$1"${next}"`) });
  }

  for (const { file, body } of planned) writeFileSync(file, body);

  process.stdout.write(`${current} -> ${next} in ${expected.size} file(s), ${sites.length} field(s).\n`);
  process.stdout.write('Commit and push to the default branch, then colleagues run their client\'s update.\n');
};

try {
  main();
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exit(1);
}
