/**
 * Credential detection for content about to be written to disk.
 *
 * Patterns are deliberately specific. A scanner that fires on every string
 * containing the word "token" gets switched off within a day, and a switched-off
 * scanner catches nothing.
 *
 * @typedef {object} ISecretFinding
 * @property {string} label
 * @property {number} line
 */

const PLACEHOLDER_PATTERN = /(example|placeholder|dummy|your[-_]?|xxx|<[^>]+>|\$\{[^}]+\}|changeme|redacted)/i;

/** @type {{ label: string, pattern: RegExp }[]} */
const SECRET_PATTERNS = [
  { label: 'AWS access key id', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'GitHub token', pattern: /\b(gh[pousr]|github_pat)_[A-Za-z0-9_]{22,}\b/ },
  { label: 'Slack token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { label: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: 'Stripe secret key', pattern: /\bsk_live_[0-9A-Za-z]{16,}\b/ },
  { label: 'OpenAI API key', pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { label: 'private key block', pattern: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { label: 'JSON web token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  {
    label: 'connection string password',
    pattern: /(?:password|pwd)\s*=\s*(?!['"]?\s*(?:\$|<))['"]?[^;'"\s]{8,}/i,
  },
  {
    label: 'hardcoded credential assignment',
    pattern:
      /\b(?:api[_-]?key|secret|passwd|password|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*['"][^'"]{12,}['"]/i,
  },
];

/**
 * @param {string} content File content about to be written.
 * @returns {ISecretFinding[]} Empty when nothing credible was found.
 */
export const scanForSecrets = (content) => {
  if (typeof content !== 'string' || content.length === 0) return [];

  const findings = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (PLACEHOLDER_PATTERN.test(line)) return;
    for (const { label, pattern } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({ label, line: index + 1 });
        break;
      }
    }
  });

  return findings;
};

export { SECRET_PATTERNS };
