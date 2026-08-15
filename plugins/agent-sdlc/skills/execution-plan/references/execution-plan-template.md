# Execution Plan — <Feature Name>

> **Generated view — do not hand-edit.** The task table and Gantt chart below are rendered
> from GitHub Issues and the Projects v2 board. Change tasks with the `sdlc-tracker` MCP
> tools (`task_update`, `plan_sync`), then regenerate this file. Edits made here are lost
> on the next refresh.

| Field     | Value                            |
| --------- | -------------------------------- |
| Feature   | `<NNN-feature-slug>`             |
| Board     | `<https://github.com/orgs/<org>/projects/<n>>` |
| Milestones | `<n>`                           |
| Generated | `<YYYY-MM-DDTHH:MM:SSZ>`         |
| Source    | `work-breakdown.md` \| `.specify/tasks.md` |

## Status

| Phase | Tasks | Done | In progress | Blocked | Est. remaining (h) | Progress |
| ----- | ----- | ---- | ----------- | ------- | ------------------ | -------- |
| P0 Setup | | | | | | `<n>%` |

**Critical path** `<T-00X> → <T-00Y>` — `<n>` ideal hours.

**Blocked** `<T-00X>` — blocked by `<T-00Y>` \| *(none)*

## Milestones

| Phase | Milestone | Tasks | Estimate (h) | Due |
| ----- | --------- | ----- | ------------ | --- |
| P0    | `<milestone title>` | | | `<YYYY-MM-DD>` |

## Tasks

| ID    | Issue | Title | Phase | Est. (h) | Depends on | Status | Assignee |
| ----- | ----- | ----- | ----- | -------- | ---------- | ------ | -------- |
| T-001 | [#12](https://github.com/<org>/<repo>/issues/12) | <Paginate the orders endpoint> | P2 | 4 | T-000 | Todo \| In progress \| In review \| Done \| Blocked | |

## Execution order

| Wave | Tasks (parallelisable within a wave) |
| ---- | ------------------------------------ |
| 1    | `<T-001>`, `<T-002>`                 |

## Schedule

```mermaid
gantt
    title <Feature Name> execution plan
    dateFormat YYYY-MM-DD
    axisFormat %d %b
    excludes weekends

    section P0 Setup
    T-001 <Scaffold test harness>      :done,   t001, 2026-01-05, 1d
    T-002 <Wire CI pipeline>           :active, t002, after t001, 1d

    section P1 Foundational
    T-003 <Add orders schema>          :        t003, after t002, 2d
    T-004 <Shared pagination helper>   :        t004, after t002, 1d

    section P2 <Story name>
    T-005 <Paginate orders endpoint>   :crit,   t005, after t003 t004, 1d
    T-006 <Order list UI>              :        t006, after t005, 2d

    section P9 Hardening
    T-007 <Accessibility pass>         :        t007, after t006, 1d
```

## Schedule risks

| Risk | Affects | Impact | Response |
| ---- | ------- | ------ | -------- |
|      | `<T-00X>` | Low \| Medium \| High | Accept \| Mitigate \| Avoid |

## How to update

| Change | Tool |
| ------ | ---- |
| Status, estimate, dependencies, assignee | `task_update` |
| Add or restructure tasks | `plan_sync` |
| Regenerate this document | `task_list`, `dependency_graph`, `render_gantt`, `plan_status` |

Never `gh issue edit`. Never hand-edit the task table or Gantt chart above.
