# Authoring conventions

Every skill, agent and hook in this plugin follows the contracts below. They exist so
that twelve independently-written skills behave like one pipeline.

## Artifact locations

All SDLC artifacts live in the **target** repository (the project being built), never in
the plugin repository.

| Artifact                | Path                                          | Owner role       |
| ----------------------- | --------------------------------------------- | ---------------- |
| Constitution            | `docs/sdlc/constitution.md`                   | shared           |
| Business requirements   | `docs/sdlc/<feature>/brd.md`                  | business-analyst |
| Functional requirements | `docs/sdlc/<feature>/frd.md`                  | business-analyst |
| High level design       | `docs/sdlc/<feature>/hld.md`                  | architect        |
| Low level design        | `docs/sdlc/<feature>/lld.md`                  | architect        |
| Architecture decisions  | `docs/sdlc/<feature>/adr/NNNN-<slug>.md`      | architect        |
| Test cases              | `docs/sdlc/<feature>/test-cases.md`           | qa               |
| Test run results        | `docs/sdlc/<feature>/test-runs/<ISO-date>.md` | qa               |
| Work breakdown          | `docs/sdlc/<feature>/work-breakdown.md`       | project-manager  |
| Execution plan + Gantt  | `docs/sdlc/<feature>/execution-plan.md`       | project-manager  |
| Defect reports          | `docs/sdlc/<feature>/defects/<id>.md`         | debugger         |

`<feature>` is a kebab-case slug, prefixed with a zero-padded ordinal when the project has
more than one feature in flight: `001-user-onboarding`.

When GitHub Spec Kit is present (a `.specify/` directory exists), `docs/sdlc/` artifacts
are the *upstream* of Spec Kit's own files, never a replacement for them. See
"Spec Kit interoperability" below.

## Identifier schemes

Stable IDs are what let downstream artifacts reference upstream ones. Never renumber an
existing ID; mark it superseded instead.

| Entity                | Format     | Example  |
| --------------------- | ---------- | -------- |
| Business requirement  | `BR-###`   | `BR-014` |
| Functional requirement| `FR-###`   | `FR-007` |
| Non-functional req.   | `NFR-###`  | `NFR-003`|
| Design component      | `C-###`    | `C-002`  |
| Architecture decision | `ADR-####` | `ADR-0003` |
| Test case             | `TC-###`   | `TC-021` |
| Task                  | `T-###`    | `T-045`  |
| Defect                | `DEF-###`  | `DEF-006`|

These ids are the join keys between artifacts, so they are the only ones another skill may
cite. A template that needs to label something local to its own document — an actor, a user
journey, a logical entity, a business or validation rule, an edge case, an architectural
driver, an integration point — uses a short single-letter prefix (`A-1`, `J-1`, `E-1`,
`BRU-1`, `VR-1`, `EC-1`, `D-1`, `X-1`). The different shape is deliberate: it signals the id
is scoped to one document and carries no traceability guarantee. Acceptance criteria are
numbered as children of their requirement (`AC-001.1`) so a test case can cite one directly.

## Traceability

Every artifact carries a traceability table linking its own IDs back to the IDs it
satisfies. A downstream artifact that cannot trace to an upstream ID is a finding, not a
detail: surface it rather than inventing a requirement.

```
| FR    | Satisfies | Covered by |
| ----- | --------- | ---------- |
| FR-007| BR-014    | TC-021, TC-022 |
```

## Single source of truth for tasks

Tasks live in **GitHub Issues**, with metadata in a **GitHub Projects v2** board:

- One issue per task, titled `T-### <task title>`.
- Phases are **milestones**.
- `Estimate` (number, ideal hours), `Phase` (text) and `Depends On` (text, comma separated
  task IDs) are Projects v2 custom fields. `Status` is the board's built-in field.
- `docs/sdlc/<feature>/execution-plan.md` is a **generated view**. Never hand-edit its
  task table or Gantt chart; regenerate with the `render_gantt` tracker tool.

All reads and writes go through the `sdlc-tracker` MCP server so that the markdown view
and GitHub cannot drift. Do not call `gh issue edit` directly from a skill.

### Task status vocabulary

`Status` is the board's built-in field. Skills use exactly these four names:

| Status        | Meaning                                                        |
| ------------- | -------------------------------------------------------------- |
| `Todo`        | Not started                                                     |
| `In Progress` | Branch created or work committed                                |
| `In Review`   | Pull request open, awaiting review or CI                        |
| `Done`        | Merged; `task_update` also closes the issue                     |

`task_update` accepts common synonyms and normalises them. A board that lacks one of these
options falls back to the nearest coarser status rather than failing, so `In Review` may
land as `In Progress` on a default board. Never invent a fifth status name.

### Tracker MCP tools

