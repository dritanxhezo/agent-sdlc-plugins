---
name: tdd-implement
description: Implements one tracker task at a time under strict test-driven development - failing test first, minimum code to pass, then refactor - driven by the task's FR-### acceptance criteria and TC-### test cases. Use when the execution plan exists and a task is ready to build, when resuming a partially built feature, or when any code change needs writing test-first.
---

# TDD Implement

You build exactly one task at a time, and the test comes first. You do not design new
requirements, invent test cases, or start a second task before the first is merged.

## When to use

- `docs/sdlc/<feature>/execution-plan.md` exists and tasks are ready to build.
- A phase is partially built and the next unblocked task needs picking up.
- A defect fix or refactor needs to be written test-first.

## Inputs

- `docs/sdlc/<feature>/frd.md` for the `FR-###` acceptance criteria.
- `docs/sdlc/<feature>/test-cases.md` for the `TC-###` cases that specify the behaviour.
- `docs/sdlc/<feature>/lld.md` for the `C-###` components the task touches.
- Live task state from the `sdlc-tracker` MCP server.
- `docs/sdlc/constitution.md` for the project's quality bar and definition of done.

## Procedure

1. **Pick the next task.** Call `task_list` for the feature and `dependency_graph` to get
   dependency order. Take the highest-priority task whose dependencies are all closed.
   If `dependency_graph` flags a cycle, stop and escalate — do not pick arbitrarily.
   Set the task in progress with `task_update` before writing anything.

2. **Read the specification.** Open the task's `FR-###` acceptance criteria and the
   `TC-###` cases that cover it. The test cases *are* the specification: implement them as
   written. Do not re-derive, reinterpret or extend them. A task whose `TC-###` cases are
   missing or contradict the `FR-###` is a finding — escalate rather than inventing
   coverage.

3. **Detect the test runner.** Never assume a stack. Check, in order:
   `package.json` scripts plus a `vitest.config.*`, `jest.config.*` or
   `playwright.config.*`; `pytest.ini` or `pyproject.toml`; any `*.csproj`; `go.mod`;
   `Cargo.toml`. Match the existing test file naming, directory layout and assertion
   style. If no runner exists, set one up as its own task before implementing.

4. **Write the failing test — red.** Write one test for one `TC-###`, then **run it** and
   read the output. Confirm it fails *for the expected reason*: a wrong or missing value,
   not an import error, a typo, or a missing fixture. A test that passes on first run
   proves nothing and is not a red test — fix the test, not the code. Never write the
   test and the implementation in the same step.

5. **Write the minimum code to pass — green.** Implement the smallest change that
   satisfies the assertion, following the code conventions below. Run the test again and
   confirm it passes. Resist implementing behaviour no test demands.

6. **Refactor with the test green.** Remove duplication, extract named constants, tidy
   naming. Re-run the test after each refactor. If it goes red, revert the refactor rather
   than adjusting the test.

7. **Repeat steps 4–6** for each remaining `TC-###` on the task, one case per cycle.

8. **Verify the whole task.** Run the full test suite, the linter and the type check.
   Every one must pass. **Never disable, suppress or bypass a linter rule** — no inline
   ignore comments, no config edits, no `--no-verify`. A rule that fires is telling you
   the code is wrong.

9. **Close the loop in the tracker.** Update the task with `task_update` to `In Review`,
   and record which `TC-###` cases now pass. A board without that option falls back on
   its own. Do not hand-edit `execution-plan.md`.

### Code conventions

Read [../../rules/code-conventions.mdc](../../rules/code-conventions.mdc) before step 5, plus
the per-stack file it indexes for the stack you detected in step 3. Cursor attaches both by
their globs; in Claude Code and Copilot you have to open them. They are the only copy —
nothing here restates them, so there is nothing to disagree with.

### TypeScript / React / Vitest / Playwright path

Unit and component tests in Vitest, end-to-end in Playwright. Name test files
`<subject>.test.ts(x)` beside the subject, e2e specs `<flow>.spec.ts` under the
Playwright test directory. Run one test with `npx vitest run <path> -t "<name>"`, the
suite with the repo's `test` script, then `lint` and `typecheck`. Test rendered behaviour
and public props through Testing Library queries; never assert on internal state or
component internals.

### Generic fallback

For any other stack, use the runner detected in step 3 with its native single-test
filter (`pytest -k`, `dotnet test --filter`, `go test -run`, `cargo test <name>`), then
its full-suite command, then the repo's configured linter and formatter. The red /
green / refactor order does not change with the language.

## Output contract

You write source and test files in the target repository only — no `docs/sdlc/`
artifacts. Every task you complete must leave behind:

- At least one test per `TC-###` the task covers, each of which was observed failing
  before its implementation existed.
- A full suite, linter and type check that all pass.
- A tracker task moved via `task_update`, not by editing markdown.

Verify yourself against [references/tdd-checklist.md](references/tdd-checklist.md) before
declaring the task done.

## Handoff

Report the task ID, the `TC-###` cases now covered, the files changed, the suite and lint
result, and any assumption recorded.

Next: the **developer** continues with the `pr-flow` skill to branch, commit, open the
pull request and merge this task. Do not start the next task until that merge lands.
