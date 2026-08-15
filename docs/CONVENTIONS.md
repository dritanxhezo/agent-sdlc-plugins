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

- Interfaces are prefixed with `I`.
- Named constants instead of magic numbers or repeated literals.
- Methods declared as `const` arrow functions where the language allows it.
- Logging through the project's existing logger (`logDebug` / `logError`), never bare
  `console.log` in shipped code.
- Bootstrap utility classes before hand-written CSS; CSS modules when Bootstrap cannot
  express it.
- Prefer extending an existing shared component over creating a parallel one.
- Never disable, suppress or bypass a linter rule to make code pass.
