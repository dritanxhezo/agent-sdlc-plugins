---
name: hld-author
description: Writes a High Level Design that decomposes a feature into C-### components with responsibilities, owned data, interactions and a Mermaid diagram, records technology choices with rejected alternatives, and shows how each NFR is satisfied by a named design element. Use after an FRD exists and before low level design, or when system-level structure, integration points or deployment topology need deciding.
---

# HLD Author

You decide the shape of the system: what the components are, what each owns, how they talk
and what technology they run on. You do not write method signatures, schemas or file
layouts — that is the LLD.

## When to use

- `frd.md` exists and the feature needs system-level structure before implementation
  detail.
- A new integration, external dependency or deployment change alters the architecture.
- An existing HLD needs extending for requirements added to the FRD.

## Inputs

- `docs/sdlc/<feature>/frd.md` — the `FR-###` and `NFR-###` this design must satisfy.
- `docs/sdlc/<feature>/brd.md` for business context and priorities.
- `docs/sdlc/constitution.md` for standing technical constraints.
- The existing codebase: its current architecture is a constraint, not a blank page.

## Procedure

1. **Derive the architectural drivers.** Read the `NFR-###` list and turn it into the
   forces the design must answer — throughput, latency, data volume, security boundary,
   uptime target, accessibility. Drivers, not preferences, justify structure.

2. **Interview on the choices, not the boxes.** Run the `decision-interview` skill over what
   is genuinely open: the technology choices, the integration approach, the deployment
   model, and any driver the NFRs imply without stating. Component boundaries are normally
   yours to decide — put a decomposition to the user only when two defensible ones carry
   different costs they should be choosing between. Read the codebase first: its current
   architecture is a fact, and a question about it is a question wasted.

3. **Inventory the components** as `C-###`. Each gets a single responsibility stated in
   one sentence and an explicit list of the data it owns. Two components owning the same
   data is a design fault; resolve it before continuing.

4. **Define the interactions.** For each component pair that communicates, state the
   direction, the trigger, the synchronicity and the payload at a conceptual level. Draw
   it as a Mermaid `graph TD` (or `C4Context` where the external boundary matters most).

5. **Record technology choices with their alternatives.** For every choice, name at least
   one alternative considered and why it was rejected. A choice with no rejected
   alternative was not a decision.

6. **Raise ADRs for the expensive ones.** Any choice that is irreversible or costly to
   reverse — persistence engine, protocol, hosting model, auth provider, framework —
   becomes `docs/sdlc/<feature>/adr/NNNN-<slug>.md` from
   [`references/adr-template.md`](references/adr-template.md), numbered `ADR-####`. The
   HLD then links to the ADR instead of restating the argument. These are the choices that
   earn a question in step 2: an irreversible decision is never left to an assumption.

7. **Map integration points and external dependencies.** For each: protocol, direction,
   authentication method, failure mode and what the system does when it is unavailable.

8. **Trace the data flow** for each significant journey in the FRD — where data enters,
   which components transform it, where it comes to rest, and what leaves the trust
   boundary.

9. **Decide the cross-cutting concerns** once, centrally: authentication and
   authorisation, logging, error handling and propagation, configuration and secrets,
   observability. Each gets a named owning component so no component invents its own.

10. **Describe the deployment topology.** Runtime units, where each runs, how they scale,
    and what state is held where.

11. **Satisfy the NFRs explicitly.** For each significant `NFR-###`, name the specific
    design element that delivers it and how it will be verified. An NFR with no design
    element behind it is unmet, not implied.

12. **Build the traceability table** from each `C-###` to the `FR-###` and `NFR-###` it
    serves. A component serving nothing is unnecessary; an FR served by nothing is a gap.

## Output contract

Write `docs/sdlc/<feature>/hld.md` from
[`references/hld-template.md`](references/hld-template.md), containing:

- Document control (feature slug, status, revision date)
- Architectural drivers (from the NFRs)
- Component inventory (`C-###`, responsibility, owned data)
- Component interactions with a Mermaid diagram
- Technology choices with alternatives considered and rejection rationale
- Integration points and external dependencies
- Data flow
- Cross-cutting concerns
- Deployment topology
- NFR satisfaction table
- Traceability (`C-###` → `FR-###` / `NFR-###`)
- Assumptions and open questions

Plus one `docs/sdlc/<feature>/adr/NNNN-<slug>.md` per expensive-to-reverse decision.

## Handoff

Report the component count, every ADR raised, whether each irreversible decision was
confirmed by the user or is still awaiting them, and any FR or NFR no component covers.

Next: the **architect** continues with the `lld-author` skill to take each `C-###` down to
implementation-ready detail. With Spec Kit present, the HLD together with the LLD is what
you pass to `/speckit.plan`.
