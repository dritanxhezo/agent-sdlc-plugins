---
name: frd-author
description: Writes a Functional Requirements Document that turns each BR-### business requirement into numbered functional requirements (FR-###) and non-functional requirements (NFR-###), each with Given/When/Then acceptance criteria and a traceability table back to the BRD. Use after a BRD exists and before any architecture or design work, or when functional behaviour needs pinning down precisely enough to test.
---

# FRD Author

You specify *what the system does* in observable behaviour. You do not choose components,
frameworks, schemas or algorithms — that is the architect's job.

## When to use

- A `brd.md` exists and its `BR-###` items need turning into testable behaviour.
- A new business requirement was added to an approved BRD.
- Functional behaviour is disputed or under-specified and needs writing down.

## Inputs

- `docs/sdlc/<feature>/brd.md` — the source of every `BR-###`.
- `docs/sdlc/constitution.md` for standing constraints.
- Any existing `docs/sdlc/<feature>/frd.md` to extend rather than replace.

## Procedure

1. **Inventory the actors.** List every human role and every external system that
   initiates or receives behaviour. Give each its permissions. An actor nobody named in
   the BRD is a scope question, not a detail.

2. **Map the user journeys.** For each actor, write the end-to-end paths through the
   feature as ordered steps. Journeys expose the requirements that requirement lists miss.

3. **Derive functional requirements** as `FR-###`, walking the BRD one `BR-###` at a time.
   Each FR states preconditions, trigger, behaviour and postconditions, and names the
   `BR-###` it satisfies. Describe what a user or caller can observe, never how it is
   built.

4. **Write acceptance criteria in Given/When/Then form.** At least one per FR, plus one
   per meaningful alternate path. An FR without criteria a tester could execute unchanged
   is not done — finish it or mark it `OPEN QUESTION:`.

5. **Extract business rules and validation rules** into their own numbered lists so that
   several FRs can reference one rule instead of restating it. Validation rules state the
   field, the constraint and the message the user gets.

6. **Define the data entities logically.** Name each entity, its fields, each field's
   meaning and whether it is required. Types stay conceptual (money, date, identifier);
   no column types, no keys, no indexes.

7. **Specify errors and edge cases.** Empty state, maximum volume, concurrent edits,
   partial failure, timeout, permission denied. For each, state the observable outcome.
   Silence here becomes a defect later.

8. **Write non-functional requirements** as `NFR-###`, covering at least performance,
   security, accessibility and availability. Each needs a measurable threshold with a
   condition — "p95 under 400 ms at 200 concurrent users", not "fast".

9. **Build the traceability table** mapping every FR to its BR. Then check both
   directions: a `BR-###` with no FR is a **coverage gap**, an `FR-###` with no BR is
   **scope creep**. Report both explicitly rather than quietly resolving them.

10. **Escalate in one batch, not a drip.** Three things need the user: two requirements that
    conflict, a business requirement that cannot be made testable, and a coverage gap that
    can only be closed by growing scope. Collect them all and ask once, in the question
    format the [`decision-interview`](../decision-interview/SKILL.md) skill defines —
    numbered, titled, each carrying a recommended answer, so a one-word reply is enough.
    Anything else takes its recommendation and is recorded as `ASSUMPTION:`.

    Never spend a question on something the BRD, the constitution or the codebase already
    answers. Most of an FRD is derivation, so a full interview is usually overkill here;
    the format is what matters, not the rounds.

## Output contract

Write `docs/sdlc/<feature>/frd.md` from
[`references/frd-template.md`](references/frd-template.md), containing:

- Document control (feature slug, status, revision date)
- Actors and roles
- User journeys
- Functional requirements (`FR-###` with preconditions, trigger, behaviour,
  postconditions, acceptance criteria)
- Business rules and validation rules
- Data entities (logical)
- Error and edge case handling
- Non-functional requirements (`NFR-###` with measurable thresholds)
- Traceability table (`FR-###` → `BR-###`)
- Coverage gaps and scope creep findings
- Assumptions and open questions

Every FR carries at least one Given/When/Then criterion and traces to at least one BR. No
requirement may name a framework, library, table or endpoint.

## Handoff

Report the FR and NFR counts, every coverage gap, every scope creep finding and every open
question.

Next: the **architect** continues with the `hld-author` skill to design the system that
satisfies these requirements. With Spec Kit present, the FRD is the artifact you pass to
`/speckit.specify` and `/speckit.clarify` — point them at `docs/sdlc/<feature>/frd.md`
rather than re-describing the feature.
