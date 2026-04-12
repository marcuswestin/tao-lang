---
name: implement-todo-batch
description: Reads a markdown TODO list, picks the next coherent batch of items (balanced size, chores-first, smallest tie-break), respects @file:line anchors by including all nested child bullets under that item, asks before architecture-changing work, implements that batch in the codebase, updates the TODO file, then stops. Use when the user points at TODO.md (or similar), cites a specific TODO line, wants the next chunk of todos done without endless continuation, or says implement / knock out / batch todos from a markdown list.
---

# Implement TODO batch from markdown

Execute **one batch** of work from a markdown TODO file: choose items, implement them, update the list, **then stop** (do not start the next batch unless the user asks again).

If there are uncommitted changes from a previous batch, commit those first.

ALWAYS alert the user with a notification signal when you need their input to proceed.

## Inputs

- The user names or implies a markdown file (often `TODO.md`). If unclear, ask which file once.
- If the anchored subtree is **too large** for one batch (violates small-enough), **ask** the user whether to (a) do the whole subtree across multiple invocations starting with the first coherent slice, or (b) narrow to specific children—default to **(a)** with the first slice only, then stop.

## Step 1: Read and triage the list

0. If your context window is close to half full, compact it first.
1. Read the full TODO markdown file.
2. Ignore items already marked done (e.g. `[x]`, strikethrough, or explicit "done" sections) unless the user says otherwise.
3. Build a mental map of dependencies: do not pick items that require undone prerequisites unless the batch includes those prerequisites.
4. If the user gave an anchor, **derive the subtree** before applying "pick next batch" heuristics; selection rules apply to **ordering and splitting** inside that subtree, not to dropping unstated children.

## Step 2: Select the batch (selection rules)

Pick items that belong together in **one** session batch. If the user anchored a line, the **default intent** is the full subtree under that line (subject to small-enough split + ask above). Apply in order:

1. **Simple-first** — Prefer "laundry list" chores first: cleanups, renames, mechanical refactors, docs-only, config tweaks, low behavioral risk. Do these before larger features when both are candidates.
2. **Smallest-first** — If several batches are valid, prefer the **smallest** candidate batch first (fewer items or less scope).
3. **Small enough** — Don't proceed through a non-trivial mulit-setp TODO list of items without checking in with the user. E.g make multiple small cleanups rather just just one small one.
4. **Big enough** — Prefer a batch where the user can usually step away for **more than a minute** (meaningful work: several files, tests, or non-trivial logic).
5. **Atomic-ish** — Prefer work where existing tests are **likely to stay green** while building. **Exception:** TDD items — add or adjust failing tests **first**, then implement until green.
6. **TDD ordering** — If an item is explicitly test-first / TDD, order within the batch: failing test → implementation → green.

## Step 3: Architecture / design gate

After choosing the batch, classify it:

- **Laundry list / chores** (cleanup, formatting, obvious refactors, copy tweaks): **proceed without asking.**
- **Might alter architecture or system design** (new subsystems, public API shape, persistence model, cross-cutting contracts): **ask the user for a quick OK before coding.**
- **Unclear (~50/50):** **err toward proceeding** — implement the batch unless there is a strong reason it would be hard to revert or violates an obvious project constraint.

If the user is not available and the gate would block execution, default to **deferring** only the architecture-risky items and executing the rest of the batch, or execute a smaller chore-only batch—whichever matches the user's stated priorities if any.

## Step 4: Implement (do not stop at planning)

1. Do the work: edit code, configs, tests as needed. Follow project rules (`AGENTS.md`, `./just-agents`, etc.).
2. Run relevant checks/tests for touched areas before declaring done.
3. Update the markdown TODO file: mark completed items done, adjust wording if scope shifted, add follow-ups as new bullets if discovered.

## Step 5: Stop

1. Summarize what was completed vs. deferred.
2. **Stop.** Do not begin the next batch or expand scope. The user invokes this skill again for the next batch.

## Output shape

Keep the final message short:

- **Batch chosen:** bullet list of TODO lines / titles addressed
- **Done:** what shipped
- **TODO file:** what changed (sections checked off, etc.)
- **Not done this round:** only if something was deferred or left for follow-up
- **Next time:** one-line hint for what the skill would likely pick next (optional)

## Anti-patterns

- Planning without implementation.
- Implementing past the first complete batch in one invocation.
- Skipping the architecture ask when the batch rewrites boundaries, contracts, or data models.
- Ignoring TDD order when the item is explicitly test-first.
- Treating an anchored parent line as a single checkbox when nested bullets exist under it.
