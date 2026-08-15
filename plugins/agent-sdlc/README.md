# agent-sdlc

A crew of SDLC agent roles: business analysis, architecture, QA, project management,
test-driven development and debugging.

## Components

**Skills** (12) — `sdlc-orchestrator` routes work; `brd-author` and `frd-author` capture
requirements; `hld-author` and `lld-author` design; `test-case-author` and `test-executor`
verify; `work-breakdown` and `execution-plan` plan and publish; `tdd-implement` and
`pr-flow` build and merge; `defect-triage` diagnoses.

**Agents** (6) — `business-analyst`, `solution-architect`, `qa-engineer`,
`project-manager`, `developer`, `debugger`.

**Rules** (2, Cursor) — the pipeline conventions, and code conventions scoped to source
files.

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

See the [repository README](https://github.com/dritanxhezo/agent-sdlc-plugins) for
installation and development.
