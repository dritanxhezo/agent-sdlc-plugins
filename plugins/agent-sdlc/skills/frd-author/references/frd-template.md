# Functional Requirements Document — <Feature Name>

| Field    | Value                                     |
| -------- | ----------------------------------------- |
| Feature  | `<NNN-feature-slug>`                      |
| Status   | Draft \| In review \| Approved \| Superseded |
| Revised  | `<YYYY-MM-DD>`                            |
| Author   | business-analyst (agent-sdlc)             |
| Source   | `docs/sdlc/<NNN-feature-slug>/brd.md`     |

## Actors and roles

| Actor | Type | Permissions | Description |
| ----- | ---- | ----------- | ----------- |
| A-1   | Human \| External system | | |

## User journeys

### J-1 — <journey name>

**Actor:** `<A-1>` · **Goal:** <what the actor is trying to achieve>

1. <step>
2. <step>

**Alternate paths:** <what happens when the actor deviates, or `none`>

## Functional requirements

### FR-001 — <short title>

| Field         | Value                     |
| ------------- | ------------------------- |
| Satisfies     | `<BR-###>`                |
| Actor         | `<A-1>`                   |
| Priority      | MUST \| SHOULD \| COULD   |

**Preconditions:** <what must already be true>

**Trigger:** <what starts this>

**Behaviour:** <what the system does, observably>

**Postconditions:** <what is true afterwards>

**Acceptance criteria**

- **AC-001.1** — Given <context>, when <action>, then <observable outcome>.
- **AC-001.2** — Given <alternate context>, when <action>, then <observable outcome>.

## Business rules

| ID    | Rule | Applies to |
| ----- | ---- | ---------- |
| BRU-1 |      | `<FR-###>` |

## Validation rules

| ID   | Field | Constraint | Message on failure |
| ---- | ----- | ---------- | ------------------ |
| VR-1 |       |            |                    |

## Data entities (logical)

### E-1 — <entity name>

<One sentence: what this entity represents in the business.>

| Field | Meaning | Required | Conceptual type |
| ----- | ------- | -------- | --------------- |
|       |         | Yes \| No | Text \| Number \| Money \| Date \| Identifier \| Enum |

## Error and edge case handling

| ID   | Condition | Observable outcome | Related FR |
| ---- | --------- | ------------------ | ---------- |
| EC-1 | <empty state \| max volume \| concurrent edit \| partial failure \| timeout \| permission denied> | | `<FR-###>` |

## Non-functional requirements

| ID      | Category | Requirement | Measurable threshold | Measured how |
| ------- | -------- | ----------- | -------------------- | ------------ |
| NFR-001 | Performance \| Security \| Accessibility \| Availability | | <e.g. p95 < 400 ms at 200 concurrent users> | |

## Traceability

| FR       | Satisfies | Journey | Acceptance criteria |
| -------- | --------- | ------- | ------------------- |
| FR-001   | `<BR-###>` | `<J-1>` | AC-001.1, AC-001.2 |

## Coverage findings

**Coverage gaps** — business requirements with no functional requirement

| BR | Why no FR yet |
| -- | ------------- |
|    |               |

**Scope creep** — functional requirements tracing to no business requirement

| FR | Where it came from | Proposed response |
| -- | ------------------ | ----------------- |
|    |                    | Drop \| Add BR \| Defer |

## Assumptions

- ASSUMPTION: …

## Open questions

- OPEN QUESTION: … *(blocks: FR-00X)*
