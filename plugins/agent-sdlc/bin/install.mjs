#!/usr/bin/env node
/**
 * Installs this plugin into a target repository or user profile.
 *
 * All three clients can install this repository as a plugin from its marketplace
 * manifest, so this script is nobody's primary route. It vendors the components as
 * loose files instead, for people who want them committed to a repository or dropped
 * into a profile without registering a marketplace. The Copilot path additionally
 * rewrites the subagents into Copilot's documented `.agent.md` naming.
 *
 * Usage:
 *   node install.mjs --tool copilot [--target <dir>] [--scope project|user] [--dry-run]
 *   node install.mjs --tool cursor  [--target <dir>]
 *   node install.mjs --tool claude  [--target <dir>]
 */

import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_NAME = 'agent-sdlc';

const TOOL_COPILOT = 'copilot';
const TOOL_CURSOR = 'cursor';
const TOOL_CLAUDE = 'claude';
const SUPPORTED_TOOLS = [TOOL_COPILOT, TOOL_CURSOR, TOOL_CLAUDE];

const SCOPE_PROJECT = 'project';
const SCOPE_USER = 'user';

const INSTRUCTIONS_HEADING = '<!-- agent-sdlc:begin -->';
const INSTRUCTIONS_FOOTER = '<!-- agent-sdlc:end -->';

/** @typedef {object} IInstallOptions
 * @property {string} tool
 * @property {string} target
 * @property {string} scope
 * @property {boolean} dryRun
 */

/** @param {string[]} argv @returns {IInstallOptions} */
const parseOptions = (argv) => {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      index += 1;
    }
  }

  return {
    tool: String(flags.tool ?? ''),
    target: String(flags.target ?? process.cwd()),
    scope: flags.scope === SCOPE_USER ? SCOPE_USER : SCOPE_PROJECT,
    dryRun: flags['dry-run'] === true,
  };
};

const actions = [];

/** @param {string} description */
const record = (description) => actions.push(description);

/** @param {string} from @param {string} to @param {boolean} dryRun */
const copyTree = (from, to, dryRun) => {
  if (!existsSync(from)) return;
  record(`copy ${basename(from)}/ -> ${to}`);
  if (dryRun) return;
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
};

/** @param {string} path @param {string} body @param {boolean} dryRun */
const writeFile = (path, body, dryRun) => {
  record(`write ${path}`);
  if (dryRun) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, 'utf8');
};

/** @param {string} raw @returns {{ fields: Record<string,string>, body: string }} */
const splitFrontmatter = (raw) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { fields: {}, body: raw };

  const fields = {};
  let key = null;
  for (const line of match[1].split(/\r?\n/)) {
    const keyed = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (keyed) {
      key = keyed[1];
      fields[key] = keyed[2].trim();
    } else if (key && line.trim()) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
    }
  }
  return { fields, body: match[2] };
};

/**
 * Copilot documents agents as `<name>.agent.md` and keys off name and description
 * only, so each subagent is rewritten rather than copied. Plain `.md` also loads in
 * Copilot 1.0.80, but the documented convention is the safer thing to write out.
 *
 * @param {string} targetDir
 * @param {boolean} dryRun
 */
const generateCopilotAgents = (targetDir, dryRun) => {
  const sourceDir = join(PLUGIN_ROOT, 'agents');
  if (!existsSync(sourceDir)) return;

  for (const file of readdirSync(sourceDir).filter((name) => name.endsWith('.md'))) {
    const { fields, body } = splitFrontmatter(readFileSync(join(sourceDir, file), 'utf8'));
    const name = fields.name ?? basename(file, '.md');
    const frontmatter = [
      '---',
      `name: ${name}`,
      `description: ${fields.description ?? ''}`,
      '---',
      '',
    ].join('\n');
    writeFile(join(targetDir, `${name}.agent.md`), `${frontmatter}${body.trim()}\n`, dryRun);
  }
};

/**
 * A vendored install has no plugin manifest behind it to carry the conventions, so
 * they are stated in the always-on instructions file instead. The block is delimited
 * so a reinstall replaces only our section.
 *
 * @param {string} target
 * @param {boolean} dryRun
 */
