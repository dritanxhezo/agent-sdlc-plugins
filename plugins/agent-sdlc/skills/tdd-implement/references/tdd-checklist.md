# TDD checklist

Verify each cycle against this before moving on. Every box is a fact you observed, not an
intention.

## Before the cycle

- [ ] Task picked from `task_list` / `dependency_graph`, all dependencies closed.
- [ ] Task set in progress with `task_update`.
- [ ] The `FR-###` acceptance criteria and every covering `TC-###` have been read.
- [ ] Test runner detected from the repo, not assumed.
- [ ] Existing test file naming, layout and assertion style identified and matched.

## Red

- [ ] Exactly one test written, for one `TC-###`.
- [ ] The test was **run** and the output read.
- [ ] It failed on an assertion — a wrong or missing value.
- [ ] It did **not** fail on an import error, syntax error, typo, missing fixture or
      misconfigured runner. Those are broken tests, not red tests.
- [ ] It did **not** pass on the first run. If it did, the test does not exercise the new
      behaviour — fix the test before touching production code.
- [ ] No production code was written in this step.

## Green

- [ ] The smallest change that satisfies the assertion, and nothing more.
- [ ] The test was re-run and passes.
- [ ] No other test regressed.
- [ ] No behaviour implemented that no test demands.

## Refactor

- [ ] Duplication removed, constants named, naming tidied.
- [ ] The test was re-run after each refactor and is still green.
- [ ] Where a refactor went red, the refactor was reverted — the test was not adjusted.

## Code conventions

- [ ] Interfaces prefixed `I`.
- [ ] Named constants instead of magic numbers or repeated literals.
- [ ] Methods as `const` arrow functions where the language allows.
- [ ] `logDebug` / `logError` used; no bare `console.log`.
- [ ] Bootstrap utilities used before hand-written CSS; CSS modules only where Bootstrap
      cannot express it.
- [ ] An existing shared component extended rather than a parallel one created.

## Before declaring the task done

- [ ] Full test suite run and green.
- [ ] Linter run and clean.
- [ ] Type check run and clean.
- [ ] No linter rule disabled, suppressed, reconfigured or bypassed. No `--no-verify`.
- [ ] Every `TC-###` on the task has a corresponding test.
- [ ] Task moved with `task_update`; `execution-plan.md` not hand-edited.

## Anti-patterns

Any of these means the cycle was not TDD. Redo it.

| Anti-pattern | Why it fails | Do instead |
| ------------ | ------------ | ---------- |
| Writing the test and the implementation together | The test is shaped by the code, so it can only confirm what the code already does | Write the test, run it, watch it fail, then implement |
| Weakening an assertion to get green | Green now means nothing; the defect ships with a passing suite | Keep the assertion, fix the code |
| Deleting or skipping a failing test | Same as above, with the evidence removed | Fix the code, or escalate if the `TC-###` is wrong |
| Testing implementation details — private methods, internal state, call counts | The test breaks on every refactor and passes on real regressions | Assert on observable behaviour through the public surface |
| Mocking the thing under test | Verifies the mock, not the subject | Mock only the boundaries: network, clock, filesystem, third-party services |
| Asserting only "it does not throw" | Passes for almost any implementation | Assert the specific expected value or state change |
| One giant test covering several `TC-###` | A failure does not identify which case broke | One test per case |
| Writing the test after the code "to get coverage" | Coverage without a red step proves nothing | Restart the cycle from red |
