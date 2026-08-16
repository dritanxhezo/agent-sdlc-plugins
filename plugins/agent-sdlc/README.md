# agent-sdlc

A crew of SDLC agent roles: business analysis, architecture, QA, project management,
test-driven development and debugging.

## Components

**Skills** (13) — `sdlc-orchestrator` routes work; `brd-author` and `frd-author` capture
requirements; `hld-author` and `lld-author` design; `test-case-author` and `test-executor`
verify; `work-breakdown` and `execution-plan` plan and publish; `tdd-implement` and
`pr-flow` build and merge; `defect-triage` diagnoses. `decision-interview` is the shared one:
the four decision-dense skills run it before drafting, so the artifact records what you chose
rather than what the agent guessed.

**Agents** (6) — `business-analyst`, `solution-architect`, `qa-engineer`,
`project-manager`, `developer`, `debugger`.

**Rules** (3) — the pipeline conventions, plus the code conventions, split into a
language-agnostic `code-conventions.mdc` and a per-stack `code-conventions-ts.mdc`. Together
they are the single source of truth for how generated code is written. Cursor attaches them
by their globs, so C# work never gets React conventions. A vendored Copilot install converts
them into path-scoped `.github/instructions/*.instructions.md`, which Copilot scopes the same
way via `applyTo`. Claude Code has no equivalent, so `tdd-implement`, `defect-triage`,
`pr-flow` and the `developer` agent link to the core file and read it as part of their
procedure.

Adding a stack is additive: a new `code-conventions-<stack>.mdc` with its own globs, listed
in the core file's index.

**Hooks** (Cursor and Claude Code) — session context loader, spec gate, TDD guard,
task sync on commit and merge, credential scan.

**MCP servers** (3) — `sdlc-tracker` (bundled, zero dependencies), `github`, `playwright`.

## Quick start

1. Install the plugin, then ask for an outcome: "build a feature that lets support staff
   search orders by customer email".
2. The orchestrator writes `docs/sdlc/constitution.md` if absent, resolves a feature slug,
   and walks the roles in order.
3. Grant the Projects scope before the planning phase: `gh auth refresh -s project`.
4. Copy `sdlc.config.example.json` from the repository root to `sdlc.config.json` in your
   project to change gate behaviour.

## Artifacts it produces

In the repository you are building, under `docs/sdlc/<feature>/`:

```
brd.md              Business requirements, BR-###
frd.md              Functional requirements, FR-### and NFR-###
hld.md              High level design, C-###
lld.md              Low level design
adr/                Architecture decision records, ADR-####
test-cases.md       Test cases, TC-###, with a coverage matrix
work-breakdown.md   Phased tasks, T-###, with estimates and dependencies
execution-plan.md   Generated view of GitHub state, with the Gantt chart
test-runs/          Dated run reports
defects/            Defect reports, DEF-###
```

Tasks themselves live in GitHub Issues, with estimates, phase and dependencies on a
Projects v2 board. The execution plan document is regenerated from that data, never edited
by hand.

## Spec Kit

When `.specify/` exists in the target repository, this plugin's artifacts become the
upstream of [Spec Kit](https://github.github.io/spec-kit/) rather than a replacement: the
requirements and designs are handed to `/speckit.plan` and `/speckit.tasks` instead of
producing a competing plan.

## Notes on Copilot

Copilot loads this plugin from a marketplace like the other two clients, and the gates run
there through `hooks.json` at the plugin root. Note that its file tools name their content
argument `file_text` and `new_str`, not `content` — a gate that does not read those sees an
empty file and allows everything. A *vendored* install is the exception: it
copies loose files with no plugin manifest behind them, so no hooks are registered and the
gates become advisory. That is why the installer writes them into
`.github/copilot-instructions.md` as well.

## Notes on Cursor

Cursor cannot start an MCP server that lives inside a plugin: it expands no plugin-root
placeholder in `mcp.json`, injects no plugin-root variable into the server process, and
resolves a relative argument against your home directory. Its hooks are the exception, and
they run from the plugin root — so the `workspaceOpen` hook writes an `sdlc-tracker` entry
with the resolved absolute path into `~/.cursor/mcp.json`, and rewrites it after each plugin
update, when the install path's commit sha changes.

Cursor does not watch that file, so the tracker appears after the next **Developer: Reload
Window**. An entry pointing anywhere other than this plugin's own server is treated as a
deliberate override and left alone, as is a file that does not parse. Set
`registerCursorMcp: false` in `sdlc.config.json` to opt out entirely.

See the [repository README](https://github.com/dritanxhezo/agent-sdlc-plugins) for
installation and development.
