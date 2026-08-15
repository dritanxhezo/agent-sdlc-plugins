---
name: brd-author
description: Writes a Business Requirements Document capturing the problem, stakeholders, business goals, scope boundaries, success metrics and numbered business requirements. Use at the start of a feature, before any functional detail or technical design, or when a request needs its business case made explicit.
---

# BRD Author

You establish *why* the work is worth doing and *what outcome* counts as success. You do
not describe screens, APIs, data models or technology.

## When to use

- A feature request arrives as a sentence or a paragraph and needs a business case.
- Stakeholders disagree about scope and it needs writing down.
- An existing BRD needs extending for a new business driver.

## Inputs

- The request in the user's words.
- `docs/sdlc/constitution.md` for the project's standing constraints.
- Any existing `docs/sdlc/<feature>/brd.md` to extend rather than replace.

## Procedure

1. **Separate problem from solution.** Restate the request as a problem statement. If the
   user described a solution ("add a dropdown to filter orders"), work backwards to the
   problem it serves ("users cannot find recent orders quickly") and confirm it.

2. **Identify stakeholders.** For each, capture their role, what they need from the
   feature, and how success looks from their seat. Distinguish the person who *decides*
   from the people who are *affected*.

3. **Write the business goals.** Each goal must be an outcome, not an activity, and each
   must have a measurable success metric with a baseline and a target. A goal without a
   metric is an `OPEN QUESTION:`, not a goal.

4. **Draw the scope boundary.** List what is in scope, and — more importantly — what is
   explicitly out of scope for this iteration. Out-of-scope items are the cheapest defect
   prevention available.

5. **Number the business requirements** as `BR-###`. Each one is a single testable
   business capability, written as "The business needs X so that Y." Assign each a
   priority (`MUST` / `SHOULD` / `COULD`) and name the stakeholder who owns it.

6. **Record constraints and risks.** Regulatory, budget, timeline, dependency on other
   teams. For each risk note its impact and whether it is accepted or needs mitigation.

7. **Interrogate your own draft.** For every requirement ask: can a reviewer tell whether
   this was met? Can it be traced to a stated goal? If not, fix it or mark it
   `OPEN QUESTION:`.

8. **Escalate real ambiguity.** Ask the user when a business goal has no measurable
   outcome, when two stakeholders' needs conflict, or when the requested scope contradicts
   the constitution. Record everything else as `ASSUMPTION:` and continue.

## Output contract

Write `docs/sdlc/<feature>/brd.md` from
[`references/brd-template.md`](references/brd-template.md), containing:

- Document control (feature slug, status, revision date)
- Problem statement
- Stakeholders
- Business goals with success metrics
- Scope: in and out
- Business requirements table (`BR-###`, statement, priority, owner, success metric)
- Constraints
- Risks and mitigations
- Assumptions and open questions

Every `BR-###` must trace to at least one business goal. No requirement may name a
technology, framework, screen or database.

## Handoff

Report the requirement count, the MUST/SHOULD/COULD split and every open question.

Next: the **business-analyst** continues with the `frd-author` skill to turn each `BR-###`
into functional requirements. With Spec Kit present, the BRD is the input you pass to
`/speckit.specify` rather than describing the feature again from scratch.
