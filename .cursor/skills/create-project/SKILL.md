---
name: create-project
description: Create and initialize new projects in the Dev Log with a spec from template. Use when starting a new project, creating a project spec, initiating a dev log entry, or beginning a new feature.
---

# Create Project

Initialize a new project in the Dev Log by creating a folder, spec file, and feature branch.

## Workflow

### Step 1: Gather Project Info

Ask the user for:

1. **Project name** (required) — short, descriptive name (e.g. "Pattern Matching", "Error Handling")
2. **Goal** — 1-2 sentence description of the desired goal
3. **Scope / context** — what needs does this project address?

Use the AskQuestion tool if available, otherwise ask conversationally. If the user already provided some of this info in their message, infer what you can and only ask for what's missing.

### Step 2: Create Project Folder and Spec

1. Determine today's date in `YYYY-MM-DD` format
2. Read the template at `Docs/Dev Log/Project Spec Template.md`
3. Create the project folder and spec file:

```
Docs/Dev Log/<YYYY-MM-DD> - <Project Name>/<Project Name> Spec.md
```

4. Fill in the template fields:
   - Replace `{start date}` with the date
   - Replace `{Project Name}` with the project name
   - Replace `{1-2 sentence description...}` with the goal
   - Replace the Scope and Steps placeholders with real content

### Step 3: Fill Out the Spec

Fill out the spec to the best of your ability based on:
- Context from the user's request
- Knowledge of the codebase (explore as needed)
- The project's `AGENTS.md`, design docs, and roadmap if relevant

**Ask the user questions** if you need clarification on scope, priorities, or approach. Present your draft and ask for feedback before finalizing.

### Step 4: Commit the Spec

1. Stage the new files: `./just-agents git add "Docs/Dev Log/"`
2. Commit: `./just-agents git-commit "docs: add <Project Name> project spec"`

### Step 5: Create Feature Branch

Create and check out a feature branch in kebab-case:

```
git checkout -b "ft/<project-name-kebab-case>"
```

Examples: `ft/pattern-matching`, `ft/error-handling`.

> Note: `checkout` is not in the `./just-agents git` whitelist. Run `git checkout` directly, or ask the user to switch branches.

## Notes

- The template lives at `Docs/Dev Log/Project Spec Template.md` — always read it fresh in case it's been updated.
- The spec should be actionable: concrete steps with checkboxes, not vague aspirations.
- Keep the spec concise but complete enough to guide implementation.
