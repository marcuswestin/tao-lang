---
name: git-workflow
description: Handles Tao Lang git status, staging, commits, batch commits, and merge preparation through ./agent with explicit safety rules.
---

# Git Workflow

## When to use

- When staging or committing changes.
- When preparing a branch for merge.
- When splitting work into multiple commits.
- When inspecting git state for handoff.

## Steps

1. Run `./agent fmt` before inspecting, staging, or committing. Treat formatter edits as part of the pending change set and review them before staging.
2. Inspect state with `./agent git status` and the relevant `diff` or `log` command.
3. Before any commit, run `./agent prep-commit` unless the user explicitly instructs you to skip it (`./agent git` forwards to `git` and does not run prep for you).
4. Stage only intentional files with `./agent git add <paths>`.
5. Commit with `./agent git commit -m "<message>"` after prep is green.
6. For batch commits, run `./agent prep-commit` only before the first commit unless any changes are made after that.
7. Use commit messages shaped as `type(scope): short summary`, with a body for non-trivial commits. Types: `feat`, `bugfix`, `docs`, `cleanup`, `refactor`, `performance`, `tests`, `chore`, `revert`.
8. Use `./agent git merge <branch>` for local merge prep when the user asks to prepare a branch for integration.
9. Remote, rebase, checkout, switch, pull, and push operations are not exposed as general agent commands. Add an explicit `./agent` recipe before making those agent-driven workflows routine.
10. After merging or rebasing `main` into a feature branch, run `./agent prep-commit` until green before treating the branch as merge-ready.
11. Always squash merge feature branches into `main`. Include the commit messages of all squashed commits in the final squash message body.

## Validation

- Before landing or handoff, confirm `./agent prep-commit` is green or report the exact failure.
- Confirm `./agent git status` shows only expected changes.
