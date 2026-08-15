/**
 * Session start context.
 *
 * Injects only what changes the agent's first decision: the constitution, which
 * feature is active, which phase it is in, and what the gates will enforce.
 * Anything longer than a screen would cost more context than it saves.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { logDebug } from './log.mjs';

const CONSTITUTION_FILE = 'constitution.md';
const MAX_CONSTITUTION_CHARS = 2000;

const PHASE_BY_ARTIFACT = [
  { file: 'execution-plan.md', phase: 'build', nextRole: 'developer (tdd-implement)' },
  { file: 'test-cases.md', phase: 'planning', nextRole: 'project-manager (work-breakdown)' },
  { file: 'lld.md', phase: 'test design', nextRole: 'qa (test-case-author)' },
  { file: 'hld.md', phase: 'design', nextRole: 'architect (lld-author)' },
  { file: 'frd.md', phase: 'design', nextRole: 'architect (hld-author)' },
  { file: 'brd.md', phase: 'analysis', nextRole: 'business-analyst (frd-author)' },
];

/** @param {string} dir @returns {string[]} */
const subdirectories = (dir) => {
  try {
    return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
  } catch {
    return [];
  }
};

/**
 * @param {string} featureDir
 * @returns {{ phase: string, nextRole: string }}
 */
const phaseOf = (featureDir) => {
  for (const { file, phase, nextRole } of PHASE_BY_ARTIFACT) {
    if (existsSync(join(featureDir, file))) return { phase, nextRole };
  }
  return { phase: 'discovery', nextRole: 'business-analyst (brd-author)' };
};

/**
 * @param {string} root Absolute workspace root.
 * @param {import('./config.mjs').ISdlcConfig} config
 * @returns {string} Markdown context, or an empty string when there is nothing useful to say.
 */
export const buildSessionContext = (root, config) => {
  if (!config.sessionContext) return '';

  const docsDir = join(root, ...config.docsRoot.split('/'));
  if (!existsSync(docsDir)) {
    logDebug('no docs root, skipping session context');
    return '';
  }

  const sections = ['## Active SDLC state (agent-sdlc)'];

  const constitutionPath = join(docsDir, CONSTITUTION_FILE);
  if (existsSync(constitutionPath)) {
    const text = readFileSync(constitutionPath, 'utf8').trim();
    const clipped =
      text.length > MAX_CONSTITUTION_CHARS
        ? `${text.slice(0, MAX_CONSTITUTION_CHARS)}\n\n[truncated — full text at ${config.docsRoot}/${CONSTITUTION_FILE}]`
        : text;
    sections.push(`### Constitution\n\n${clipped}`);
  }

  const features = subdirectories(docsDir);
  if (features.length > 0) {
    const rows = features
      .sort()
      .reverse()
      .map((feature) => {
        const { phase, nextRole } = phaseOf(join(docsDir, feature));
        return `| \`${feature}\` | ${phase} | ${nextRole} |`;
      });
    sections.push(
      ['### Features', '', '| Feature | Phase | Next role |', '| --- | --- | --- |', ...rows].join('\n'),
    );
  }

  const activeGates = Object.entries(config.gates)
    .filter(([, mode]) => mode !== 'off')
    .map(([gate, mode]) => `${gate}: ${mode}`)
    .join(', ');
  if (activeGates) sections.push(`### Active gates\n\n${activeGates}`);

  return sections.length > 1 ? sections.join('\n\n') : '';
};
