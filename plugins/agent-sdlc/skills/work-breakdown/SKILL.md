---
name: work-breakdown
description: Turns approved specifications into a phased, dependency-ordered list of T-### tasks, each under a day of work, with traceability to FR-###/C-###, an ideal-hours estimate, explicit dependencies, a definition of done and a paired test task, plus the critical path. Use once the FRD, LLD and test cases exist and the feature needs planning, or when an existing plan needs re-sequencing.
---

# Work Breakdown

You convert a specification into work someone can start on Monday morning. You do not
design, and you do not implement.

## When to use

- `frd.md`, `lld.md` and `test-cases.md` exist and the feature needs a build plan.
- Scope changed and the remaining work needs re-sequencing.
- Spec Kit produced a `tasks.md` that needs estimates, dependencies and phasing.

## Inputs

- `docs/sdlc/<feature>/frd.md` — the `FR-###` set and their priorities.
- `docs/sdlc/<feature>/lld.md` — the `C-###` components and their interfaces.
- `docs/sdlc/<feature>/test-cases.md` — the `TC-###`s that pair with each task.
- `docs/sdlc/constitution.md` for the definition of done and merge policy.
- `.specify/tasks.md` when Spec Kit is present.

## Procedure

1. **Detect Spec Kit first.** If `.specify/` exists, Spec Kit's `tasks.md` is the task list.
   Consume it: map its entries to `T-###`, add estimates, dependencies, phases and
   traceability, and write the result. Never invent a parallel list of tasks alongside it.

2. **Interview on order, not on tasks.** What the work is follows from the LLD and the test
   cases. What order it lands in does not, and neither does what may slip. Run the
   `decision-interview` skill over exactly that: which stories ship first, what can wait for
   hardening, whether anything is pinned to an external date, and how many people can work
   in parallel. Never put task-level detail to the user — it is derivable, and asking turns
   the plan into their homework.

3. **Group work into phases in this order:**

   | Phase | Contains |
   | ----- | -------- |
   | Setup | Scaffolding, dependencies, config, CI, test harness |
   | Foundational | Blocking prerequisites shared by several stories — schema, auth, shared components |
   | Per story | One phase per user story or `FR` cluster, in priority order |
   | Hardening | Performance, accessibility, error handling, docs, polish |

   A phase exists to be finishable. If a phase cannot be demonstrated when it closes, it is
   the wrong cut.

4. **Write each `T-###` around an observable outcome.** The description says what is true
   after the task that was not true before — "the orders endpoint returns paginated
   results", not "work on pagination". Give each task its `FR-###` and `C-###`
   traceability; a task tracing to neither is scope creep, so surface it.

5. **Pair every implementation task with its tests.** Either create the matching test task
   referencing its `TC-###`s, or put "write failing test first" explicitly in the
   implementation task's definition of done. No implementation task ships without one of
   the two.

6. **Estimate in ideal hours against a named reference task.** Pick one small, well
   understood task in this breakdown, state it as the reference, and size everything
   relative to it. Then:
   - Over 8 hours: flag `NEEDS SPLIT` and split it before publishing.
   - An order-of-magnitude guess: escalate to the user rather than writing a number. The
     conventions make this a gate, not an assumption.

7. **Declare dependencies explicitly.** `Depends On` lists task IDs, never prose. A task
   with no dependency inside its phase is parallelisable — mark it, because that is what
   tells the team what can run at once.

8. **Give each task a definition of done** that a reviewer can check: tests passing, the
   named `TC-###`s green, the constitution's review policy satisfied.

9. **Compute the critical path.** The longest dependency chain by summed estimate. Report
   it with its total, because it, not the sum of all estimates, is the delivery date.

10. **Sanity-check the whole breakdown.** Every `FR-###` has at least one task. Every task
    has an estimate, a dependency list and a definition of done. No cycles.

## Output contract

Write `docs/sdlc/<feature>/work-breakdown.md` from
[`references/work-breakdown-template.md`](references/work-breakdown-template.md),
containing:

- Document control (feature slug, status, revision date, source artifacts, Spec Kit yes/no)
- Estimation basis, naming the reference task
- Phases with goal and exit criteria
- Task table (`T-###`, title, description, phase, traces to, estimate, depends on,
  parallelisable, definition of done)
- Requirement coverage (`FR-###` → `T-###`s)
- Critical path with total ideal hours
- Tasks flagged `NEEDS SPLIT`
- Assumptions and open questions

No task exceeds 8 ideal hours. Every task traces to an `FR-###` or `C-###`. The task table
here is the draft; GitHub Issues becomes authoritative the moment `execution-plan` runs.

## Handoff

Report the task count, total ideal hours, the critical path length and any escalated
estimate.

Next: the **project-manager** continues with the `execution-plan` skill to publish these
tasks to GitHub Issues, populate the Projects v2 board and render the Gantt chart. With
Spec Kit present, `/speckit.tasks` has already produced the list — go straight to
`execution-plan`.
