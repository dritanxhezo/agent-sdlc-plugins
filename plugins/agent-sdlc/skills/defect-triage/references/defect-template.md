# DEF-### — <Short defect title>

| Field       | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| ID          | `DEF-###`                                                       |
| Feature     | `<NNN-feature-slug>`                                            |
| Severity    | Critical \| High \| Medium \| Low                               |
| Status      | Open \| Investigating \| Cannot reproduce \| Fixed \| Change request \| Closed |
| Classification | Defect (violates a specified `FR-###`/`TC-###`) \| Change request (spec is wrong) |
| Reported by | `<name or role>`                                                |
| Reported    | `<YYYY-MM-DD>`                                                  |
| Resolved    | `<YYYY-MM-DD>`                                                  |
| Author      | debugger (agent-sdlc)                                           |

## Environment

| Field | Value |
| ----- | ----- |
| Where | Local \| CI \| Staging \| Production |
| Version / commit | `<sha or tag>` |
| Runtime / browser | |
| Configuration or data state | |

## Reproduction

Reproducible: Yes \| Intermittent (`<n>` in `<m>` runs) \| No

```
<exact command that reproduces it>
```

1. <step>
2. <step>
3. <step>

*If not reproducible, list exactly what is missing and who was asked for it. Do not
proceed to a fix.*

## Observed vs expected

| | Behaviour |
| ---- | --------- |
| Observed | |
| Expected | |
| Source of the expectation | `FR-###` / `TC-###` / constitution |

## Evidence

**Error and stack trace**

```
<verbatim>
```

**Relevant log excerpts**

```
<verbatim, with timestamps>
```

**History**

| Finding | Detail |
| ------- | ------ |
| Last change to the area (`git log`) | `<sha>` — `<subject>` — `<date>` |
| First bad commit (`git bisect`) | `<sha>` or Not run — `<why>` |

## Hypotheses

| # | Hypothesis | Predicted if true | Probe used | Outcome |
| - | ---------- | ----------------- | ---------- | ------- |
| 1 | | | Failing test \| Log line \| Breakpoint \| REPL | Ruled out — `<evidence>` |
| 2 | | | | Confirmed — `<evidence>` |

The confirmed hypothesis must account for **all** the evidence above, including why the
failure appears in this environment and why it started when it did.

## Root cause

<The underlying cause, not the symptom. State the mechanism.>

## Fix

| Field | Value |
| ----- | ----- |
| Change | <what was changed and why this addresses the cause> |
| Files | |
| Task | `T-###` |
| Pull request | `#<n>` |

## Regression test

| Field | Value |
| ----- | ----- |
| Test | `<file>::<test name>` |
| Confirmed failing before the fix | Yes — `<observed failure reason>` |
| Passing after the fix | Yes |
| Full suite / lint / type check | Green |

## Traceability

| Relates to | ID | Note |
| ---------- | -- | ---- |
| Functional requirement | `FR-###` | |
| Test case | `TC-###` | Existing coverage gap? Yes \| No |
| Task | `T-###` | |

## Defect class elsewhere

Same class of mistake found in other locations: Yes \| No \| Not searched (`<why>`)

| Location | Same class? | Fixed here? | Task raised |
| -------- | ----------- | ----------- | ----------- |
| `<path>` | Yes \| Suspected | No | `T-###` |

## Assumptions

- ASSUMPTION: …

## Open questions

- OPEN QUESTION: …
