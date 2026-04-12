---
name: tao-git-workflow
description: >-
  Tao Lang git and commit workflows using ./just-agents only: allowed git
  subcommands, prep-commit vs fast commits, drafting messages, multi-piece
  commits, and squash-merge policy for default branch. Use when staging,
  committing, reviewing git state, or after check-for-improvements when the user
  wants to land changes.
---

# Tao Lang git workflow

All shell commands go through `./just-agents` (see `AGENTS.md`). Git is no exception.

## Allowed agent git operations

Via `./just-agents shell git <subcommand> <args>`, only these subcommands are allowed: **`log`**, **`status`**, **`diff`**, **`add`**, **`commit`**.

Examples:

- `./just-agents shell git status`
- `./just-agents shell git diff`
- `./just-agents shell git diff --cached`
- `./just-agents shell git log -n 25 --oneline`
- `./just-agents shell git add path/to/file.ts`

**Not whitelisted** (e.g. `checkout`, `pull`, `fetch`, `merge`, `rebase`, `push`): the agent cannot run them through `./just-agents shell`. Ask the user to run those in their own terminal, or to extend the allowlist in `just-agents.Justfile` (do not edit that file without explicit approval).

## Before any commit (project policy)

Unless the user explicitly opts out:

1. Run `./just-agents prep-commit` before the first commit of a session or whenever the tree might not be green.

## Two ways to create a commit

### A. Safe: `./just-agents shell git commit -m "message"`

The `shell` recipe runs **`prep-commit` automatically before `git commit`**. Use when you want every commit to re-verify the repo (simpler, slower).

### B. Fast batch: verify once, then commit without re-running prep-commit

For several small commits in a row (e.g. splitting logical changes):

1. Run `./just-agents prep-commit` **once** and fix failures until it passes.
2. Stage: `./just-agents shell git add <paths>`.
3. Commit each piece with: `./just-agents git-dangerously-commit-without-checks "type(scope): short summary"`\
   Use only after prep-commit is green; this bypasses the per-commit prep hook.

**Multi-piece rules:** Do not edit the codebase during a “commits only” pass unless the user agrees. Prefer smallest coherent commits first.

## Commit message formatting

- **CRITICAL**: Use the following format for commit messages: `type(scope): <short-summary> \n\n<detailed-description>`
- **CRITICAL**: The type is one of: `feat`, `bugfix`, `docs`, `cleanup`, `refactor`, `performance`, `tests`, `chore`, `revert`
- **CRITICAL**: The scope is the name of the feature or the file that was changed
- **CRITICAL**: The <short-summary> is a short description of the change
- **CRITICAL**: The <short-summary> should be no more than ~60 characters
- **CRITICAL**: The detailed description is an itemized description of all changes.

## Merging into `main` (or default branch)

When landing a feature branch on **`main`** (or the repo’s default branch), unless the user explicitly asks otherwise:

- **CRITICAL**: Use **squash merge** only (e.g. GitHub **Squash and merge**). Do **not** use a regular merge commit that preserves every branch commit on `main`.
- **CRITICAL**: The **squash commit message body** must list **every** commit that is being squashed, so the collapsed work stays recoverable from `git show` on `main`. At minimum, paste one line per squashed commit in chronological order, e.g. the user runs `git log main..HEAD --reverse --oneline` locally and copies that block into the squash description (keep GitHub’s prefilled list if it already contains all of them; otherwise replace or append until nothing is missing).
- Optional: above that list, keep a short human summary (title + bullets by theme); then a separator line (`---` or similar), then the full per-commit list.

## Interaction with `check-for-improvements`

That skill **must not** stage or commit. When review is done and the user wants to land work, switch to this workflow.

## Docs / spec commits

After creating Dev Log specs (see `create-spec-file` / `create-project`), stage with `./just-agents shell git add` on the new paths, then commit with a `docs:` prefix message.

## Optional: sync backlog markdown (`TODO.md`)

When the user wants backlog files updated after a work session (not during **`check-for-improvements`**, which must not touch the index):

1. Summarize what changed (short, in chat).
2. Update `TODO.md`: mark items done, reword if scope shifted, add new follow-ups as bullets.
3. Move **newly resolved** items into `TODO.Resolved.md` under a sensible section (create the section if it does not exist).
4. Leave edits **unstaged** unless the user explicitly asked to stage; then use the staging/commit steps above.
