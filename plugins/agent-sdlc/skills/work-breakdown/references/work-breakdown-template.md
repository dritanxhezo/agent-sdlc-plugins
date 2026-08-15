# Work Breakdown — <Feature Name>

| Field    | Value                                        |
| -------- | -------------------------------------------- |
| Feature  | `<NNN-feature-slug>`                         |
| Status   | Draft \| In review \| Approved \| Superseded |
| Revised  | `<YYYY-MM-DD>`                               |
| Author   | project-manager (agent-sdlc)                 |
| Derived from | `frd.md`, `lld.md`, `test-cases.md`      |
| Spec Kit | Present — consumed `.specify/tasks.md` \| Absent |

## Estimation basis

Reference task: `<T-00X>` — `<title>` at `<n>` ideal hours. All other estimates are sized
relative to it.

<One sentence on what an ideal hour excludes here: meetings, review latency, environment
setup.>

## Phases

| Phase | Name | Goal | Exit criteria |
| ----- | ---- | ---- | ------------- |
| P0    | Setup | | |
| P1    | Foundational | | |
| P2    | <Story or FR cluster> | | |
| P9    | Hardening | | |

## Tasks

| ID    | Title | Description (observable outcome) | Phase | Traces to | Est. (h) | Depends on | Parallel | Definition of done |
| ----- | ----- | -------------------------------- | ----- | --------- | -------- | ---------- | -------- | ------------------ |
| T-001 | <Paginate the orders endpoint> | <After this task, GET /orders returns page-sized results with a next cursor.> | P2 | FR-00X, C-00X | 4 | T-000 | Yes \| No | <Write failing test first; TC-00X and TC-00Y green; review policy satisfied> |

## Requirement coverage

| Requirement | Tasks | Verdict |
| ----------- | ----- | ------- |
| FR-001      | T-00X, T-00Y | Covered \| Gap |

## Critical path

`<T-00X> → <T-00Y> → <T-00Z>` — `<n>` ideal hours of `<n>` total.

| Position | Task | Est. (h) | Cumulative (h) |
| -------- | ---- | -------- | -------------- |
| 1        |      |          |                |

## Tasks flagged NEEDS SPLIT

| Task | Original estimate (h) | Split into | Resolved |
| ---- | --------------------- | ---------- | -------- |
|      |                       |            | Yes \| No |

## Assumptions

- ASSUMPTION: …

## Open questions

- OPEN QUESTION: … *(blocks: T-00X)*
