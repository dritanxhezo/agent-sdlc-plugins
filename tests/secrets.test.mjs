import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanForSecrets } from '../plugins/agent-sdlc/hooks/lib/secrets.mjs';

test('detects a GitHub token', () => {
  const findings = scanForSecrets('const token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, 'GitHub token');
  assert.equal(findings[0].line, 1);
});

test('detects an AWS access key id', () => {
  const findings = scanForSecrets('AWS_KEY=AKIA3BQZTX9WLMNPQR7C');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, 'AWS access key id');
});

test('detects a private key block', () => {
  const findings = scanForSecrets('-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB\n');
  assert.equal(findings.length, 1);
});

test('detects a hardcoded credential assignment', () => {
  const findings = scanForSecrets('const apiKey = "s3cr3t-value-long-enough";');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, 'hardcoded credential assignment');
});

test('reports the correct line number', () => {
  const content = ['// header', '', 'password = "hunter2-hunter2"'].join('\n');
  const findings = scanForSecrets(content);
  assert.equal(findings[0].line, 3);
});

test('ignores obvious placeholders', () => {
  const samples = [
    'const apiKey = "your-api-key-here";',
    'password = "${DB_PASSWORD}"',
    'token = "<your-token>"',
    'const secret = "changeme-please-now";',
    'apiKey: "example-key-value-here"',
  ];
  for (const sample of samples) {
    assert.deepEqual(scanForSecrets(sample), [], `should ignore: ${sample}`);
  }
});

test('ignores ordinary code', () => {
  const content = [
    'const MAX_RETRIES = 3;',
    'export const login = async (username, password) => api.post("/login", { username, password });',
    'logDebug("token refreshed");',
  ].join('\n');
  assert.deepEqual(scanForSecrets(content), []);
});

test('reports at most one finding per line', () => {
  const findings = scanForSecrets('a=AKIA3BQZTX9WLMNPQR7C b=ghp_abcdefghijklmnopqrstuvwxyz01234');
  assert.equal(findings.length, 1);
});

test('treats a documented example key as a placeholder', () => {
  assert.deepEqual(scanForSecrets('AWS_KEY=AKIAIOSFODNN7EXAMPLE'), []);
});

test('handles empty and non-string input', () => {
  assert.deepEqual(scanForSecrets(''), []);
  assert.deepEqual(scanForSecrets(undefined), []);
  assert.deepEqual(scanForSecrets(null), []);
});
