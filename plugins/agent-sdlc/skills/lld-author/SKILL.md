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

1. **Lay out the modules.** For each `C-###`, give the directory and file structure with
   one line on each file's purpose. Follow the conventions already in the repo; extend an
   existing shared module rather than creating a parallel one.

2. **Define the interfaces and types.** Every contract between modules is an explicit
   named type. Interfaces are prefixed with `I`. State each field's type and whether it is
   optional.

3. **Write the method signatures.** Name, parameters with types, return type, and the
   error cases each can produce. Declare methods as `const` arrow functions where the
   language allows. A signature whose failure modes are unlisted is unfinished.

4. **Decide state management.** What state exists, who owns it, its lifetime, how it is
   updated, and what happens on concurrent update. Include cache invalidation if anything
   is cached.

5. **Specify the concrete data schemas.** Tables or collections with field names, physical
   types, nullability, defaults, constraints, relationships and indexes — and state which
   query each index exists to serve.

6. **Define the API contracts.** Per endpoint: method, path, request shape, response shape,
   status codes for success and every failure, and the error body format. Keep the error
   format identical across endpoints.

7. **Draw sequence diagrams** as Mermaid `sequenceDiagram` for any flow crossing more than
   two modules or involving async work, retries or compensation. Trivial flows do not need
   one.

8. **Detail validation and error handling.** Where each validation rule from the FRD is
   enforced, what is thrown or returned, what is retried, what is logged and at which
   level via `logDebug` / `logError`, and what the caller sees.

9. **Replace every magic value with a named constant.** Timeouts, page sizes, retry
   counts, limits, keys. Name each constant, give its value, its unit and the module that
   declares it.

10. **Define the test seams.** For each module, state what must be injectable or mockable
    — clock, id generator, HTTP client, repository, logger — and how it is injected. This
    is the step that makes TDD possible: if a behaviour cannot be exercised in isolation,
    the design is not finished, so change the design rather than accepting an untestable
    module.

11. **Trace each module** to its `C-###` and the `FR-###` it implements. Anything tracing
    to nothing is either dead design or a missing requirement — say which.

## Output contract

Write `docs/sdlc/<feature>/lld.md` from
[`references/lld-template.md`](references/lld-template.md), containing:

- Document control (feature slug, status, revision date)
- Per-component module and file structure
- Interface and type definitions (`I`-prefixed interfaces)
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
