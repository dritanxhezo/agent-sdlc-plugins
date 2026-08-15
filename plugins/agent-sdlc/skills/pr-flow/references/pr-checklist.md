# Pull request checklist

Work top to bottom. Every box is something you verified, not something you intend to do.

## Branch and commits

- [ ] Branch is `<type>/T-###-<slug>`, type one of `feat` / `fix` / `chore` / `refactor` /
      `test` / `docs`.
- [ ] Branched from an up-to-date default branch.
- [ ] One task only on this branch.
- [ ] Commits are `<type>(<scope>): <imperative summary>` with `Refs T-###` in the body.
- [ ] No merge-noise or "wip" commits left in the history.

## Before pushing

- [ ] Full test suite run and green.
- [ ] Linter run and clean, with no rule disabled, suppressed or reconfigured.
- [ ] Type check run and clean.
- [ ] No hooks bypassed. No `--no-verify`.
- [ ] Complete diff read end to end, by you, before anyone else sees it.

## Self-review of the diff

- [ ] No debug output, `console.log`, commented-out code or leftover scaffolding.
- [ ] No secrets, tokens, connection strings or real customer data.
- [ ] No unrelated formatting churn obscuring the real change.
- [ ] Every changed file is needed by this task.
- [ ] House conventions hold, per
      [../../../rules/code-conventions.mdc](../../../rules/code-conventions.mdc).
- [ ] Nothing in the diff exceeds the task's scope. If it does, split it out and raise a
      new task — do not widen this one.

## PR body

- [ ] `Closes #<issue>` for the task issue, plus the `T-###` and the `FR-###` satisfied.
- [ ] Summary: what behaviour is different now, in two or three sentences.
- [ ] Test evidence: the `TC-###` cases covered, plus suite, lint and type check results.
- [ ] Reviewer guidance: what to look at first, what is deliberately out of scope, and any
      assumption recorded.
- [ ] Screenshots or terminal output where the change is visible or operational.

### Body skeleton

```markdown
Closes #<issue>

**Task:** T-### — <task title>
**Satisfies:** FR-###

## What changed
<Two or three sentences on the behaviour difference.>

## Test evidence
- TC-###: <case> — covered by `<test file>`
- Suite: <command> — <n> passed
- Lint: clean · Type check: clean

## Review guidance
- Start with `<file>` — <why>.
- Out of scope: <what and why>.
```

## Before merging

- [ ] Every review comment either actioned or answered with a reason.
- [ ] Review approved under the project's policy.
- [ ] All required CI checks green — not pending, not skipped, not made non-required.
- [ ] CI failures diagnosed from the log and fixed at the cause, not re-run until lucky.
- [ ] No force-push to this branch while it was under review.
- [ ] Branch up to date with the default branch under the repo's merge strategy.

## After merging

- [ ] Branch deleted.
- [ ] Task issue closed by the PR's closing keyword.
- [ ] Task moved to done with `task_update`.
- [ ] Plan view regenerated with `render_gantt`; `execution-plan.md` not hand-edited.
- [ ] Next unblocked task identified from `dependency_graph`, or the phase reported
      complete via `plan_status`.
