---
name: lld-author
description: Writes a Low Level Design taking each C-### component from the HLD down to implementation-ready detail - module and file structure, interfaces and method signatures, data schemas, API contracts, sequence diagrams, error handling, named constants and the test seams that make TDD possible. Use after an HLD exists and before any code or test cases are written, or when a component needs specifying precisely enough to implement test-first.
---

# LLD Author

You make the HLD buildable. Every module, interface, signature, schema and constant a
developer needs is decided here, so that implementation is transcription rather than
invention.

## When to use

- `hld.md` exists and its components need implementation-ready detail.
- A component's internals need respecifying after a design change.
- A developer cannot start test-first because the seams are undefined.

## Inputs

- `docs/sdlc/<feature>/hld.md` — the `C-###` components to detail.
- `docs/sdlc/<feature>/frd.md` for behaviour and acceptance criteria.
- `docs/sdlc/constitution.md` and the codebase's existing patterns and shared components.

## Procedure

1. **Derive from what exists before asking anything.** Read the HLD's `C-###`, the FRD's
   acceptance criteria, and the repo's own patterns — module layout, error body format,
   validation approach, shared components, how existing code is made testable. Nearly all of
   an LLD is determined by those, and every one of them is a fact you can go and find. Then
   run the `decision-interview` skill on what is genuinely left open: a schema the FRD does
   not pin down, an API contract with two defensible shapes, state ownership the HLD left
   implicit. If the repo already answers it, it was never a question.

2. **Lay out the modules.** For each `C-###`, give the directory and file structure with
   one line on each file's purpose. Follow the conventions already in the repo; extend an
   existing shared module rather than creating a parallel one.

3. **Define the interfaces and types.** Every contract between modules is an explicit
   named type, named according to
   [../../rules/code-conventions.mdc](../../rules/code-conventions.mdc) and the per-stack
   file it indexes rather than a scheme invented here. State each field's type and whether
   it is optional.

4. **Write the method signatures.** Name, parameters with types, return type, and the
   error cases each can produce. Declare methods as `const` arrow functions where the
   language allows. A signature whose failure modes are unlisted is unfinished.

5. **Decide state management.** What state exists, who owns it, its lifetime, how it is
   updated, and what happens on concurrent update. Include cache invalidation if anything
   is cached.

6. **Specify the concrete data schemas.** Tables or collections with field names, physical
   types, nullability, defaults, constraints, relationships and indexes — and state which
   query each index exists to serve.

7. **Define the API contracts.** Per endpoint: method, path, request shape, response shape,
   status codes for success and every failure, and the error body format. Keep the error
   format identical across endpoints.

8. **Draw sequence diagrams** as Mermaid `sequenceDiagram` for any flow crossing more than
   two modules or involving async work, retries or compensation. Trivial flows do not need
   one.

9. **Detail validation and error handling.** Where each validation rule from the FRD is
   enforced, what is thrown or returned, what is retried, what is logged and at which
   level via `logDebug` / `logError`, and what the caller sees.

10. **Replace every magic value with a named constant.** Timeouts, page sizes, retry
    counts, limits, keys. Name each constant, give its value, its unit and the module that
    declares it.

11. **Define the test seams.** For each module, state what must be injectable or mockable
    — clock, id generator, HTTP client, repository, logger — and how it is injected. This
    is the step that makes TDD possible: if a behaviour cannot be exercised in isolation,
    the design is not finished, so change the design rather than accepting an untestable
    module.

12. **Trace each module** to its `C-###` and the `FR-###` it implements. Anything tracing
    to nothing is either dead design or a missing requirement — say which.

## Output contract

Write `docs/sdlc/<feature>/lld.md` from
[`references/lld-template.md`](references/lld-template.md), containing:

- Document control (feature slug, status, revision date)
- Per-component module and file structure
- Interface and type definitions
- Method signatures with parameters, returns and error cases
- State management
- Data schemas with types, constraints and indexes
- API contracts with request/response shapes and status codes
- Sequence diagrams for non-trivial flows
- Validation and error handling
- Named constants
- Test seams
- Traceability (module → `C-###` → `FR-###`)
- Assumptions and open questions

No magic values anywhere in the document, and every module has at least one named seam.

## Handoff

Report the module count, the test seams defined, any module that could not be made
independently testable, and every open question.

Next: the **qa** role continues with the `test-case-author` skill to write `TC-###` cases
against these seams and the FRD's acceptance criteria. With Spec Kit present, the HLD and
LLD together are what you pass to `/speckit.plan`.
