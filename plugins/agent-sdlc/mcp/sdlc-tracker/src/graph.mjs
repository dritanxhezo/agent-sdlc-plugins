/**
 * Dependency ordering and critical path.
 *
 * @typedef {object} ITask
 * @property {string} taskId
 * @property {string} title
 * @property {string} phase
 * @property {string} status
 * @property {number} estimate
 * @property {string[]} dependsOn
 *
 * @typedef {object} IGraphResult
 * @property {string[]} order        Task ids in a valid execution order.
 * @property {string[][]} cycles     Any dependency cycles found.
 * @property {string[]} missing      Referenced task ids that do not exist.
 * @property {string[]} criticalPath Longest chain by summed estimate.
 * @property {number} criticalHours
 */

const CYCLE_SENTINEL = 'cycle';

/** @param {string} value @returns {string[]} */
export const parseDependsOn = (value) =>
  String(value ?? '')
    .split(/[,;]/)
    .map((part) => part.trim().toUpperCase())
    .filter((part) => /^T-\d{1,4}$/.test(part));

/**
 * Kahn's algorithm, retaining unresolved nodes so cycles can be reported rather
 * than silently dropped.
 *
 * @param {ITask[]} tasks
 * @returns {IGraphResult}
 */
export const buildGraph = (tasks) => {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const missing = new Set();

  /** @type {Map<string, string[]>} */
  const dependencies = new Map();
  for (const task of tasks) {
    const resolved = task.dependsOn.filter((id) => {
      if (byId.has(id)) return true;
      missing.add(id);
      return false;
    });
    dependencies.set(task.taskId, resolved);
  }

  const remaining = new Set(byId.keys());
  const order = [];

  let progressed = true;
  while (remaining.size > 0 && progressed) {
    progressed = false;
    for (const id of [...remaining].sort()) {
      const deps = dependencies.get(id) ?? [];
      if (deps.every((dep) => !remaining.has(dep))) {
        order.push(id);
        remaining.delete(id);
        progressed = true;
      }
    }
  }

  const cycles = remaining.size > 0 ? [[...remaining]] : [];

  return {
    order,
    cycles,
    missing: [...missing],
    ...longestPath(order, dependencies, byId),
  };
};

/**
 * @param {string[]} order
 * @param {Map<string, string[]>} dependencies
 * @param {Map<string, ITask>} byId
 */
const longestPath = (order, dependencies, byId) => {
  /** @type {Map<string, { hours: number, from: string | null }>} */
  const best = new Map();

  for (const id of order) {
    const own = byId.get(id)?.estimate ?? 0;
    let bestPredecessor = null;
    let bestHours = 0;

    for (const dep of dependencies.get(id) ?? []) {
      const candidate = best.get(dep)?.hours ?? 0;
      if (candidate > bestHours) {
        bestHours = candidate;
        bestPredecessor = dep;
      }
    }

    best.set(id, { hours: bestHours + own, from: bestPredecessor });
  }

  let tail = null;
  let maxHours = 0;
  for (const [id, entry] of best) {
    if (entry.hours > maxHours) {
      maxHours = entry.hours;
      tail = id;
    }
  }

  const path = [];
  let cursor = tail;
  while (cursor) {
    path.unshift(cursor);
    cursor = best.get(cursor)?.from ?? null;
  }

  return { criticalPath: path, criticalHours: maxHours };
};

export { CYCLE_SENTINEL };
