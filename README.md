# agent-sdlc-plugins

A marketplace repository containing **agent-sdlc**: a crew of SDLC agent roles that take a
feature from an idea to merged, tested code, with the paperwork done along the way.

Works in **Cursor**, **Claude Code** and **GitHub Copilot** from one source tree.

## What it does

Six roles hand work to each other, each producing one artifact:

| Role                 | Produces                                          |
| -------------------- | ------------------------------------------------- |
| Business analyst     | BRD, FRD with Given/When/Then acceptance criteria |
| Solution architect   | High level design, low level design, ADRs         |
| QA engineer          | Test cases with a coverage matrix, run reports    |
| Project manager      | Phased task breakdown, GitHub issues, Gantt chart |
| Developer            | Failing test first, then code, then a merged PR   |
| Debugger             | Reproduction, root cause, regression test, fix    |

Identifiers stay stable and traceable the whole way down: `BR-###` to `FR-###` to `C-###`
to `TC-###` to `T-###`. Anything that traces to nothing gets reported rather than absorbed.

## Install

### Cursor

```bash
# Add this repository as a marketplace, then install the plugin from Customize.
# For local development instead:
git clone https://github.com/dritanxhezo/agent-sdlc-plugins
node agent-sdlc-plugins/plugins/agent-sdlc/bin/install.mjs --tool cursor --scope user
```

### Claude Code

```bash
/plugin marketplace add dritanxhezo/agent-sdlc-plugins
/plugin install agent-sdlc@agent-sdlc-plugins
```

### GitHub Copilot

Copilot CLI and VS Code read plugin marketplaces, and their manifest lookup falls back to
`.claude-plugin/marketplace.json`, which this repository already ships:

```bash
copilot plugin marketplace add dritanxhezo/agent-sdlc-plugins
copilot plugin install agent-sdlc@agent-sdlc-plugins
```

Verified end to end against Copilot CLI 1.0.80: the marketplace registers, 12 skills
install, all six subagents resolve as `agent-sdlc:business-analyst` and so on, the
`sdlc-tracker` server starts and registers its seven tools, and the gates fire — a source
file written with no test covering it is refused with the TDD message, after which the
agent writes the test first.

Or vendor the components into a repository as loose files, without a plugin:

```bash
node path/to/plugins/agent-sdlc/bin/install.mjs --tool copilot
```

That writes skills to `.github/skills/`, agents to `.github/agents/*.agent.md`, MCP servers
to `.vscode/mcp.json`, and a delimited block into `.github/copilot-instructions.md`. Add
`--dry-run` to see what it would do, or `--scope user` to install to `~/.copilot/`.

## How to use it

Ask for the outcome and let the orchestrator route:

> Build a feature that lets support staff search orders by customer email.

It resolves a feature slug, writes the constitution if missing, and walks the roles in
order. Or drive a single role directly: "write the BRD for …", "break this down into tasks".

## What is portable and what is not

All three tools install this repository as a plugin from a marketplace manifest, and all
three read skills, subagents, hooks and MCP servers. What differs is the file each expects
and the payload each sends, so the plugin ships a portable core plus per-client adapters:

| Component        | Cursor          | Claude Code     | Copilot            |
| ---------------- | --------------- | --------------- | ------------------ |
| Skills           | native          | native          | native             |
| Subagents        | native          | native          | native             |
| MCP servers      | native          | native          | native             |
| Rules            | native          | via CLAUDE.md   | via instructions   |
| Hooks            | native          | native          | native             |
| Marketplace      | after review    | self-serve      | self-serve         |

The root `plugin.json` conforms to [Agent Plugins 1.0](https://agent-plugins.org), the open
vendor-neutral standard for skills and MCP servers. Cursor and Claude Code each read their
own manifest from the same directory, and Copilot reads the root one. Hooks are written
three times, because each client uses different event names, payload field names and
response keys; the logic behind them lives once in `hooks/lib/` with a thin adapter per
client. Copilot's config sits at the plugin root as `hooks.json`, the one name neither of
the other two auto-discovers.

The plugin-root token is a non-issue in practice: Copilot injects `PLUGIN_ROOT`,
`CLAUDE_PLUGIN_ROOT` and `COPILOT_PLUGIN_ROOT` into every plugin process, so both MCP
variants resolve.

## Tasks live in GitHub

The plugin treats **GitHub Issues as the single source of truth** for tasks, with
estimates, phase and dependencies as GitHub Projects v2 custom fields. The
`execution-plan.md` document and its Mermaid Gantt chart are *generated views* — they are
regenerated from live data and never hand-edited, so they cannot go stale.

This is what the bundled `sdlc-tracker` MCP server does. It has no dependencies and no
auth of its own: it shells out to `gh`, inheriting your existing login.

Projects v2 needs a scope the default `gh` login does not include:

```bash
gh auth refresh -s project
```

## Gates

Two hooks watch for work getting ahead of itself, and one watches for leaked credentials.
Configure them by copying `sdlc.config.example.json` to `sdlc.config.json` in your project:

| Gate      | Default | What it catches                                       |
| --------- | ------- | ----------------------------------------------------- |
| `spec`    | `warn`  | Source edits before any specification exists          |
| `tdd`     | `warn`  | Source edits where no test covers the file            |
| `secrets` | `block` | Credentials about to be written to disk               |

`warn` allows the edit and injects a reminder; `block` refuses it and tells the agent what
to do instead. Secrets block by default. Every hook fails open — a crash or timeout never
stops you working.

## Repository layout

```
.cursor-plugin/marketplace.json     Cursor marketplace manifest
.claude-plugin/marketplace.json     Claude Code and Copilot marketplace manifest
plugins/agent-sdlc/
├── plugin.json                     Agent Plugins 1.0 manifest (portable core, read by Copilot)
├── .cursor-plugin/plugin.json      Cursor manifest: adds rules and hooks
├── .claude-plugin/plugin.json      Claude Code manifest
├── hooks.json                      Copilot hook config, at the root where it looks
├── skills/                         12 role skills with artifact templates
├── agents/                         6 subagent definitions
├── rules/                          Cursor rules
├── hooks/{lib,adapters}/           Shared hook logic, per-client adapters
├── mcp/sdlc-tracker/               The tracker MCP server, zero dependencies
├── bin/install.mjs                 Local installer and vendoring generator
└── mcp.source.json                 Source for the generated MCP configs
scripts/                            build, validate, smoke
tests/                              Unit tests
docs/CONVENTIONS.md                 The contract every skill follows
```

## Development

```bash
npm run build      # regenerate mcp.json and .mcp.json from mcp.source.json
npm run validate   # check every manifest, skill, agent, rule and hook
npm test           # unit tests
npm run smoke      # MCP handshake and hook adapter integration
npm run check      # everything
```

CI runs all of the above on Linux and Windows against Node 20 and 22.

Adding a skill? Read [docs/CONVENTIONS.md](docs/CONVENTIONS.md) first — it defines artifact
paths, identifier schemes, gate behaviour and the skill file contract that keeps the roles
working as one pipeline.

## License

MIT
