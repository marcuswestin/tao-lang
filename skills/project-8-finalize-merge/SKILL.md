---
name: project-8-finalize-merge
description: Finalize a reviewed Tao project by squash merging its prepared feature branch into main, validating main, pushing the squash commit, then deleting the local feature branch and local project worktree while preserving the remote branch. Use after project-7-prepare-merge reports a clean, pushed, ready-to-merge branch, or when the user asks for the final project merge/landing step with local cleanup.
---

# Project 8: Finalize Merge

## Rules

- Use `./agent help` first if it has not already run in the session.
- Use `./agent git ...` for all Git commands.
- Do not run project review scripts or implementation review rounds.
- Do not delete the remote feature branch.
- Do not delete the local branch or worktree until `main` has been pushed with the squash commit and the remote feature branch still exists.
- Delete the local feature branch and local feature worktree after `main` is pushed; a squash merge leaves the local feature branch unmerged by ancestry, so cleanup is an explicit required step.
- Use `./agent git branch -D <feature-branch>` only after the squash commit is pushed; squash merges do not make `git branch -d` safe by ancestry.

## Workflow

1. Read the project plan, roadmap row, `skills/merge-feature-branch/SKILL.md`, and `skills/git-workflow/SKILL.md`.
2. Capture the feature branch and worktree before switching contexts:

   ```sh
   ./agent git status --short --branch
   ./agent git branch --show-current
   ./agent git rev-parse --show-toplevel
   ./agent git worktree list --porcelain
   ```

   Stop if the branch is `main`, detached, empty, dirty, or not the project branch being landed.

3. Confirm the feature branch is ready:

   ```sh
   ./agent prep-commit
   ./agent git push -u origin HEAD
   ./agent git ls-remote --heads origin <feature-branch>
   ```

4. Use the local `main` worktree from `./agent git worktree list --porcelain` for the landing. Run the remaining main-landing commands from that worktree, not from the feature worktree. Confirm it is clean, then refresh it:

   ```sh
   ./agent git status --short --branch
   ./agent git fetch origin main
   ./agent git merge --ff-only origin/main
   ```

5. Confirm refreshed `main` is already included in the feature branch:

   ```sh
   ./agent git merge-base --is-ancestor main <feature-branch>
   ```

   If this fails, return to the feature worktree, merge refreshed `main` into the feature branch, run `./agent prep-commit`, commit any merge resolution through `skills/git-workflow/SKILL.md`, push the feature branch, then restart this step.

6. Squash the feature branch into `main`:

   ```sh
   ./agent git merge --squash <feature-branch>
   ```

7. Before committing, update the roadmap row for the project from `Ready to merge` to `Merged` or `Complete` as appropriate, and stage that roadmap edit with the squashed changes:

   ```sh
   ./agent git add "Docs/Tao Project Roadmap.md"
   ```

8. Build the squash commit message from Git's generated `.git/SQUASH_MSG`:

   - Start with one Tao-style subject line.
   - Add a short overview bullet list.
   - Preserve the full generated `Squashed commit of the following:` appendix.
   - Commit from a message file or editor so the generated appendix is not truncated.

9. Run validation immediately before committing:

   ```sh
   ./agent prep-commit
   ./agent git commit -F <message-file>
   ```

   If `prep-commit` changes files, review and stage only intentional changes, rerun `./agent prep-commit`, then commit.

10. Validate and push `main`:

    ```sh
    ./agent prep-commit
    ./agent git status --short --branch
    ./agent git push origin main
    ```

11. Confirm the remote feature branch still exists, then remove only the local worktree and local branch from the clean `main` worktree:

    ```sh
    ./agent git ls-remote --heads origin <feature-branch>
    ./agent git worktree remove <feature-worktree-path>
    ./agent git branch -D <feature-branch>
    ./agent git worktree prune
    ```

    Stop instead of forcing cleanup if `worktree remove` reports dirty or untracked files.

12. Verify final state:

    ```sh
    ./agent git status --short --branch
    ./agent git branch --list <feature-branch>
    ./agent git worktree list --porcelain
    ./agent git ls-remote --heads origin <feature-branch>
    ```

## Output

- Feature branch landed.
- Squash commit hash on `main`.
- Validation commands and results.
- Confirmation that `main` was pushed.
- Confirmation that the local feature branch and local feature worktree were deleted.
- Confirmation that the remote feature branch still exists.
