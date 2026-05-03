---
name: git-workflow
description: Handles Tao Lang git status, staging, commits, batch commits, and merge preparation through ./just-agents with explicit safety rules.
---

# Git Workflow

## When to use

- When staging or committing changes.
- When preparing a branch for merge.
- When splitting work into multiple commits.
- When inspecting git state for handoff.

## Steps

1. Inspect state with `./just-agents shell git status` and the relevant `diff` or `log` command.
2. Before the first commit of a session, run `./just-agents prep-commit` unless the user explicitly opts out.
3. Stage only intentional files with `./just-agents shell git add <paths>`.
4. For normal commits, use `./just-agents shell git commit -m "<message>"`.
5. For fast batch commits, run `./just-agents prep-commit` once first, then use `./just-agents git-dangerously commit -m '<message>'` for each coherent staged piece.
6. Use commit messages shaped as `type(scope): short summary`, with a body for non-trivial commits. Types: `feat`, `bugfix`, `docs`, `cleanup`, `refactor`, `performance`, `tests`, `chore`, `revert`.
7. Never use `./just-agents git-dangerously` for `fetch`, `checkout`, `switch`, `pull`, `merge`, `push`, `rebase`, or similar remote/merge work unless the user explicitly asked for that operation.
8. After merging or rebasing `main` into a feature branch, run `./just-agents prep-commit` until green before treating the branch as merge-ready.
9. For squash merges, preserve the list of squashed commits in the final squash message body.

## Validation

- Before landing or handoff, confirm `./just-agents prep-commit` is green or report the exact failure.
- Confirm `./just-agents shell git status` shows only expected changes.
