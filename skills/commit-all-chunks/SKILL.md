---
name: commit-all-chunks
description: >-
  Commit all uncommitted changes in small, self-contained pieces with an
  appropriate message each. Commits only (no code edits without approval).
  Run ./agent prep-commit before each commit per AGENTS.md and
  skills/git-workflow.
---

# Commit all chunks

Commit all uncommitted changes in small, self-contained pieces, with an appropriate commit message for each piece.

Make no further changes to the codebase—only commits. If you need a code change, ask first.

Prefer the smallest self-contained commits first.

## Required flow

Use **`./agent git …`** for staging and commits (forwards to `git`; see **`AGENTS.md`**). Full policy: **`skills/git-workflow/SKILL.md`**.

1. Before **each** **`./agent git commit`**, run **`./agent prep-commit`** unless the user explicitly instructs you to skip it for that commit or session.
2. Stage each chunk with **`./agent git add <paths>`** (only paths that belong in that commit).
3. Commit that chunk with **`./agent git commit -m '<message>'`**. Use single quotes around the `-m` body when it contains no single quotes (easier shell escaping).

**Prep behavior:** **`./agent git`** only forwards to `git`; it does **not** run **`./agent prep-commit`**.

## Steps

1. Inspect the working tree with `./agent git status` and `./agent git diff` (and `./agent git diff --cached` if anything is already staged). Plan chunks: each commit should be one coherent unit (one concern, reviewable on its own).
2. For each chunk, smallest or most isolated first:
   - Run **`./agent prep-commit`** and fix failures before committing (or stop and report; do not invent code fixes without approval—only commits).
   - Stage only that chunk’s paths with **`./agent git add <paths>`**.
   - Commit with **`./agent git commit -m '<message>'`** following **`skills/git-workflow/SKILL.md`** (types, scope, body when non-trivial).
3. Repeat until `./agent git status` is clean (or only leftover changes the user said to leave uncommitted).
4. Optionally re-run **`./agent prep-commit`** once at the end to confirm the branch is still green.

## Validation

- **`./agent prep-commit`** is green immediately before each commit (unless the user explicitly opted out for that commit).
- No working-tree edits beyond what was already changed before this skill ran, unless the user approved a fix.
- Each commit message matches the policy in **`skills/git-workflow/SKILL.md`**.
