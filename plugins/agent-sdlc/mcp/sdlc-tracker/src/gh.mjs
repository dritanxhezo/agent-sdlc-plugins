/**
 * GitHub access via the gh CLI.
 *
 * Shelling out to gh rather than embedding an API client means the server needs
 * no dependencies, no token handling and no auth flow of its own: it inherits
 * whatever the user has already authenticated.
 */

import { spawnSync } from 'node:child_process';

const GH_BINARY = 'gh';
const DEFAULT_TIMEOUT_MS = 30000;

export class GhError extends Error {
  /** @param {string} message @param {string} [detail] */
  constructor(message, detail) {
    super(detail ? `${message}: ${detail}` : message);
    this.name = 'GhError';
    this.detail = detail ?? '';
  }
}

/**
 * @param {string[]} args
 * @param {{ cwd?: string, input?: string }} [options]
 * @returns {string} stdout, trimmed.
 */
export const gh = (args, options = {}) => {
  const result = spawnSync(GH_BINARY, args, {
    cwd: options.cwd ?? process.cwd(),
    input: options.input,
    encoding: 'utf8',
    timeout: DEFAULT_TIMEOUT_MS,
    windowsHide: true,
  });

  if (result.error) {
    throw new GhError('could not run gh - is the GitHub CLI installed', result.error.message);
  }
  if (result.status !== 0) {
    throw new GhError(`gh ${args[0] ?? ''} failed`, (result.stderr ?? '').trim());
  }

  return (result.stdout ?? '').trim();
};

/**
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 * @returns {unknown} Parsed JSON stdout.
 */
export const ghJson = (args, options = {}) => {
  const raw = gh(args, options);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new GhError('gh returned unparseable JSON', error.message);
  }
};

/**
 * Runs a GraphQL document. Variables are passed as separate process arguments,
 * so no shell quoting is involved and multi-line queries are safe on Windows.
 *
 * @param {string} query
 * @param {Record<string, string | number>} [variables]
 * @param {{ cwd?: string }} [options]
 */
export const graphql = (query, variables = {}, options = {}) => {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    const flag = typeof value === 'number' ? '-F' : '-f';
    args.push(flag, `${key}=${value}`);
  }
  const payload = ghJson(args, options);
  if (payload && typeof payload === 'object' && 'errors' in payload) {
    throw new GhError('GraphQL error', JSON.stringify(payload.errors));
  }
  return payload.data ?? payload;
};

/**
 * @param {string} cwd
 * @returns {{ owner: string, repo: string, id: string, isInOrganization: boolean }}
 */
export const currentRepo = (cwd) => {
  const view = ghJson(['repo', 'view', '--json', 'owner,name,id,isInOrganization'], { cwd });
  return {
    owner: view.owner?.login ?? '',
    repo: view.name ?? '',
    id: view.id ?? '',
    isInOrganization: Boolean(view.isInOrganization),
  };
};

/** @returns {boolean} True when gh has the project scope needed for Projects v2. */
export const hasProjectScope = () => {
  const result = spawnSync(GH_BINARY, ['auth', 'status'], {
    encoding: 'utf8',
    timeout: DEFAULT_TIMEOUT_MS,
    windowsHide: true,
  });
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return /\bproject\b/.test(text);
};
