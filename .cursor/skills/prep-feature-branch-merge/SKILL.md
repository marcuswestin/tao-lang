---
name: prep-feature-branch-merge
description: >-
  Prepares a Tao Lang feature branch for merge into main: sync with main,
  review diffs and logs, quality checklist, and completion summary under TODO
  Specs. Use when wrapping a branch, before a big merge, or when the user asks
  to tidy up for merge.
---

# Prep feature branch for merge

## Git steps the user may need to run locally

**Fetch / merge / checkout are not agent-whitelisted.** Ask the user to:

1. Update `main` from origin (`git checkout main && git pull`, or equivalent).
2. Merge `main` into the feature branch and resolve conflicts (`git checkout <branch>` then `git merge main`).

After that, the agent can use `./just-agents shell git log`, `git diff`, and `git status` to review.

## Review branch vs main

1. Skim history vs main: `./just-agents shell git log main..HEAD --oneline` (if `main` exists); adjust base branch name if the repo uses another default.
2. Read code changes: `./just-agents shell git diff main...HEAD` or incremental `git diff` as appropriate.
3. Note follow-ups: improvements worth doing before merge vs after.

## Quality bar (agent-runnable)

Run and fix until clean:

- `./just-agents fix`
- `./just-agents prep-commit` (or `./just-agents check` if you need a lighter pass after `fix`—prefer `prep-commit` before merge)

Then verify:

- **Documentation / comments:** follow `AGENTS.md` (JSDoc style for TypeScript; project conventions for other files).
- **DRY:** shared helpers over copy-paste; delete dead code where safe.
- **Names:** clear, concise symbols for new APIs.
- **Language features:** for Tao-facing changes, ensure validation, compilation, and tests (parse / validation / runtime) where applicable.

## Completion summary

Write the cleanup / merge plan and status into:

`TODO Specs/<spec-folder>/COMPLETION-SUMMARY.md`

(or the spec folder that matches this work). Include what was reviewed, what still needs doing, and **stop for user approval** before committing that summary if they want to edit it.

## Merge handoff (squash or merge commit)

When the user is ready to land the branch on `main` (or the default base):

1. Draft a **one-line title** listing major areas touched (example shape: `Parser validation; runtime cleanup; agent skills`).
2. Write a **short body**: why the change matters, grouped by theme. Do **not** paste the full `git log`; compress and add context that individual commits omit. Cite specific hashes only when they disambiguate.
3. **Stop** and ask the user to review before they run **local** git steps the agent cannot do via the allowlist: merge `main` into the branch, resolve conflicts, `push`, or squash-merge. After merges, they should run `./just-agents prep-commit` (or follow **`tao-git-workflow`**) before the final merge to default branch.

## After approval

Use **`tao-git-workflow`** to stage and commit the summary and any final fixes.