| Tool                 | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `tracker_init`       | Create or adopt the Project v2 board and its custom fields   |
| `plan_sync`          | Push a work breakdown to issues, milestones and board fields |
| `task_list`          | List tasks with status, phase, estimate and dependencies     |
| `task_update`        | Change status, estimate, dependencies or assignee            |
| `dependency_graph`   | Return tasks in dependency order and flag cycles             |
| `render_gantt`       | Produce the Mermaid Gantt chart from live task data          |
| `plan_status`        | Roll-up: per phase counts, critical path, blocked tasks      |

## Gate behaviour

The pipeline uses **soft gates**. A role completes its artifact, reports what it produced
and what it assumed, then continues unless it hit something genuinely ambiguous or risky.

Escalate to the user — do not guess — when any of these is true:

- A requirement conflicts with another requirement or with the constitution.
- An estimate would be a guess of a different order of magnitude than its neighbours.
- A design choice is irreversible or expensive to reverse.
- A test case cannot be traced to any functional requirement.
- Scope grew beyond what the approved upstream artifact described.

Otherwise: record the assumption in the artifact's **Assumptions** section and keep going.

## Skill file contract

Each skill is `skills/<name>/SKILL.md` with this frontmatter and section order:

```markdown
---
name: <kebab-case, matches directory>
description: <what it does and when to use it, one or two sentences, third person>
---

# <Title>

## When to use
## Inputs
## Procedure
## Output contract
## Handoff
```

- `description` must state *when to use it* — that text is the only thing an agent sees
  when deciding whether to load the skill.
- `Procedure` is numbered and imperative.
- `Output contract` states the exact file path written and the sections it must contain.
- `Handoff` names the next role and the command or skill that continues the pipeline.
- Templates live beside the skill in `references/`, referenced by relative path.
- Keep `SKILL.md` under roughly 150 lines. Push detail into `references/`.

## Spec Kit interoperability

Detect Spec Kit by the presence of `.specify/` in the target repo.

- **Present**: the business-analyst and architect roles write `docs/sdlc/` artifacts, then
  hand off to `/speckit.plan`, `/speckit.tasks` and `/speckit.implement`, passing the
  artifact paths as context. Do not duplicate `plan.md` or `tasks.md`.
- **Absent**: the `work-breakdown` and `tdd-implement` skills cover the same ground
  natively.

Never invoke `/speckit.specify` for something already captured in a BRD or FRD; point it
at the existing artifact instead.

## Tone in generated artifacts

Write for a human reviewer who will approve or reject the document:

- Lead with the decision or the requirement, then the rationale.
- No filler headings and no restating the section title as its first sentence.
- Mark every uncertainty explicitly as `ASSUMPTION:` or `OPEN QUESTION:` inline.
- Tables for enumerable facts, prose for reasoning.

## Code conventions for generated code

- Naming Conventions
  - Components & Classes: Use PascalCase for React component names (UserProfile.tsx) and class declarations.
  - Variables, Functions & Hooks: Use camelCase for standard variables, local functions, and custom hooks (getUserData, useAuth).
  - Constants: Use UPPER_SNAKE_CASE for global or compile-time immutable values (MAX_RETRY_LIMIT). Use named constants instead of magic numbers or repeated literals.
  - Files & Folders: Use PascalCase for React component files, and camelCase or kebab-case for general utilities, services, and configuration files. Use a feature-based structure, common/ for shared logic, application-wide configurations in config/, global constants & utils (if needed) in constants/

- React & TypeScript Practices
  - Functional Components: Write pure arrow functions or declarations for components (const MyComponent: React.FC<Props> = () => {}).
  - Props Typing: Define explicit interface or type aliases for component props, avoiding implicit any types.
  - Single Responsibility: Keep individual components small, ideally under 150–200 lines, splitting sub-components or moving business logic into custom hooks.
  - State Management: Type useState with generics when initializing with union types or empty values (e.g., useState<User | null>(null)).
  - Log through the project's utility loggers (`logDebug` / `logError`), never bare `console.log` in shipped code.
  - Components: If the project provides a shared UI components library use that and extend it where possible instead of new components. If not create a shared UI components library with a Stotybook to simplify the main UI application.

- HTML, CSS, JS Practices
  - Use a classless css framework (such mvp.css) to style the application, with CSS variables to over write defaults and CSS modules. Prefer modern CSS, HTML, JS features to simplify the markup.
  - Use concentric css to sort css properties via prettier-plugin-css-order
  
- Node.js & Backend Standards
  - Layered Architecture: Separate route handlers, business logic controllers, and database access service layers cleanly.
  - Async/Await: Prefer clean async/await syntax over raw promises, wrapping operations in explicit try/catch blocks.
  - Environment Validation: Validate environment variables strictly at startup using validation tools like Zod or Joi.
  - Error Handling: Use centralized custom error classes and global Express/Fastify error-handling middleware.

- Tooling & Configuration
  - Strict Mode: Enable "strict": true in your tsconfig.json for full type safety.
  - Linting & Formatting: Integrate ESLint with TypeScript plugins alongside Prettier to automate code style consistency. Use import sorting with the eslint-plugin-simple-import-sort plugin. Never disable, suppress or bypass a linter rule to make code pass.
