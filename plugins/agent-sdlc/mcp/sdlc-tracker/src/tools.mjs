/**
 * Tracker tool implementations.
 *
 * Each tool returns plain markdown. The agent reading it needs to know what
 * changed and what to do next, which a wall of JSON does not convey.
 */

import { currentRepo, hasProjectScope, GhError } from './gh.mjs';
import {
  findOrCreateProject,
  ensureFields,
  addIssueToProject,
  setFieldValue,
  listProjectItems,
  FIELD_ESTIMATE,
  FIELD_PHASE,
  FIELD_DEPENDS_ON,
  FIELD_STATUS,
  STATUS_TODO,
  STATUS_IN_PROGRESS,
  STATUS_IN_REVIEW,
  STATUS_DONE,
} from './project.mjs';
import {
  listIssues,
  findIssueByTaskId,
  ensureMilestone,
  createOrUpdateIssue,
  setIssueState,
  assignIssue,
  renderIssueBody,
  parseTaskTitle,
} from './issues.mjs';
import { buildGraph, parseDependsOn } from './graph.mjs';
import { renderGantt } from './gantt.mjs';

const DEFAULT_PROJECT_TITLE = 'SDLC Execution Plan';
const DEFAULT_ESTIMATE_HOURS = 4;
const UNPHASED = 'Unphased';

/** Status names that may be missing from a board, and what to fall back to. */
const STATUS_FALLBACKS = {
  [STATUS_IN_REVIEW]: [STATUS_IN_REVIEW, STATUS_IN_PROGRESS, STATUS_TODO],
  [STATUS_IN_PROGRESS]: [STATUS_IN_PROGRESS, STATUS_TODO],
  [STATUS_DONE]: [STATUS_DONE],
  [STATUS_TODO]: [STATUS_TODO],
};

/**
 * @param {object} args
 * @param {string} args.cwd
 * @param {string} [args.projectTitle]
 */
const resolveContext = ({ cwd, projectTitle }) => {
  const repo = currentRepo(cwd);
  const project = findOrCreateProject(repo, projectTitle ?? DEFAULT_PROJECT_TITLE, cwd);
  return { repo, project, cwd };
};

/**
 * @param {object} ctx
 * @returns {import('./graph.mjs').ITask[]}
 */
const readTasks = ({ project, cwd }) => {
  const items = listProjectItems(project.id, cwd);
  const tasks = [];

  for (const item of items) {
    const content = item.content;
    if (!content?.title) continue;
    const parsed = parseTaskTitle(content.title);
    if (!parsed) continue;

    const statusValue = item.values[FIELD_STATUS];
    tasks.push({
      taskId: parsed.taskId,
      title: parsed.title,
      phase: item.values[FIELD_PHASE] ?? content.milestone?.title ?? UNPHASED,
      status: statusValue ?? (content.state === 'CLOSED' ? STATUS_DONE : STATUS_TODO),
      estimate: Number(item.values[FIELD_ESTIMATE] ?? 0),
      dependsOn: parseDependsOn(item.values[FIELD_DEPENDS_ON]),
      assignees: (content.assignees?.nodes ?? []).map((node) => node.login),
      issueNumber: content.number,
      url: content.url,
      itemId: item.itemId,
    });
  }

  return tasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
};

/** @param {string} text */
const asResult = (text) => ({ content: [{ type: 'text', text }], isError: false });

/** @param {string} text */
const asError = (text) => ({ content: [{ type: 'text', text }], isError: true });

const trackerInit = ({ cwd, projectTitle }) => {
  const scopeWarning = hasProjectScope()
    ? ''
    : '\n\nWarning: the gh token appears to lack the `project` scope. ' +
      'Run `gh auth refresh -s project` before syncing a plan.';

  const { repo, project } = resolveContext({ cwd, projectTitle });
  const { created, fields } = ensureFields(project, cwd);

  return asResult(
    [
      `Board ready: **${project.title}** (project #${project.number}) on ${repo.owner}/${repo.repo}.`,
      '',
      `Fields present: ${Object.keys(fields).join(', ')}`,
      created.length > 0 ? `Fields created now: ${created.join(', ')}` : 'No new fields needed.',
      scopeWarning,
    ].join('\n'),
  );
};

