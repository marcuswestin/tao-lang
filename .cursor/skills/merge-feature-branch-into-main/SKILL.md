---
name: merge-feature-branch-into-main
description: >-
  Merge a feature branch into main: agent runs checks, git-dangerously fetch/pull/merge, prep-commit, review; draft squash message. Only EXPLICITLY invoking this skill permits those git-dangerously steps per tao-git-workflow. Use before landing a branch or when tidying for merge.
---

# Prep feature branch for merge

Integrate **`main`** into the feature branch, verify, draft squash message. Adjust `origin` / `main` if needed; see **`tao-git-workflow`** / **`just-agents.Justfile`** for policy.

1. `./just-agents shell git status` — if the tree isn’t clean (or merge would be unsafe), **ask** before continuing.

2. `./just-agents prep-commit` - ensure all checks are green.

3. Confirm branch (`./just-agents shell git branch --show-current` / user’s name);

4. Use **`./just-agents git-dangerously`**: `fetch origin` → `checkout main` → `pull origin main` → `checkout <feature>` → `merge main`

(If conflicts, determine how to resolve them, but then check with the user before actually making resolve edits.)

5. `./just-agents shell git log main..HEAD --oneline`, `git diff main...HEAD`, note follow-ups.

6. **Squash message** (PR or commit): one-line **title**; blank line; short **description**; blank line or `---`; **body** = verbatim **`./just-agents shell git log main..HEAD --reverse --oneline`** (every commit, chronological). For a **local** `merge --squash`, run that log on **feature** and **save** the output _before_ `checkout main` / `merge --squash`.

7. Default: hand off; print the necessary commands for the user to finish the squash merge as one block. If they **explicitly** ask to complete the merge: `checkout main`, `pull`, `merge --squash <feature>`, fix/`prep-commit`, commit with that three-part message; Do **NOT** `push` unless **explicitly** told to.

8. After approval: completion summary / commits per **`tao-git-workflow`**.
