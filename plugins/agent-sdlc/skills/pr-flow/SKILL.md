---
name: pr-flow
description: Takes a completed task from working tree to merged - branch naming, conventional commits referencing the task, pre-push verification, opening a pull request that closes the task issue, handling review and CI feedback, then merging and updating the tracker. Use after a task's tests are green and it needs shipping, or when a pull request needs opening, updating or merging.
---

# PR Flow

You move one finished task across the line and keep GitHub and the tracker in agreement.
You do not write new behaviour here; if the change is incomplete, go back to
`tdd-implement`.

## When to use

- A `tdd-implement` task is green and needs branching, reviewing and merging.
- An open PR has review comments or failing CI to address.
- A defect fix from `defect-triage` is ready to ship.

## Inputs

- The task ID and its issue, from `task_list` on the `sdlc-tracker` MCP server.
- The working tree changes for that task, with tests already passing locally.
- `docs/sdlc/constitution.md` for the project's review and merge policy.
- The repository's CI workflow definitions and branch protection rules.

## Procedure

1. **Branch per task.** Create `<type>/T-###-<slug>` from the default branch, where
   `<type>` is one of `feat`, `fix`, `chore`, `refactor`, `test`, `docs` and `<slug>` is a
   short kebab-case summary — `feat/T-045-order-filter`. One task, one branch. Never
   reuse a branch for a second task.

2. **Commit conventionally.** `<type>(<scope>): <imperative summary>` with the task ID in
   the body or footer: `Refs T-045`. Keep commits small and each one green. The message
   says what changed and why, not which files were touched.

3. **Verify before pushing.** All four, in order, all passing:
   the full test suite; the linter; the type check; and a read of your own complete diff.
   In the self-review look for debug output, commented-out code, stray `console.log`,
   secrets, unrelated formatting churn and anything outside the task's scope. Never
   bypass a pre-commit or pre-push hook, and never disable a lint rule to get through.

4. **Check the scope.** If the diff has grown past what the task describes, stop. Split
   the extra work onto its own branch and raise a new task through the tracker rather
   than widening this one. A PR that does two things gets reviewed as neither.

5. **Open the pull request.** Push the branch and open a PR whose body contains:
   - A closing keyword linking the task issue — `Closes #<issue>` — plus the `T-###` and
     the `FR-###` it satisfies.
   - A summary of the change in two or three sentences: what behaviour is different now.
   - Test evidence: which `TC-###` cases are covered, the suite and lint result.
   - What a reviewer should look at first, and anything deliberately left out.

   Draft the PR from [references/pr-checklist.md](references/pr-checklist.md).

6. **Respond to CI.** Read the actual failure log before changing anything — do not
   re-run hoping for a different result. Fix the cause on the branch, test-first where
   the failure is behavioural. **Never merge with failing CI** and never mark a required
   check as skipped or non-required to get past it.

7. **Respond to review.** Address every comment: change the code, or reply with the
   reason you did not. Push follow-up commits rather than rewriting history —
   **never force-push a branch someone else is reviewing or building on**. Re-request
   review once the round is complete.

8. **Merge when both gates are satisfied.** The configured policy is: branch per task,
   pull request, wait for review approval *and* green CI, then merge, closing the issue
   through the PR. Use the repository's configured merge strategy. Delete the branch
   after merge.

9. **Update the tracker.** Move the task to done with `task_update`, then regenerate the
   plan view with `render_gantt` and, where useful, report roll-up state with
   `plan_status`. Never hand-edit the task table or Gantt chart in
   `docs/sdlc/<feature>/execution-plan.md`.

### Prohibitions

- No force-push to a shared or under-review branch.
- No merge with failing or pending required checks.
- No `--no-verify`, no skipped hooks, no disabled or downgraded required checks.
- No direct `gh issue edit`; task state changes go through the `sdlc-tracker` MCP.
- No merge of a PR that exceeds its task's scope — split it instead.

## Output contract

You produce a merged pull request and a synchronised tracker. Nothing in `docs/sdlc/` is
hand-edited; `execution-plan.md` changes only via `render_gantt`.

Every merged PR must leave: a branch named `<type>/T-###-<slug>`, commits referencing the
task, a body with the closing keyword, summary, test evidence and reviewer guidance, an
approving review, green CI, and a closed task issue.

## Handoff

Report the PR number and URL, the task ID, the merge commit, and whether the phase has
remaining tasks.

Next: the **developer** returns to `tdd-implement` for the next unblocked task from
`dependency_graph`. When `plan_status` shows the phase has no open tasks left, hand off to
**qa** with the `test-executor` skill for phase verification.
