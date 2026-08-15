/**
 * The vendored Copilot install converts Cursor rules into Copilot's path-scoped
 * instruction files. Both halves of that conversion fail silently: a malformed
 * `applyTo` scopes the conventions to nothing, and a link left pointing at a `.mdc`
 * sibling sends the agent to a file that does not exist under `instructions/`.
 * Neither shows up as an error, so they are pinned here.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_ROOT = join(REPO_ROOT, 'plugins', 'agent-sdlc');
const INSTALLER = join(PLUGIN_ROOT, 'bin', 'install.mjs');
const RULES_DIR = join(PLUGIN_ROOT, 'rules');

const GLOB_SCOPED_RULE = 'code-conventions-ts';
const UNSCOPED_RULE = 'sdlc-workflow';

const target = mkdtempSync(join(tmpdir(), 'agent-sdlc-install-'));
const install = spawnSync(process.execPath, [INSTALLER, '--tool', 'copilot', '--target', target], {
  encoding: 'utf8',
});

const instructionsDir = join(target, '.github', 'instructions');

/** @param {string} name */
const readInstruction = (name) => readFileSync(join(instructionsDir, `${name}.instructions.md`), 'utf8');

after(() => rmSync(target, { recursive: true, force: true }));

test('the vendored install succeeds', () => {
  assert.equal(install.status, 0, install.stderr);
});

test('applyTo is a comma-separated string, not the JSON array Cursor uses', () => {
  const applyTo = /^applyTo: "([^"]+)"$/m.exec(readInstruction(GLOB_SCOPED_RULE))?.[1];

  assert.ok(applyTo, 'no applyTo in the frontmatter');
  assert.doesNotMatch(applyTo, /[[\]"']/, 'array or quote syntax leaked through from the Cursor globs');
  assert.ok(applyTo.split(',').includes('**/*.tsx'), `expected the tsx glob, got "${applyTo}"`);
});

test('the description survives, since Copilot indexes files by it', () => {
  assert.match(readInstruction(GLOB_SCOPED_RULE), /^description: \S/m);
});

test('a rule with no globs is skipped, not applied to everything', () => {
  // Guards the reason as well as the result: if the rule ever gains globs, this test
  // would otherwise keep passing while testing nothing.
  const source = readFileSync(join(RULES_DIR, `${UNSCOPED_RULE}.mdc`), 'utf8');
  assert.doesNotMatch(source, /^globs:/m, `${UNSCOPED_RULE} now has globs, so this test needs rewriting`);

  assert.equal(
    existsSync(join(instructionsDir, `${UNSCOPED_RULE}.instructions.md`)),
    false,
    'an on-request rule became an always-on instruction file',
  );
});

test('cross-links point at the generated filenames', () => {
  const files = readdirSync(instructionsDir);
  assert.ok(files.length > 0, 'nothing was generated');

  for (const file of files) {
    const body = readFileSync(join(instructionsDir, file), 'utf8');
    assert.doesNotMatch(body, /\.mdc\b/, `${file} still refers to a .mdc sibling that is not installed`);

    for (const [, targetFile] of body.matchAll(/\]\(([^)#:]+\.md)\)/g)) {
      assert.ok(existsSync(join(instructionsDir, targetFile)), `${file} links to missing ${targetFile}`);
    }
  }
});

test('rules are copied too, so the skills relative links still resolve', () => {
  // skills/<name>/SKILL.md reaches the conventions with ../../rules/.
  assert.ok(existsSync(join(target, '.github', 'rules', 'code-conventions.mdc')));
});
