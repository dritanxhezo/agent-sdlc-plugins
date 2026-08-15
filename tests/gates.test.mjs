import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSpecGate, checkTddGate } from '../plugins/agent-sdlc/hooks/lib/gates.mjs';
import { isProductionSource, isTestFile } from '../plugins/agent-sdlc/hooks/lib/paths.mjs';
import { detectStack } from '../plugins/agent-sdlc/hooks/lib/stack.mjs';

const CONFIG = {
  gates: { spec: 'warn', tdd: 'warn', secrets: 'block' },
  docsRoot: 'docs/sdlc',
  sourceDirs: ['src'],
  ignorePatterns: [],
  sessionContext: true,
};

let root;

/** @param {string} relativePath @param {string} [body] */
const addFile = (relativePath, body = '') => {
  const full = join(root, ...relativePath.split('/'));
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, body, 'utf8');
  return full;
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'agent-sdlc-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

test('classifies production source, tests and config correctly', () => {
  const source = addFile('src/login.ts');
  assert.equal(isProductionSource(source, root), true);

  for (const path of [
    'src/login.test.ts',
    'src/__tests__/login.ts',
    'tests/login.ts',
    'docs/notes.ts',
    'node_modules/pkg/index.js',
    'vite.config.ts',
    'README.md',
  ]) {
    assert.equal(isProductionSource(addFile(path), root), false, `should exempt ${path}`);
  }
});

test('recognises test file naming conventions', () => {
  assert.equal(isTestFile('src/login.test.ts'), true);
  assert.equal(isTestFile('src/login.spec.tsx'), true);
  assert.equal(isTestFile('tests/test_login.py'), true);
  assert.equal(isTestFile('pkg/login_test.go'), true);
  assert.equal(isTestFile('src/login.ts'), false);
});

test('spec gate fires when no specification exists', () => {
  const finding = checkSpecGate(addFile('src/login.ts'), root, CONFIG);
  assert.equal(finding?.gate, 'spec');
  assert.match(finding.message, /brd-author/);
});

test('spec gate is satisfied by an FRD', () => {
  addFile('docs/sdlc/001-login/frd.md', '# FRD');
  assert.equal(checkSpecGate(addFile('src/login.ts'), root, CONFIG), null);
});

test('spec gate is satisfied by a Spec Kit spec', () => {
  addFile('.specify/specs/001-login/spec.md', '# spec');
  assert.equal(checkSpecGate(addFile('src/login.ts'), root, CONFIG), null);
});

test('spec gate stays silent for test files and when disabled', () => {
  assert.equal(checkSpecGate(addFile('src/login.test.ts'), root, CONFIG), null);
  const off = { ...CONFIG, gates: { ...CONFIG.gates, spec: 'off' } };
  assert.equal(checkSpecGate(addFile('src/other.ts'), root, off), null);
});

test('tdd gate stays silent when no test runner can be detected', () => {
  assert.equal(detectStack(root), null);
  assert.equal(checkTddGate(addFile('src/login.ts'), root, CONFIG), null);
});

test('tdd gate fires when a runner exists but the file has no test', () => {
  addFile('package.json', JSON.stringify({ devDependencies: { vitest: '^2.0.0' } }));
  const finding = checkTddGate(addFile('src/login.ts'), root, CONFIG);
  assert.equal(finding?.gate, 'tdd');
  assert.match(finding.message, /npx vitest run/);
  assert.match(finding.message, /login\.test\.ts/);
});

test('tdd gate is satisfied by a colocated test', () => {
  addFile('package.json', JSON.stringify({ devDependencies: { vitest: '^2.0.0' } }));
  addFile('src/login.test.ts', 'test("x", () => {});');
  assert.equal(checkTddGate(addFile('src/login.ts'), root, CONFIG), null);
});

test('tdd gate is satisfied by a test in a tests directory', () => {
  addFile('package.json', JSON.stringify({ devDependencies: { jest: '^29.0.0' } }));
  addFile('tests/login.test.ts', 'test("x", () => {});');
  assert.equal(checkTddGate(addFile('src/login.ts'), root, CONFIG), null);
});

test('detects python and dotnet stacks', () => {
  const pythonRoot = mkdtempSync(join(tmpdir(), 'agent-sdlc-py-'));
  writeFileSync(join(pythonRoot, 'pytest.ini'), '');
  assert.equal(detectStack(pythonRoot).id, 'pytest');
  rmSync(pythonRoot, { recursive: true, force: true });

  const dotnetRoot = mkdtempSync(join(tmpdir(), 'agent-sdlc-cs-'));
  writeFileSync(join(dotnetRoot, 'App.csproj'), '');
  assert.equal(detectStack(dotnetRoot).id, 'dotnet');
  rmSync(dotnetRoot, { recursive: true, force: true });
});
