---
name: start-feature-project-plan
description: >-
  Creates a git feature branch and seeds Docs/Projects with a project-plan markdown file.
  Asks clarifying questions when the name, scope, doc location, or branch base are unclear.
  Use when starting a new feature or project track, branching for focused work, or adding a
  plan under Docs/Projects before implementation.
disable-model-invocation: true
---

# Start feature branch + project plan

## When to clarify first

If the user’s description is too thin to pick a **project name**, **one-line scope**, or **where the plan should live** under `Docs/Projects/`, ask **briefly** (not a questionnaire dump). Cover only what is missing, for example:

- **Name / slug** — What should we call this effort (branch + doc title)?
- **Scope** — What is in scope vs explicitly out of scope for this branch?
- **Base** — Branch from current `HEAD`, or from updated `main`?
- **Area** — Which `Docs/Projects/` subfolder fits (e.g. existing theme folder vs `Misc/`)?
- **Success** — What “done” means for this plan’s first milestone.

Then proceed with the workflow below.

## Git (Tao repo)

All commands via `./just-agents` (see **`AGENTS.md`**, **`tao-git-workflow`**).

1. **`./just-agents shell git status`** — Prefer a **clean** working tree. If there are uncommitted changes, **stop** and ask whether to stash, commit elsewhere, or branch anyway.

2. **Branch base** — If the user wants **latest `main`**: use **`./just-agents git-dangerously`** only as needed for that workflow (e.g. `fetch`, `checkout main`, `pull`, then create the branch). If branching from **current** `HEAD`, skip the sync. If ambiguous, **ask**.

3. **Create the branch** — Use a short **kebab-case** name aligned with the project slug, e.g. `feat/<topic>-<short-slug>` or `<topic>-<short-slug>`. Example: `feat/source-maps-dual-source`.

   ```bash
   ./just-agents git-dangerously checkout -b <branch-name>
   ```

4. **First commit** — Add **only** the new plan file (unless the user asked for more). Message shape per **`tao-git-workflow`**, e.g. `docs(projects): add <short name> plan`.

5. Unless the user opts out, run **`./just-agents prep-commit`** before that commit when the repo policy applies.

## Project plan file

### Path

- Place under **`Docs/Projects/`**, in a subfolder that matches the theme (mirror existing areas such as `Misc/`, `Type System/`, etc.). Create the folder if needed.
- **Filename:** `<ProjectName>-Plan.md` or `<ProjectName> - <descriptor>.md` to match nearby docs (see existing naming in `Docs/Projects/`).

### Content (adapt to the conversation)

Keep the plan **useful and scannable**; avoid essay length.

Suggested sections (omit if empty):

1. **Title** — H1 matching the project name.
2. **Summary** — Why this exists (2–6 sentences).
3. **Goals / non-goals** — Bullet lists.
4. **Milestones or phases** — Ordered steps or checklist.
5. **Risks / open questions** — Short.
6. **References** — Links to related `Docs/`, packages, or issues (repo-relative paths where helpful).

Use the user’s **verbatim** wording for names, constraints, or quotes when they supplied exact text.

## Cross-skills

- **`tao-git-workflow`** — Allowed git subcommands, `prep-commit`, commit format, squash-merge notes.
- **`merge-feature-branch-into-main`** — Landing the branch later (explicit invoke only).
