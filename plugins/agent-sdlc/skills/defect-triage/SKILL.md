---
name: defect-triage
description: Debugs a reported failure systematically - reproduce, capture evidence, form a hypothesis that explains all of it, probe it cheaply, then fix behind a regression test - and records the root cause in a DEF-### report. Use when a test fails, a bug is reported, production behaviour is wrong, or an investigation needs evidence before anyone changes code.
---

# Defect Triage

You find the cause before you change anything. Evidence first, hypothesis second, code
last. A symptom that stopped appearing is not a diagnosis.

## When to use

- A test, build or deployment fails and the cause is not obvious.
- A user or QA reports behaviour that differs from a specified `FR-###` or `TC-###`.
- A defect keeps recurring and needs its actual root cause established.

## Inputs

- The report in the reporter's words, plus environment, version and timing.
- `docs/sdlc/<feature>/frd.md` and `test-cases.md` to establish specified behaviour.
- Failing test output, error text, stack traces and application logs.
- Repository history for the affected area.

## Procedure

1. **Reproduce it.** Get to a deterministic reproduction and record the exact command,
   inputs, environment and observed versus expected behaviour. Nothing downstream is
   valid without this.

2. **When you cannot reproduce, say so.** State plainly that the defect is not
   reproducible, list precisely what is missing — version, config, data state, timing,
   user role, browser — and ask for it. Set the report status to `Cannot reproduce`.
   Never guess at a fix for a failure you have not seen.

3. **Classify defect versus change request.** A **defect** is behaviour that differs from
   a specified `FR-###` or `TC-###`. A **change request** is behaviour that matches the
   spec where the spec is wrong or incomplete. If you cannot point to the `FR-###` or
   `TC-###` being violated, it is a change request: stop, record it, and route it to the
   business-analyst. Do not fix it here.

4. **Capture the failure surface.** Collect the full error and stack trace verbatim, the
   surrounding log lines, and the request or input that triggered it. Identify the last
   change to touch the area with `git log -- <path>`; where the failure has a known-good
   point in history, narrow it with `git bisect`. Paste evidence into the report rather
   than paraphrasing it.

5. **Form one hypothesis that explains all of it.** The hypothesis must account for
   *every* piece of evidence — including why it fails in this environment and not
   another, and why it started when it did. A hypothesis that explains the stack trace
   but not the timing is incomplete; keep going. State what the hypothesis predicts you
   will observe if it is true.

6. **Probe it cheaply, before touching production code.** Use the smallest test of the
   prediction available: a focused failing test, a temporary log line, a breakpoint, a
   REPL call, an assertion on intermediate state. If the prediction does not hold, the
   hypothesis is wrong — return to step 5 with the new evidence rather than patching
   around it. Remove temporary instrumentation before you finish.

7. **Fix it test-first.** Write a regression test that fails specifically because of this
   defect and run it to confirm it fails for that reason. Then apply the minimum fix,
   re-run to green, and refactor with the test green. Follow the same red / green /
   refactor loop and code conventions as `tdd-implement`.

8. **Verify the neighbourhood.** Run the full test suite, the linter and the type check.
   A fix that breaks adjacent behaviour is not a fix. Never disable or suppress a linter
   rule to get the fix through.

9. **Record the root cause and its class.** Write down the underlying cause, not the
   symptom — "the retry loop reuses a consumed request body stream", not "the second
   attempt returns 400". Then search the codebase for the same class of mistake
   elsewhere, list what you found, and raise tasks through the `sdlc-tracker` MCP
   (`task_update` on an existing task, or a new task for the project-manager) for the
   instances you did not fix here.

### Prohibitions

- Do not change code speculatively to see what happens. Every edit follows a confirmed
  hypothesis.
- Do not treat a disappearing symptom as a fixed root cause. If you cannot explain *why*
  the change works, you have not finished.
- Do not fix a change request. Route it to the business-analyst.
- Do not weaken, skip or delete a test to make the failure go away.

## Output contract

Write `docs/sdlc/<feature>/defects/DEF-###.md` from
[references/defect-template.md](references/defect-template.md), containing:

- Document control (`DEF-###`, title, severity, status, environment, reported by, dates)
- Reproduction steps with the exact command
- Observed versus expected behaviour
- Evidence: error text, stack trace, log excerpts, `git log` / `git bisect` findings
- Hypotheses considered, with what each predicted and what ruled it out
- Root cause
- Fix, and the regression test that pins it
- Related `FR-###` and `TC-###`
- Whether the same defect class appears elsewhere, and the tasks raised for it

When a QA run report already allocated the `DEF-###`, keep that id — it is cited in the
run's results table. Only when the defect arrives without one does numbering continue from
the highest existing defect in the feature directory, counting ids already allocated in
`test-runs/` as taken. Never reuse or renumber an ID.

## Handoff

Report the defect ID, severity, root cause in one sentence, the regression test added,
and any other instances of the defect class found.

Next: the **developer** takes the fix through the `pr-flow` skill, branching as
`fix/T-###-<slug>`. If you classified the report as a change request, hand off instead to
the **business-analyst** with the `brd-author` or `frd-author` skill to amend the
specification, and leave the code unchanged.
