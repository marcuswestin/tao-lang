---
name: project-7-prepare-merge
description: Prepare a reviewed Tao project branch for final landing by verifying clean committed work, updating roadmap status, and handing off to project-8-finalize-merge.
---

# Project 7: Prepare Merge

## When to use

- After `project-6-review-implementation` is complete.
- When a project branch is ready to land.

## Workflow

1. Read the project plan, roadmap row, and `skills/merge-feature-branch/SKILL.md`.
2. Confirm current branch is the feature branch, not `main`.
3. Confirm git state is clean:

   ```sh
   ./agent git status --short --branch
   ```

4. Update `Docs/Tao Project Roadmap.md` to `Ready to merge` if that update is not already committed, using the roadmap's project queue status values.
5. If the roadmap changed, run `./agent prep-commit` immediately before committing the roadmap update.
6. Commit the roadmap update through `skills/git-workflow` if needed.
7. Run `./agent prep-commit` again before treating the branch as merge-ready.
8. Hand off to `project-8-finalize-merge` for the actual squash landing, main validation, push, and local feature branch/worktree deletion. Preserve the remote feature branch unless the user explicitly asks to delete it.

## Output

- Feature branch.
- Validation status.
- Roadmap status.
- Merge handoff to `project-8-finalize-merge`, including local feature branch/worktree deletion after `main` is pushed.

## Validation

- `./agent prep-commit` must be green before landing.
- Follow all validation in `project-8-finalize-merge`.
