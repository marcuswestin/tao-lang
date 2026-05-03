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

1. Inspect state with `./agent git status` and the relevant `diff` or `log` command.
2. Before the first commit of a session, run `./agent prep-commit` unless the user explicitly opts out.
3. Stage only intentional files with `./agent git add <paths>`.
4. Commit with `./agent git commit -m "<message>"`, which runs `./agent prep-commit` first.
5. For batch commits, still use `./agent git commit` for each coherent staged piece unless the user explicitly asks to add a narrower fast-commit recipe.
6. Use commit messages shaped as `type(scope): short summary`, with a body for non-trivial commits. Types: `feat`, `bugfix`, `docs`, `cleanup`, `refactor`, `performance`, `tests`, `chore`, `revert`.
7. Use `./agent git merge <branch>` for local merge prep when the user asks to prepare a branch for integration.
8. Remote, rebase, checkout, switch, pull, and push operations are not exposed as general agent commands. Add an explicit `./agent` recipe before making those agent-driven workflows routine.
9. After merging or rebasing `main` into a feature branch, run `./agent prep-commit` until green before treating the branch as merge-ready.
10. Always squash merge feature branches into `main`. Include the commit messages of all squashed commits in the final squash message body.

## Validation

- Before landing or handoff, confirm `./agent prep-commit` is green or report the exact failure.
- Confirm `./agent git status` shows only expected changes.
