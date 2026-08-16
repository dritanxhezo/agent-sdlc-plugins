---
name: decision-interview
description: Interviews the user about the decisions an artifact is about to commit to, asking dependency-ordered rounds of numbered questions that each carry a recommended answer, and converting whatever stays unanswered into recorded assumptions. Use from brd-author, hld-author, lld-author and work-breakdown before drafting, or whenever a request is thin enough that the artifact would otherwise be mostly invention.
---

# Decision Interview

You find out what the user actually wants before an artifact commits to it, in as few rounds
as possible. You do not write the artifact — the skill that called you does.

## When to use

- A calling skill is about to decide something the user never stated: a scope boundary, a
  success metric, a technology choice, a module structure, a delivery order.
- The request is one sentence and the artifact would be several pages of invention.
- An upstream artifact is ambiguous rather than merely silent.

Not downstream of design. In `test-case-author`, `test-executor`, `tdd-implement`, `pr-flow`
and `defect-triage`, a question for the user means an upstream artifact is defective, and
the fix is to report it against the `FR-###` or `C-###` it belongs to. Interviewing around
a broken spec hides the seam this pipeline exists to expose.

## Inputs

- Whatever the calling skill was given: the request, the upstream artifacts, the
  constitution.
- `sdlc.config.json` → `interview.rounds`, the round budget. Default 3. Set `0` to skip the
  interview and send every recommendation straight to `ASSUMPTION:`.

## Procedure

1. **List the decisions, not the questions.** Write down every choice the artifact will
   embody. A decision has more than one defensible answer; anything with exactly one is not
   a decision, so make it and move on. Naming these first is what stops the interview
   becoming a list of whatever you happened to notice while drafting.

2. **Find every fact yourself.** A fact is anything already true — what the codebase does,
   what the constitution says, what an upstream artifact specified, what a library
   supports. Read it, or dispatch a subagent to. Never spend a question on something you
   could look up, and never block the whole interview on one lookup: a running lookup is an
   unsettled prerequisite, so only the decisions downstream of it wait. Ask the rest now.

3. **Order the decisions by dependency.** B depends on A when A's answer changes B's
   options or makes B moot — there is no point asking which cache to use before it is
   settled that anything is cached. The result is a tree, not a list.

4. **Compute the frontier.** Every decision whose prerequisites are settled: the questions
   you can ask now without guessing at an answer you have not heard yet. A question whose
   answer depends on another question still open belongs to a later round, not this one.

5. **Ask the whole frontier in one round.** Number and title each question, say what turns
   on the answer, and give a recommendation:

   ```
   **Q1 — Who can search**

   Support staff only, or customers too? Customer-facing search puts authentication and
   rate limiting into the FRD and roughly doubles the test surface.

   **Recommend:** support staff only, customers explicitly out of scope this iteration.
   ```

   The recommendation is a real answer you would defend, not a restatement of the choice.
   It is what makes a one-word reply enough, and it is what gets recorded if the user says
   nothing. If the frontier runs past about seven questions the decisions are too
   fine-grained: merge related ones into a single question with a recommended package.

6. **Wait, then recompute.** Each answered round settles decisions, which pushes the
   frontier outward and unblocks what depended on them. Ask the next round. Never draft
   while a round is outstanding.

7. **Spend the budget, then stop.** The interview ends when the frontier is empty or the
   round budget is gone. Everything still unsettled takes its recommended answer and is
   recorded as `ASSUMPTION:` — except anything on the escalation list in the pipeline
   conventions (a conflict, an irreversible choice, scope growth beyond the upstream
   artifact), which is recorded as `OPEN QUESTION:` and reported. Bounded is deliberate: an
   assumption written down where a reviewer sees it costs less than a blocked pipeline.

8. **When there is no channel to the user, do not invent one.** A delegated subagent often
   cannot reach them. Do not answer your own questions and do not stall — record each
   frontier decision as `ASSUMPTION:` with its recommendation and list them in your handoff
   so the orchestrator can put the round to the user directly.

A worked two-round example is in
[`references/interview-example.md`](references/interview-example.md).

## Output contract

You write no file of your own. Return to the calling skill:

- Settled decisions with the answer given, for the artifact's body.
- Assumptions, each with the recommendation that was used, for its **Assumptions** section.
- Open questions needing escalation, for its **Open questions** section and the handoff.

The calling skill writes them into its own artifact. Nothing is settled twice: a decision
the user confirmed is stated as fact in the artifact, not repeated as an assumption.

## Handoff

Back to the skill that called you, which drafts with the answers in hand. Report the round
count, the number of decisions settled and the number left as assumptions — that ratio is
the honest measure of how much of the artifact is the user's intent and how much is yours.
