/**
 * Mermaid Gantt rendering.
 *
 * The chart is always derived from live task data. Nothing here is persisted, so
 * a stale chart is impossible by construction: it is regenerated on request.
 */

const HOURS_PER_DAY = 6;
const DATE_FORMAT = 'YYYY-MM-DD';
const STATUS_TAGS = {
  Done: 'done',
  'In Progress': 'active',
  'In Review': 'active',
  Todo: '',
};

/** @param {string} value @returns {string} A Mermaid-safe task label. */
const escapeLabel = (value) =>
  String(value ?? '')
    .replace(/[:#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** @param {number} hours @returns {string} Mermaid duration token. */
const toDuration = (hours) => {
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 1;
  if (safeHours < HOURS_PER_DAY) return `${Math.max(1, Math.round(safeHours))}h`;
  return `${Math.max(1, Math.round(safeHours / HOURS_PER_DAY))}d`;
};

/**
 * @param {import('./graph.mjs').ITask[]} tasks
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.startDate ISO date the plan begins.
 * @param {string[]} options.order Execution order from the dependency graph.
 * @returns {string} A Mermaid gantt code block body.
 */
export const renderGantt = (tasks, { title, startDate, order }) => {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean);
  const scheduled = new Set();

  const lines = [
    'gantt',
    `    title ${escapeLabel(title)}`,
    `    dateFormat ${DATE_FORMAT}`,
    '    axisFormat %d %b',
    '    excludes weekends',
  ];

  const phases = [...new Set(ordered.map((task) => task.phase || 'Unphased'))];

  for (const phase of phases) {
    lines.push('', `    section ${escapeLabel(phase)}`);

    for (const task of ordered.filter((candidate) => (candidate.phase || 'Unphased') === phase)) {
      const tag = STATUS_TAGS[task.status] ?? '';
      const scheduledDeps = task.dependsOn.filter((id) => scheduled.has(id));
      const anchor =
        scheduledDeps.length > 0
          ? `after ${scheduledDeps.join(' ')}`
          : scheduled.size === 0
            ? startDate
            : `after ${[...scheduled].pop()}`;

      const metadata = [tag, task.taskId, anchor, toDuration(task.estimate)]
        .filter((part) => part !== '')
        .join(', ');

      lines.push(`    ${escapeLabel(task.title) || task.taskId} :${metadata}`);
      scheduled.add(task.taskId);
    }
  }

  return lines.join('\n');
};

export { HOURS_PER_DAY, DATE_FORMAT };
