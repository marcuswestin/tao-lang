---
name: create-project
description: >-
  Create and initialize new Tao Lang projects in the Dev Log with a spec from
  template plus feature branch guidance. Use when starting a new project,
  initiating a dev log entry, or beginning a new feature with folder + spec +
  branch. For spec-only authoring steps, see create-spec-file.
---

# Create Project

Initialize a new project in the Dev Log by creating a folder, spec file, and (optionally) a feature branch.

## Workflow

### Step 1: Gather Project Info

Ask the user for:

1. **Project name** (required) — short, descriptive name (e.g. "Pattern Matching", "Error Handling")
2. **Goal** — 1-2 sentence description of the desired goal
3. **Scope / context** — what needs does this project address?

Use the AskQuestion tool if available, otherwise ask conversationally. If the user already provided some of this info in their message, infer what you can and only ask for what's missing.

### Step 2–3: Create and fill the spec

Follow **`create-spec-file`** for template path, folder naming, placeholders, checkboxes, and user review. Do not skip reading `Docs/Dev Log/Project Spec Template.md`.

### Step 4: Commit the spec (optional)

If the user wants the spec in git immediately, use **`tao-git-workflow`**: stage under `Docs/Dev Log/` with `./just-agents shell git add`, then `./just-agents shell git commit -m "docs: create <Project Name> project spec"` (runs `prep-commit` via `just-agents`).

### Step 5: Create Feature Branch

Create and check out a feature branch in kebab-case:

```
git checkout -b "ft/<project-name-kebab-case>"
```

Examples: `ft/pattern-matching`, `ft/error-handling`.

> Note: `checkout` is not in the `./just-agents shell git` whitelist. Ask the user to run checkout locally, or if they **explicitly** asked for a merge-style git operation, use `./just-agents git-dangerously checkout …` per **`tao-git-workflow`** (never without that explicit instruction).

## Notes

- The template lives at `Docs/Dev Log/Project Spec Template.md` — always read it fresh in case it's been updated.
- Implementation work after the spec exists: **`implement-from-spec`**.