const updateCopilotInstructions = (target, dryRun) => {
  const path = join(target, '.github', 'copilot-instructions.md');
  const block = [
    INSTRUCTIONS_HEADING,
    '## SDLC pipeline (agent-sdlc)',
    '',
    'This repository uses a role-based SDLC pipeline. Skills are in `.github/skills/` and',
    'role agents in `.github/agents/`.',
    '',
    '- Artifacts live in `docs/sdlc/<feature>/`: `brd.md`, `frd.md`, `hld.md`, `lld.md`,',
    '  `test-cases.md`, `work-breakdown.md`, `execution-plan.md`.',
    '- Identifiers are stable and traceable: `BR-###` to `FR-###` to `C-###` to `TC-###` to `T-###`.',
    '- Tasks live in GitHub Issues with estimates, phase and dependencies on the Projects v2',
    '  board. `execution-plan.md` is generated - never hand-edit its task table or Gantt chart.',
    '- Write the failing test before the implementation, and confirm it fails for the expected',
    '  reason.',
    '- Never disable or bypass a lint rule to make code pass.',
    '',
    'This generator does not wire up the spec and TDD gate hooks, so following them here is',
    'your responsibility.',
    INSTRUCTIONS_FOOTER,
  ].join('\n');

  let existing = '';
  if (existsSync(path)) existing = readFileSync(path, 'utf8');

  const startIndex = existing.indexOf(INSTRUCTIONS_HEADING);
  const endIndex = existing.indexOf(INSTRUCTIONS_FOOTER);

  let body;
  if (startIndex !== -1 && endIndex !== -1) {
    body = existing.slice(0, startIndex) + block + existing.slice(endIndex + INSTRUCTIONS_FOOTER.length);
  } else {
    body = existing.trim().length > 0 ? `${existing.trimEnd()}\n\n${block}\n` : `${block}\n`;
  }

  writeFile(path, body, dryRun);
};

/** @param {string} target @param {boolean} dryRun */
const writeCopilotMcpConfig = (target, dryRun) => {
  const source = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'mcp.source.json'), 'utf8'));
  const servers = {};

  for (const [name, definition] of Object.entries(source.servers ?? {})) {
    const { description, pluginRelativeArgs, ...rest } = definition;
    const server = { ...rest };
    if (pluginRelativeArgs) {
      server.args = pluginRelativeArgs.map((arg) => join(PLUGIN_ROOT, arg));
    }
    servers[name] = server;
  }

  const path = join(target, '.vscode', 'mcp.json');
  writeFile(path, `${JSON.stringify({ servers }, null, 2)}\n`, dryRun);
};

/** @param {IInstallOptions} options */
const installCopilot = (options) => {
  const base =
    options.scope === SCOPE_USER ? join(homedir(), '.copilot') : join(options.target, '.github');

  copyTree(join(PLUGIN_ROOT, 'skills'), join(base, 'skills'), options.dryRun);
  generateCopilotAgents(join(base, 'agents'), options.dryRun);

  if (options.scope === SCOPE_PROJECT) {
    updateCopilotInstructions(options.target, options.dryRun);
    writeCopilotMcpConfig(options.target, options.dryRun);
  }
};

/** @param {IInstallOptions} options */
const installCursor = (options) => {
  const base =
    options.scope === SCOPE_USER
      ? join(homedir(), '.cursor', 'plugins', 'local', PLUGIN_NAME)
      : join(options.target, '.cursor');

  if (options.scope === SCOPE_USER) {
    copyTree(PLUGIN_ROOT, base, options.dryRun);
    return;
  }

  copyTree(join(PLUGIN_ROOT, 'skills'), join(base, 'skills'), options.dryRun);
  copyTree(join(PLUGIN_ROOT, 'agents'), join(base, 'agents'), options.dryRun);
  copyTree(join(PLUGIN_ROOT, 'rules'), join(base, 'rules'), options.dryRun);
};

/** @param {IInstallOptions} options */
const installClaude = (options) => {
  const base =
    options.scope === SCOPE_USER ? join(homedir(), '.claude') : join(options.target, '.claude');

  copyTree(join(PLUGIN_ROOT, 'skills'), join(base, 'skills'), options.dryRun);
  copyTree(join(PLUGIN_ROOT, 'agents'), join(base, 'agents'), options.dryRun);
};

const INSTALLERS = {
  [TOOL_COPILOT]: installCopilot,
  [TOOL_CURSOR]: installCursor,
  [TOOL_CLAUDE]: installClaude,
};

const main = () => {
  const options = parseOptions(process.argv.slice(2));

  if (!SUPPORTED_TOOLS.includes(options.tool)) {
    process.stderr.write(
      `Usage: node install.mjs --tool <${SUPPORTED_TOOLS.join('|')}> ` +
        '[--target <dir>] [--scope project|user] [--dry-run]\n',
    );
    return 1;
  }

  if (!existsSync(options.target) || !statSync(options.target).isDirectory()) {
    process.stderr.write(`Target is not a directory: ${options.target}\n`);
    return 1;
  }

  INSTALLERS[options.tool](options);

  const heading = options.dryRun
    ? `Dry run for ${options.tool} (${options.scope} scope), nothing written:`
    : `Installed agent-sdlc for ${options.tool} (${options.scope} scope):`;
  process.stdout.write([heading, ...actions.map((action) => `  ${action}`), ''].join('\n'));

  if (options.tool === TOOL_COPILOT && !options.dryRun) {
    process.stdout.write(
      '\nThe spec and TDD gates are advisory in a vendored install: no hooks were wired up. ' +
        'They were written into .github/copilot-instructions.md instead.\n',
    );
  }

  return 0;
};

process.exit(main());
