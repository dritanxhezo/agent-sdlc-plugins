/**
 * Issue and milestone operations.
 *
 * Task identity lives in the issue title as a "T-###" prefix. That prefix is the
 * join key between the specification documents, the board and the git history,
 * so it is parsed in exactly one place here.
 */

import { gh, ghJson } from './gh.mjs';

const TASK_TITLE_PATTERN = /^(T-\d{1,4})\b[\s:.-]*(.*)$/i;
const ISSUE_PAGE_SIZE = 200;

/** @param {string} title @returns {{ taskId: string, title: string } | null} */
export const parseTaskTitle = (title) => {
  const match = TASK_TITLE_PATTERN.exec(String(title ?? '').trim());
  if (!match) return null;
  return { taskId: match[1].toUpperCase(), title: match[2].trim() };
};

/** @param {string} taskId @param {string} title */
export const formatTaskTitle = (taskId, title) => `${taskId} ${title}`;

/**
 * @param {string} cwd
 * @returns {{ number: number, id: string, title: string, state: string, url: string, taskId: string | null }[]}
 */
export const listIssues = (cwd) => {
  const raw = ghJson(
    ['issue', 'list', '--state', 'all', '--limit', String(ISSUE_PAGE_SIZE), '--json',
      'number,id,title,state,url,milestone,labels,assignees'],
    { cwd },
  );

  return raw.map((issue) => ({
    ...issue,
    taskId: parseTaskTitle(issue.title)?.taskId ?? null,
  }));
};

/**
 * @param {string} taskId
 * @param {string} cwd
 * @returns {object | null}
 */
export const findIssueByTaskId = (taskId, cwd) => {
  const wanted = taskId.toUpperCase();
  return listIssues(cwd).find((issue) => issue.taskId === wanted) ?? null;
};

/**
 * Creates the milestone when absent. GitHub has no upsert, so a duplicate-title
 * failure is treated as success.
 *
 * @param {{ owner: string, repo: string }} repo
 * @param {string} title
 * @param {string} cwd
 * @returns {boolean} True when a milestone was created.
 */
export const ensureMilestone = (repo, title, cwd) => {
  const existing = ghJson(['api', `repos/${repo.owner}/${repo.repo}/milestones?state=all`], { cwd });
  if (existing.some((milestone) => milestone.title === title)) return false;

  gh(['api', `repos/${repo.owner}/${repo.repo}/milestones`, '-f', `title=${title}`], { cwd });
  return true;
};

/**
 * @param {object} args
 * @param {string} args.taskId
 * @param {string} args.title
 * @param {string} args.body
 * @param {string} [args.milestone]
 * @param {string} args.cwd
 * @returns {{ number: number, id: string, url: string, created: boolean }}
 */
export const createOrUpdateIssue = ({ taskId, title, body, milestone, cwd }) => {
  const existing = findIssueByTaskId(taskId, cwd);
  if (existing) {
    const args = ['issue', 'edit', String(existing.number), '--body', body];
    if (milestone) args.push('--milestone', milestone);
    gh(args, { cwd });
    return { number: existing.number, id: existing.id, url: existing.url, created: false };
  }

  const args = ['issue', 'create', '--title', formatTaskTitle(taskId, title), '--body', body];
  if (milestone) args.push('--milestone', milestone);
  const url = gh(args, { cwd });

  const created = findIssueByTaskId(taskId, cwd);
  return {
    number: created?.number ?? 0,
    id: created?.id ?? '',
    url: created?.url ?? url,
    created: true,
  };
};

/**
 * @param {number} issueNumber
 * @param {'open' | 'closed'} state
 * @param {string} cwd
 */
export const setIssueState = (issueNumber, state, cwd) => {
  const verb = state === 'closed' ? 'close' : 'reopen';
  gh(['issue', verb, String(issueNumber)], { cwd });
};

/**
 * @param {number} issueNumber
 * @param {string} login GitHub login, or "@me".
 * @param {string} cwd
 */
export const assignIssue = (issueNumber, login, cwd) => {
  gh(['issue', 'edit', String(issueNumber), '--add-assignee', login], { cwd });
};

/**
 * @param {object} args
 * @param {string} args.feature
 * @param {string} args.description
 * @param {string[]} args.traces
 * @param {string[]} args.dependsOn
 * @param {number} args.estimate
 * @param {string} args.definitionOfDone
 * @returns {string} Issue body markdown.
 */
export const renderIssueBody = ({ feature, description, traces, dependsOn, estimate, definitionOfDone }) =>
  [
    description,
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Feature | \`${feature}\` |`,
    `| Estimate | ${estimate} h |`,
    `| Depends on | ${dependsOn.length > 0 ? dependsOn.join(', ') : 'none'} |`,
    `| Traces to | ${traces.length > 0 ? traces.join(', ') : 'unspecified'} |`,
    '',
    '### Definition of done',
    '',
    definitionOfDone || 'Acceptance criteria met, tests green, linter clean, reviewed and merged.',
    '',
    '<!-- managed by agent-sdlc sdlc-tracker; edit via the tracker tools, not by hand -->',
  ].join('\n');