const planSync = ({ cwd, projectTitle, feature, phases }) => {
  if (!Array.isArray(phases) || phases.length === 0) {
    return asError('plan_sync needs at least one phase containing tasks.');
  }

  const { repo, project } = resolveContext({ cwd, projectTitle });
  const { fields } = ensureFields(project, cwd);

  const createdIssues = [];
  const updatedIssues = [];
  const milestonesCreated = [];

  for (const phase of phases) {
    const phaseName = phase.name ?? UNPHASED;
    if (ensureMilestone(repo, phaseName, cwd)) milestonesCreated.push(phaseName);

    for (const task of phase.tasks ?? []) {
      const taskId = String(task.id ?? '').toUpperCase();
      if (!/^T-\d{1,4}$/.test(taskId)) {
        return asError(`"${task.id}" is not a valid task id; expected the form T-001.`);
      }

      const estimate = Number(task.estimate ?? DEFAULT_ESTIMATE_HOURS);
      const dependsOn = (task.dependsOn ?? []).map((id) => String(id).toUpperCase());

      const body = renderIssueBody({
        feature: feature ?? 'unspecified',
        description: task.description ?? '',
        traces: task.traces ?? [],
        dependsOn,
        estimate,
        definitionOfDone: task.definitionOfDone ?? '',
      });

      const issue = createOrUpdateIssue({
        taskId,
        title: task.title ?? taskId,
        body,
        milestone: phaseName,
        cwd,
      });
      (issue.created ? createdIssues : updatedIssues).push(`${taskId} (#${issue.number})`);

      const itemId = addIssueToProject(project.id, issue.id, cwd);
      setFieldValue({ projectId: project.id, itemId, field: fields[FIELD_PHASE], value: phaseName, cwd });
      setFieldValue({ projectId: project.id, itemId, field: fields[FIELD_ESTIMATE], value: estimate, cwd });
      setFieldValue({
        projectId: project.id,
        itemId,
        field: fields[FIELD_DEPENDS_ON],
        value: dependsOn.join(', '),
        cwd,
      });
    }
  }

  const graph = buildGraph(readTasks({ project, cwd }));

  return asResult(
    [
      `Synced ${createdIssues.length + updatedIssues.length} tasks to ${repo.owner}/${repo.repo} ` +
        `on project #${project.number}.`,
      '',
      `Created: ${createdIssues.join(', ') || 'none'}`,
      `Updated: ${updatedIssues.join(', ') || 'none'}`,
      `Milestones created: ${milestonesCreated.join(', ') || 'none'}`,
      '',
      graph.cycles.length > 0
        ? `**Dependency cycle detected** among: ${graph.cycles[0].join(', ')}. Resolve it before starting work.`
        : `Dependency order verified across ${graph.order.length} tasks.`,
      graph.missing.length > 0 ? `Unknown dependencies referenced: ${graph.missing.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
};

const taskList = ({ cwd, projectTitle, status, phase }) => {
  const ctx = resolveContext({ cwd, projectTitle });
  let tasks = readTasks(ctx);

  if (status) tasks = tasks.filter((task) => task.status.toLowerCase() === String(status).toLowerCase());
  if (phase) tasks = tasks.filter((task) => task.phase.toLowerCase() === String(phase).toLowerCase());

  if (tasks.length === 0) return asResult('No tasks match. Run plan_sync to publish a work breakdown.');

  const graph = buildGraph(tasks);
  const blocked = new Set();
  for (const task of tasks) {
    const unmet = task.dependsOn.filter((id) => {
      const dep = tasks.find((candidate) => candidate.taskId === id);
      return dep && dep.status !== STATUS_DONE;
    });
    if (unmet.length > 0) blocked.add(task.taskId);
  }

  const rows = tasks.map(
    (task) =>
      `| ${task.taskId} | ${task.title} | ${task.phase} | ${task.status} | ${task.estimate}h | ` +
      `${task.dependsOn.join(' ') || '-'} | ${blocked.has(task.taskId) ? 'blocked' : 'ready'} | ` +
      `${task.assignees.join(' ') || '-'} | #${task.issueNumber} |`,
  );

  const nextUp = graph.order.filter(
    (id) => !blocked.has(id) && tasks.find((task) => task.taskId === id)?.status === STATUS_TODO,
  );

  return asResult(
    [
      '| Task | Title | Phase | Status | Est | Depends on | Ready | Assignee | Issue |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      ...rows,
      '',
      `Next unblocked: ${nextUp.slice(0, 5).join(', ') || 'nothing ready'}`,
    ].join('\n'),
  );
};

const taskUpdate = ({ cwd, projectTitle, id, status, estimate, dependsOn, assignee, close }) => {
  const taskId = String(id ?? '').toUpperCase();
  if (!/^T-\d{1,4}$/.test(taskId)) return asError(`"${id}" is not a valid task id; expected T-001.`);

  const ctx = resolveContext({ cwd, projectTitle });
  const { project } = ctx;
  const { fields } = ensureFields(project, cwd);

  const task = readTasks(ctx).find((candidate) => candidate.taskId === taskId);
  if (!task) return asError(`${taskId} is not on the board. Run plan_sync first.`);

  const changes = [];

  if (status) {
    const statusField = fields[FIELD_STATUS];
    const attempts = STATUS_FALLBACKS[canonicalStatus(status)] ?? [canonicalStatus(status)];
    const applied = attempts.find((candidate) => {
      try {
        setFieldValue({ projectId: project.id, itemId: task.itemId, field: statusField, value: candidate, cwd });
        return true;
      } catch {
        return false;
      }
    });
    changes.push(applied ? `status -> ${applied}` : `status could not be set (no matching board option)`);

    if (canonicalStatus(status) === STATUS_DONE || close === true) {
      setIssueState(task.issueNumber, 'closed', cwd);
      changes.push(`issue #${task.issueNumber} closed`);
    }
  }

  if (estimate !== undefined) {
    setFieldValue({ projectId: project.id, itemId: task.itemId, field: fields[FIELD_ESTIMATE], value: Number(estimate), cwd });
    changes.push(`estimate -> ${estimate}h`);
  }

  if (Array.isArray(dependsOn)) {
    const value = dependsOn.map((entry) => String(entry).toUpperCase()).join(', ');
    setFieldValue({ projectId: project.id, itemId: task.itemId, field: fields[FIELD_DEPENDS_ON], value, cwd });
    changes.push(`depends on -> ${value || 'none'}`);
  }

  if (assignee) {
    assignIssue(task.issueNumber, String(assignee), cwd);
    changes.push(`assigned to ${assignee}`);
  }

  return asResult(`${taskId}: ${changes.join('; ') || 'nothing to change'}`);
};

/** @param {string} value */
const canonicalStatus = (value) => {
  const normalised = String(value).trim().toLowerCase();
  if (['done', 'closed', 'complete', 'completed', 'merged'].includes(normalised)) return STATUS_DONE;
  if (['in review', 'review', 'in-review'].includes(normalised)) return STATUS_IN_REVIEW;
  if (['in progress', 'in-progress', 'doing', 'active'].includes(normalised)) return STATUS_IN_PROGRESS;
  return STATUS_TODO;
};

const dependencyGraph = ({ cwd, projectTitle }) => {
  const tasks = readTasks(resolveContext({ cwd, projectTitle }));
  if (tasks.length === 0) return asResult('No tasks on the board yet.');

  const graph = buildGraph(tasks);

  return asResult(
    [
      `Execution order (${graph.order.length} tasks): ${graph.order.join(' -> ')}`,
      '',
      `Critical path: ${graph.criticalPath.join(' -> ') || 'none'} (${graph.criticalHours}h)`,
      graph.cycles.length > 0 ? `**Cycle:** ${graph.cycles[0].join(', ')}` : 'No cycles.',
      graph.missing.length > 0 ? `Unknown dependencies: ${graph.missing.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
};

const renderGanttTool = ({ cwd, projectTitle, title, startDate }) => {
  const tasks = readTasks(resolveContext({ cwd, projectTitle }));
  if (tasks.length === 0) return asResult('No tasks to chart yet.');

  const graph = buildGraph(tasks);
  const chart = renderGantt(tasks, {
    title: title ?? 'Execution plan',
    startDate: startDate ?? new Date().toISOString().slice(0, 10),
    order: graph.order,
  });

  return asResult(['```mermaid', chart, '```'].join('\n'));
};

const planStatus = ({ cwd, projectTitle }) => {
  const tasks = readTasks(resolveContext({ cwd, projectTitle }));
  if (tasks.length === 0) return asResult('No tasks on the board yet.');

  const graph = buildGraph(tasks);
  const phases = [...new Set(tasks.map((task) => task.phase))];

  const rows = phases.map((phase) => {
    const inPhase = tasks.filter((task) => task.phase === phase);
    const done = inPhase.filter((task) => task.status === STATUS_DONE).length;
    const hours = inPhase.reduce((sum, task) => sum + task.estimate, 0);
    const remaining = inPhase
      .filter((task) => task.status !== STATUS_DONE)
      .reduce((sum, task) => sum + task.estimate, 0);
    return `| ${phase} | ${done}/${inPhase.length} | ${hours}h | ${remaining}h |`;
  });

  const blocked = tasks.filter((task) =>
    task.dependsOn.some((id) => {
      const dep = tasks.find((candidate) => candidate.taskId === id);
      return dep && dep.status !== STATUS_DONE;
    }),
  );

  const totalDone = tasks.filter((task) => task.status === STATUS_DONE).length;

  return asResult(
    [
      `**${totalDone}/${tasks.length} tasks done.**`,
      '',
      '| Phase | Done | Estimated | Remaining |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
      `Critical path: ${graph.criticalPath.join(' -> ') || 'none'} (${graph.criticalHours}h)`,
      `Blocked: ${blocked.map((task) => task.taskId).join(', ') || 'nothing blocked'}`,
      graph.cycles.length > 0 ? `**Cycle:** ${graph.cycles[0].join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
};

const CWD_PROPERTY = {
  cwd: { type: 'string', description: 'Absolute path to the target repository. Defaults to the server working directory.' },
  projectTitle: { type: 'string', description: `Project board title. Defaults to "${DEFAULT_PROJECT_TITLE}".` },
};

/** @type {{ name: string, description: string, inputSchema: object, handler: Function }[]} */
export const TOOLS = [
  {
    name: 'tracker_init',
    description:
      'Creates or adopts the GitHub Projects v2 board for this repository and ensures the Estimate, Phase and Depends On custom fields exist. Run once per repository before syncing a plan.',
    inputSchema: { type: 'object', properties: { ...CWD_PROPERTY } },
    handler: trackerInit,
  },
  {
    name: 'plan_sync',
    description:
      'Publishes a work breakdown to GitHub as the single source of truth: one issue per task, one milestone per phase, and Estimate, Phase and Depends On written to the project board. Idempotent - existing tasks are updated, not duplicated.',
    inputSchema: {
      type: 'object',
      required: ['phases'],
      properties: {
        ...CWD_PROPERTY,
        feature: { type: 'string', description: 'Feature slug, for example 001-user-onboarding.' },
        phases: {
          type: 'array',
          description: 'Phases in execution order.',
          items: {
            type: 'object',
            required: ['name', 'tasks'],
            properties: {
              name: { type: 'string' },
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'title'],
                  properties: {
                    id: { type: 'string', description: 'Task id in the form T-001.' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    estimate: { type: 'number', description: 'Ideal hours.' },
                    dependsOn: { type: 'array', items: { type: 'string' } },
                    traces: { type: 'array', items: { type: 'string' }, description: 'FR or component ids.' },
                    definitionOfDone: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: planSync,
  },
  {
    name: 'task_list',
    description:
      'Lists tasks with status, phase, estimate, dependencies and whether each is ready to start, plus the next unblocked tasks. Use before picking up work.',
    inputSchema: {
      type: 'object',
      properties: {
        ...CWD_PROPERTY,
        status: { type: 'string', description: 'Filter: Todo, In Progress, In Review or Done.' },
        phase: { type: 'string', description: 'Filter by phase name.' },
      },
    },
    handler: taskList,
  },
  {
    name: 'task_update',
    description:
      'Updates one task on GitHub: status, estimate, dependencies or assignee. Setting status to Done also closes the issue. This is the only supported way to change task state.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        ...CWD_PROPERTY,
        id: { type: 'string', description: 'Task id in the form T-001.' },
        status: { type: 'string', description: 'Todo, In Progress, In Review or Done.' },
        estimate: { type: 'number', description: 'Ideal hours.' },
        dependsOn: { type: 'array', items: { type: 'string' } },
        assignee: { type: 'string', description: 'GitHub login to assign, or @me.' },
        close: { type: 'boolean', description: 'Close the issue regardless of status.' },
      },
    },
    handler: taskUpdate,
  },
  {
    name: 'dependency_graph',
    description:
      'Returns tasks in a valid execution order, the critical path by summed estimate, any dependency cycles, and any dependencies referencing unknown tasks.',
    inputSchema: { type: 'object', properties: { ...CWD_PROPERTY } },
    handler: dependencyGraph,
  },
  {
    name: 'render_gantt',
    description:
      'Generates the Mermaid Gantt chart from live task data, sectioned by phase and anchored on real dependencies. Use this instead of hand-writing a chart.',
    inputSchema: {
      type: 'object',
      properties: {
        ...CWD_PROPERTY,
        title: { type: 'string' },
        startDate: { type: 'string', description: 'ISO date the plan starts, YYYY-MM-DD.' },
      },
    },
    handler: renderGanttTool,
  },
  {
    name: 'plan_status',
    description:
      'Roll-up of progress: per-phase completion counts, estimated versus remaining hours, the critical path and every blocked task.',
    inputSchema: { type: 'object', properties: { ...CWD_PROPERTY } },
    handler: planStatus,
  },
];

/**
 * @param {string} name
 * @param {object} args
 * @returns {{ content: object[], isError: boolean }}
 */
export const callTool = (name, args) => {
  const tool = TOOLS.find((candidate) => candidate.name === name);
  if (!tool) return asError(`Unknown tool: ${name}`);

  try {
    return tool.handler({ ...args, cwd: args.cwd ?? process.cwd() });
  } catch (error) {
    if (error instanceof GhError) {
      return asError(
        `GitHub operation failed: ${error.message}\n\n` +
          'Check that gh is authenticated (`gh auth status`) and that the token has the ' +
          '`repo` and `project` scopes (`gh auth refresh -s project`).',
      );
    }
    return asError(`${name} failed: ${error.message}`);
  }
};

export { DEFAULT_PROJECT_TITLE, readTasks, resolveContext, canonicalStatus, listIssues, findIssueByTaskId };
