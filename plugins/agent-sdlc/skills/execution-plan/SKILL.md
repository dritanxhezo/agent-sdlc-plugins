---
name: execution-plan
description: Publishes a work breakdown to GitHub — one issue per T-###, milestones per phase, Projects v2 board fields — via the sdlc-tracker MCP, then renders a read-only execution plan document with a Mermaid Gantt chart, dependency order and per-phase status. Use after work-breakdown to make GitHub Issues the source of truth, or in refresh mode to regenerate the plan view from live GitHub data.
---

# Execution Plan

You move the plan out of markdown and into GitHub, then render a view of it. After this
skill runs, GitHub Issues is the source of truth and the document is a photograph of it.

## When to use

- `work-breakdown.md` is approved and the tasks need publishing to GitHub.
- Spec Kit produced tasks and they need a board, milestones and a schedule.
- The plan document has gone stale and needs refreshing from live task data.

## Inputs

- `docs/sdlc/<feature>/work-breakdown.md` — the `T-###` tasks, estimates and dependencies.
- The target repository's GitHub remote and an existing Projects v2 board, if any.
- `sdlc.config.json` for board name and field overrides, if present.

## Procedure

1. **Initialise the tracker.** Call `tracker_init` to create or adopt the Projects v2 board
   and ensure its custom fields exist: `Estimate` (number, ideal hours), `Phase` (text) and
   `Depends On` (text, comma-separated task IDs). Status uses the board's built-in field.
   Adopt an existing board rather than creating a second one.

2. **Publish the breakdown.** Call `plan_sync` with the parsed tasks. It creates one issue
   per `T-###` titled `T-### <task title>`, creates a milestone per phase, assigns each
   issue to its milestone, and populates the three board fields. Re-running it updates
   existing issues rather than duplicating them — match on the `T-###` prefix.

3. **Verify the dependency graph.** Call `dependency_graph`. A cycle is a hard stop: report
   the cycle and fix the breakdown before continuing, because nothing downstream — order,
   critical path, Gantt — is meaningful with one present. Use its returned order as the
   execution order.

4. **Render the chart.** Call `render_gantt` to produce the Mermaid `gantt` block from live
   task data. Paste its output into the document unmodified.

5. **Roll up status.** Call `plan_status` for per-phase counts, the critical path and the
   blocked tasks, and place it near the top of the document where a reader looks first.

6. **Write the document** from the template, carrying its generated-view warning verbatim.
   The task table and the Gantt chart are a read-only projection of GitHub. Never edit them
   by hand: those edits are discarded on the next refresh and, until then, disagree with
   the board everyone else is reading.

7. **Route every later mutation through the tracker.** `task_update` for status, estimate,
   dependencies or assignee; `plan_sync` for adding or restructuring tasks. Never
   `gh issue edit` — the `sdlc-tracker` tools are the complete set.

8. **Refresh mode.** When the plan already exists and only needs updating, skip
   `plan_sync`: call `task_list`, `dependency_graph`, `render_gantt` and `plan_status`,
   then rewrite the generated sections in place. Refresh reads GitHub; it never pushes
   markdown back into it.

## Output contract

Write `docs/sdlc/<feature>/execution-plan.md` from
[`references/execution-plan-template.md`](references/execution-plan-template.md),
containing:

- Document control (feature slug, board URL, generated timestamp, generated-view warning)
- Status roll-up from `plan_status`: per-phase progress, critical path, blocked tasks
- Milestones table (phase → milestone → task count → estimate → due date)
- Task table (`T-###`, issue link, title, phase, estimate, depends on, status, assignee)
- Execution order from `dependency_graph`, with parallelisable groups
- Mermaid `gantt` chart from `render_gantt`
- Risks to the schedule
- How to update (tracker tools only)

Every task in the document has a live GitHub issue link. The document reports no task the
tracker does not know about.

## Handoff

Report the board URL, the issue and milestone counts, the critical path with its total, and
any cycle or blocked task.

Next: the **developer** continues with the `tdd-implement` skill, taking tasks in the
execution order above and moving each through `task_update`. With Spec Kit present,
`/speckit.implement` does the building and this plan stays the schedule of record.
