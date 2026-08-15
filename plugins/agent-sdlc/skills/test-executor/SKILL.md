---
name: test-executor
description: Runs the TC-### test cases for a feature against the built code, detecting the project's own test tooling first, and records Pass/Fail/Blocked/Not run with evidence in a timestamped run report, raising a defect entry for every failure. Use after implementation to verify a feature, before a release or merge, or when asked whether a feature actually works.
---

# Test Executor

You run tests and report what happened. You do not fix failures — diagnosing and repairing
is the debugger's job, and keeping the two apart is what stops a run report from quietly
becoming a changelog.

## When to use

- Implementation of a feature is complete and needs verifying against `test-cases.md`.
- A defect fix needs its regression run before closing.
- A release candidate needs a recorded, evidenced verification pass.

## Inputs

- `docs/sdlc/<feature>/test-cases.md` — the cases to execute.
- The target repository's test tooling and existing test files.
- `docs/sdlc/<feature>/frd.md` when a case's expected result is ambiguous.
- Task state from the `sdlc-tracker` MCP via `task_list`.

## Procedure

1. **Detect the test tooling before running anything.** Never assume a runner exists or
   guess its invocation. Check, in order, and stop at the first match:

   | Evidence | Runner |
   | -------- | ------ |
   | `package.json` scripts plus a `vitest.config.*` / `jest.config.*` | that script, e.g. `npm test` |
   | `playwright.config.*` | `npx playwright test` |
   | `pytest.ini`, `pyproject.toml` `[tool.pytest]`, `tox.ini` | `pytest` |
   | `*.csproj` / `*.sln` | `dotnet test` |
   | `go.mod` | `go test ./...` |
   | `Cargo.toml` | `cargo test` |

   If nothing matches, every automated case is **Blocked** with reason "no test runner
   detected" — report that rather than inventing a command.

2. **Map cases to test files.** For each automated `TC-###`, locate the test that asserts
   it (by ID in the test name, by requirement reference, or by behaviour). A case with no
   matching test is **Not run**, not Pass, and is a finding for the run report.

3. **Run the automated cases** with the detected command, scoped to the mapped files where
   the runner supports it. Capture the exact command and its output.

4. **Walk the manual cases step by step.** Follow the preconditions, set up the stated test
   data, execute each numbered step and compare against the expected result. For
   browser-based cases use the Playwright MCP when it is available — navigate, interact and
   snapshot — and fall back to instructing the user only when it is not.

5. **Record every case with evidence.** One row per `TC-###`:
   `Pass` | `Fail` | `Blocked` | `Not run`. Evidence is the command output, the assertion
   diff, or the screenshot path — never "verified" on its own. `Blocked` names what blocked
   it (environment, missing fixture, upstream failure).

6. **Raise a defect entry for every failure.** Allocate the next `DEF-###` for the feature
   and record, in the run report's Failures section, the failing `TC-###`, the `FR-###`
   behind it, expected versus actual, the exact reproduction steps and environment, the
   evidence and a severity. Hand that entry to the debugger — do not diagnose the cause, do
   not edit product code, and leave `docs/sdlc/<feature>/defects/DEF-###.md` to
   `defect-triage`, which owns it.

7. **Update task status through the tracker.** Call `task_update` to move the verified
   tasks' status; call `task_list` first if you need their current state. Do not hand-edit
   task tables in markdown — the conventions make GitHub Issues the source of truth.

8. **Summarise in one line** at the top of the report:
   `Total <n> / Passed <n> / Failed <n> / Blocked <n> — pass rate <n>%`, where pass rate is
   passed ÷ (total − blocked − not run), rounded to whole percent.

## Output contract

Write `docs/sdlc/<feature>/test-runs/<ISO-date>.md` from
[`references/test-run-template.md`](references/test-run-template.md), containing:

- Run header (feature slug, ISO timestamp, commit SHA, environment, detected runner)
- Summary line: total / passed / failed / blocked, plus pass rate
- Results table (`TC-###`, status, evidence, duration, defect ID where failed)
- Failures detail with reproduction steps
- Blocked and not-run cases with reasons
- Defects raised (`DEF-###` → `TC-###` → `FR-###`)
- Environment and tooling notes

Use a new dated file per run; never overwrite a previous run report. Every `Fail` has a
`DEF-###` allocated. Every `Pass` has evidence.

## Handoff

Report the summary line, the defect IDs raised and anything blocked.

Next: on any failure the **debugger** continues with the `defect-triage` skill, taking the
`DEF-###` entries as its input. With all cases passing and no blocked cases, report the
feature verified and return control to the **sdlc-orchestrator**.
