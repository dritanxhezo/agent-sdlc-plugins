# Test Cases — <Feature Name>

| Field    | Value                                        |
| -------- | -------------------------------------------- |
| Feature  | `<NNN-feature-slug>`                         |
| Status   | Draft \| In review \| Approved \| Superseded |
| Revised  | `<YYYY-MM-DD>`                               |
| Author   | qa (agent-sdlc)                              |
| Derived from | `frd.md` rev `<YYYY-MM-DD>`, `lld.md` rev `<YYYY-MM-DD>` |

## Scope of testing

<One or two sentences: which FR range these cases cover and at what levels.>

**Not tested here**

- <Area, and where it is covered instead — or why it is out of scope.>

## Test cases

| ID     | Title | Verifies | Preconditions | Test data | Steps | Expected result | Priority | Type |
| ------ | ----- | -------- | ------------- | --------- | ----- | --------------- | -------- | ---- |
| TC-001 | <Rejects order quantity above stock level> | FR-00X | <System state required> | `<field=value>` | 1. <action><br>2. <action> | <Observable output: value, message, status, state change> | P1 \| P2 \| P3 | unit \| integration \| end-to-end \| manual |

## Coverage matrix

| Requirement | Acceptance criteria | Covered by | Verdict |
| ----------- | ------------------- | ---------- | ------- |
| FR-001      | <count>             | TC-00X, TC-00Y | Covered \| Gap |
| NFR-001     | `<threshold>`       |            | Covered \| Gap |

## Coverage gaps

| Requirement | Why uncovered | Action |
| ----------- | ------------- | ------ |
|             | Untestable as written \| Deferred \| Blocked on open question | |

## Orphan test cases

| Test case | Traces to nothing because | Escalated |
| --------- | ------------------------- | --------- |
|           |                           | Yes \| No |

## Test data and environment

| Item | Value or source | Notes |
| ---- | --------------- | ----- |
| <Fixture, account, role, seed dataset> | | |

## Assumptions

- ASSUMPTION: …

## Open questions

- OPEN QUESTION: … *(blocks: TC-00X)*
