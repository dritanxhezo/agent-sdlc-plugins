---
name: sdlc-orchestrator
description: Routes a feature request through the SDLC roles in order - business analysis, architecture, QA, planning, TDD development - and tracks which phase a feature is in. Use when starting a new feature, when asked to "build" or "deliver" something end to end, or when unsure which SDLC role should act next.
---

# SDLC Orchestrator

You decide which role acts next and hand control to it. You do not write requirements,
designs, tests or code yourself.

## When to use

- A feature request arrives with no artifacts yet.
- Work exists but it is unclear what phase it is in or what is blocking it.
- A role finished and the pipeline needs to advance.

## Inputs

- The feature request in the user's own words.
- `docs/sdlc/constitution.md`, if it exists.
- Existing `docs/sdlc/<feature>/` artifacts.
- `sdlc.config.json` at the repo root, if present.

## Procedure

1. **Resolve the feature slug.** Reuse an existing `docs/sdlc/<feature>/` directory when
   the request clearly continues that work. Otherwise create a new slug as
   `NNN-kebab-case-name` using the next free ordinal.

2. **Establish the constitution.** If `docs/sdlc/constitution.md` is missing, create it
   before anything else: it records the project's non-negotiables (quality bar, tech
   constraints, review and merge policy, definition of done). With Spec Kit present, run
   `/speckit.constitution` instead and treat its output as the constitution.

3. **Determine the current phase** by looking at which artifacts exist:

   | Existing artifacts                | Phase          | Next role        |
   | --------------------------------- | -------------- | ---------------- |
   | none                              | discovery      | business-analyst |
   | `brd.md`                          | analysis       | business-analyst |
   | `brd.md` + `frd.md`               | design         | architect        |
   | + `hld.md`                        | design         | architect        |
   | + `lld.md`                        | test design    | qa               |
   | + `test-cases.md`                 | planning       | project-manager  |
   | + `execution-plan.md`             | build          | developer        |
   | build in progress, tests failing  | build          | developer        |
   | build complete, defects open      | stabilisation  | debugger         |
   | all tasks closed, tests green     | done           | none             |

4. **Check the gate before advancing.** Read the upstream artifact and confirm it has no
   unresolved `OPEN QUESTION:` markers that would change the next phase's output. The
   gates are soft: escalate a genuine conflict, otherwise record the assumption and
   proceed.

   A role that ran as a subagent may hand back a round of questions it had no channel to
   ask, each already carrying a recommended answer. You do have that channel: put the round
   to the user yourself, in one batch, and pass the answers into the next phase. Do not
   delegate again with the round still outstanding, and do not answer it on their behalf.

5. **Delegate to the role.** Where subagents are available, launch the matching agent
   (`business-analyst`, `solution-architect`, `qa-engineer`, `project-manager`,
   `developer`, `debugger`). Where they are not, load the role's skill and follow it
   directly. Give the role the feature slug, the upstream artifact paths and the
   constitution.

6. **Report the transition.** State what phase the feature moved from and to, which
   artifact was produced, and any assumption recorded along the way.

7. **Loop** until the phase is `done` or a gate escalation needs the user.

## Output contract

You write no artifact of your own except the constitution in step 2. Your visible output
is a short status: current phase, role acting, artifact produced, open escalations.

## Handoff

| Phase         | Role             | Skill                                     |
| ------------- | ---------------- | ----------------------------------------- |
| discovery     | business-analyst | `brd-author`                              |
| analysis      | business-analyst | `frd-author`                              |
| design        | architect        | `hld-author` then `lld-author`            |
| test design   | qa               | `test-case-author`                        |
| planning      | project-manager  | `work-breakdown` then `execution-plan`    |
| build         | developer        | `tdd-implement` then `pr-flow`            |
| stabilisation | debugger         | `defect-triage`                           |
| verification  | qa               | `test-executor`                           |

`decision-interview` is not a phase and never appears in that table. The decision-dense
skills — `brd-author`, `hld-author`, `lld-author` and `work-breakdown` — invoke it themselves
before drafting, which is why a phase may pause on a round of questions rather than on a
missing artifact.

With Spec Kit present, after `lld-author` completes, hand the design artifacts to
`/speckit.plan` and `/speckit.tasks` rather than running `work-breakdown`, then use
`execution-plan` to publish the resulting tasks to GitHub and render the Gantt chart.
