---
name: test-case-author
description: Derives numbered TC-### test cases from the functional requirements and low level design, each with preconditions, test data, steps, expected result, priority and type, plus a coverage matrix proving every FR-### is covered. Use after the FRD and LLD exist and before work is broken into tasks, or when an existing feature needs its test coverage written down.
---

# Test Case Author

You derive tests from the specification, never from the implementation. Reading the code
to decide what to test only confirms the code does what it does.

## When to use

- `frd.md` exists and the feature needs its verification defined before build starts.
- A new requirement was added to an approved FRD and needs matching cases.
- Coverage of an existing feature is unknown and needs auditing against its FRs.

## Inputs

- `docs/sdlc/<feature>/frd.md` — the source of truth for what must be verified.
- `docs/sdlc/<feature>/lld.md` — component boundaries, error paths and technical edge
  cases the FRD does not name.
- `docs/sdlc/constitution.md` for the project's quality bar and required test types.
- Any existing `docs/sdlc/<feature>/test-cases.md` to extend rather than replace.

## Procedure

1. **Inventory the requirements.** List every `FR-###`, its acceptance criteria, and every
   `NFR-###` with a stated threshold. This list is the denominator of your coverage.

2. **Derive cases systematically, not by inspiration.** For each `FR-###` walk all six
   passes in order and record what each produced:

   | Pass | Produces one case per |
   | ---- | --------------------- |
   | Happy path | acceptance criterion, with the criterion's own data |
   | Boundary | value at, just below and just above each stated limit |
   | Validation | validation rule, violated one rule at a time |
   | Error path | failure mode named in the FRD or LLD (timeout, unavailable dependency, conflict) |
   | Permissions | role × operation combination, allowed and denied |
   | Non-functional | `NFR-###` threshold, stated as a measurable assertion |

3. **Mine the LLD for what the FRD cannot know.** Retry and idempotency behaviour,
   concurrent access, partial failure between components, migration and rollback. These
   become cases traced to the `FR-###` whose behaviour they protect.

4. **Write each case to be executable by someone who has not read the FRD.** Preconditions
   state the system state required. Test data is concrete values, not descriptions of
   values. Steps are numbered and each is a single action. The expected result names the
   observable output — a specific value, message, status code or state change.

5. **Reject weak expected results.** "Works correctly", "displays properly" and "no errors"
   are not test cases. If you cannot state what the system does observably, the underlying
   requirement is untestable: mark it `OPEN QUESTION:` against the `FR-###` instead of
   writing a case that can never fail.

6. **Assign priority and type.** Priority `P1` for anything that blocks the requirement's
   acceptance, `P2` for degraded behaviour, `P3` for cosmetic. Type is `unit`,
   `integration`, `end-to-end` or `manual` — choose the cheapest level that can actually
   observe the expected result.

7. **Build the coverage matrix.** One row per `FR-###` and `NFR-###`, listing the `TC-###`s
   covering it. Then run both checks explicitly:
   - Any FR with zero test cases is a **coverage gap** — list it under Coverage gaps with
     the reason, do not quietly leave the row blank.
   - Any test case tracing to no FR is an **orphan** — escalate it, because it means either
     a missing requirement or an invented one. Per the conventions this is a gate, not an
     assumption you may record and move past.

8. **Report the numbers.** Case count by type and by priority, FRs covered versus total,
   gaps and orphans.

## Output contract

Write `docs/sdlc/<feature>/test-cases.md` from
[`references/test-cases-template.md`](references/test-cases-template.md), containing:

- Document control (feature slug, status, revision date, source artifacts)
- Scope of testing and what is explicitly not tested
- Test cases table (`TC-###`, title, verifies `FR-###`, preconditions, test data, steps,
  expected result, priority, type)
- Coverage matrix (`FR-###` → `TC-###`s, with a covered/gap verdict per row)
- Coverage gaps
- Orphan test cases
- Test data and environment requirements
- Assumptions and open questions

Every `TC-###` traces to at least one `FR-###` or `NFR-###`. Every expected result is
observable. No case references a function, class or file name from the implementation.

## Handoff

Report total cases, the split by type, coverage percentage, and every gap and orphan.

Next: the **project-manager** continues with the `work-breakdown` skill, using the test
cases to size the test tasks paired with each implementation task. The **qa** role returns
later with `test-executor` to run these cases against the built feature.
