---
name: prep-feature-branch-merge
description: >-
  Prepares a Tao Lang feature branch for merge into main: sync with main,
  prep-commit after merging main into the feature branch, review diffs and logs,
  quality checklist, and completion summary next to the spec folder (e.g. TODO
  Specs or Docs/Dev Log). Use when wrapping a branch, before a big merge, or
  when the user asks to tidy up for merge.
---

# Prep feature branch for merge

## Git steps the user may need to run locally

**Fetch / merge / checkout are not agent-whitelisted.** Ask the user to:

1. Update `main` from origin (`git checkout main && git pull`, or equivalent).
2. Merge `main` into the feature branch and resolve conflicts (`git checkout <branch>` then `git merge main`).
3. **CRITICAL**: On the feature branch, run **`./just-agents prep-commit`** (and **`./just-agents fix`** if needed) until it passes **before** squash-merging to `main`, pushing, or treating the branch as merge-ready. **Do not skip this** after integrating `main`; the combined tree must be re-checked.

After step 3 is green, the agent can use `./just-agents shell git log`, `git diff`, and `git status` to review.

## Review branch vs main

1. Skim history vs main: `./just-agents shell git log main..HEAD --oneline` (if `main` exists); adjust base branch name if the repo uses another default.
2. Read code changes: `./just-agents shell git diff main...HEAD` or incremental `git diff` as appropriate.
3. Note follow-ups: improvements worth doing before merge vs after.

## Quality bar (agent-runnable)

Run and fix until clean:

- `./just-agents fix`
- `./just-agents prep-commit` (or `./just-agents check` if you need a lighter pass after `fix`—prefer `prep-commit` before merge). **Again** run **`prep-commit` right after merging `main` into the feature branch** (see Git steps)—that pass is part of the merge process, not optional.

Then verify:

- **Documentation / comments:** follow `AGENTS.md` (JSDoc style for TypeScript; project conventions for other files).
- **DRY:** shared helpers over copy-paste; delete dead code where safe.
- **Names:** clear, concise symbols for new APIs.
- **Language features:** for Tao-facing changes, ensure validation, compilation, and tests (parse / validation / runtime) where applicable.

## Completion summary

Write the cleanup / merge plan and status into **`COMPLETION-SUMMARY.md` in the same directory as the feature spec** you are landing (the folder the user or branch work is anchored to). Examples:

- `TODO Specs/<feature-folder>/COMPLETION-SUMMARY.md`
- `Docs/Dev Log/<YYYY-MM-DD> - <Project Name>/COMPLETION-SUMMARY.md`

Include what was reviewed, what still needs doing, and **stop for user approval** before committing that summary if they want to edit it.

## Merge handoff (squash merge)

When the user is ready to land the branch on `main` (or the default base), follow **`tao-git-workflow`**: **squash merge** only, and the squash commit body must include **all** squashed commit lines (see that skill).

1. Draft a **one-line squash title** listing major areas touched (example shape: `Parser validation; runtime cleanup; agent skills`).
2. For the **PR description** (if used), write a **short** themed summary; do not rely on the PR alone for history. The **squash commit message** is where the full `git log main..HEAD` list belongs (per `tao-git-workflow`).
3. **Stop** and ask the user to review before finishing: either they merge on the host (PR squash), or they have **explicitly** told the agent to merge and the agent uses **`./just-agents git-dangerously …`** per **`tao-git-workflow`** (never merge/remote `git` subcommands that way without that explicit instruction). If `main` was merged into the feature branch, **`./just-agents prep-commit` must already have been run and be green on that branch** before squash, push, or handoff (see **`tao-git-workflow`**, _After integrating `main` on a feature branch_).

## After approval

Use **`tao-git-workflow`** to stage and commit the summary and any final fixes.
