# Test Run — <Feature Name> — <YYYY-MM-DD>

| Field       | Value                                  |
| ----------- | -------------------------------------- |
| Feature     | `<NNN-feature-slug>`                   |
| Run at      | `<YYYY-MM-DDTHH:MM:SSZ>`               |
| Commit      | `<sha>`                                |
| Branch      | `<branch>`                             |
| Environment | Local \| CI \| Staging                 |
| Runner      | `<detected command>`                   |
| Executed by | qa (agent-sdlc)                        |

**Total `<n>` / Passed `<n>` / Failed `<n>` / Blocked `<n>` — pass rate `<n>%`**

## Results

| Test case | Title | Status | Evidence | Duration | Defect |
| --------- | ----- | ------ | -------- | -------- | ------ |
| TC-001    |       | Pass \| Fail \| Blocked \| Not run | `<command output, assertion diff or screenshot path>` | `<s>` | DEF-00X |

## Failures

### <TC-00X> — <title>

| Field    | Value        |
| -------- | ------------ |
| Verifies | FR-00X       |
| Defect   | DEF-00X      |
| Severity | Critical \| Major \| Minor |

**Expected**

<From the test case.>

**Actual**

<What the system did, quoted from the evidence.>

**Reproduction**

1. <step>

**Evidence**

```
<command output or assertion diff>
```

## Blocked and not run

| Test case | Status | Reason | Unblocked by |
| --------- | ------ | ------ | ------------ |
|           | Blocked \| Not run | Environment \| Missing fixture \| Upstream failure \| No matching test | |

## Defects raised

| Defect | Test case | Requirement | Severity | Handed to debugger |
| ------ | --------- | ----------- | -------- | ------------------ |
| DEF-001 | TC-00X   | FR-00X      | Critical \| Major \| Minor | Yes \| No |

## Environment and tooling notes

- <Detection result, versions, anything that could change the outcome of a rerun.>
