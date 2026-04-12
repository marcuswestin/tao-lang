---
name: create-spec-file
description: >-
  Creates and fills a Tao Lang Dev Log spec markdown file from the project
  template: path layout, placeholders, checkboxes, and when to ask the user.
  Use when starting a spec-only doc, filling Project Spec Template, or the user
  asks how to write a spec file before implementation.
---

# Create spec file (Dev Log)

## When to use

- **Spec only:** User wants a design/plan document but not necessarily branch setup yet → follow this skill.
- **Full project bootstrap** (spec + branch naming + optional commit): use **`create-project`**, which builds on this flow.

## Inputs to gather

Ask if missing (use AskQuestion when available):

1. **Project / feature name** — short, descriptive.
2. **Goal** — one or two sentences.
3. **Scope** — in/out, constraints, links to code areas or prior art.

## Steps

### 1. Date and paths

1. Use today’s date as `YYYY-MM-DD` (authoritative calendar from the user/session when known).
2. Read the template: `Docs/Dev Log/Project Spec Template.md` (read fresh each time; it may change).
3. Create the folder and spec file:

```text
Docs/Dev Log/<YYYY-MM-DD> - <Project Name>/<Project Name> Spec.md
```

Use the **exact** folder naming pattern above so Dev Log entries stay sortable and consistent.

### 2. Fill the template

Replace template placeholders:

- `{start date}` → chosen date
- `{Project Name}` → name
- `{1-2 sentence description...}` → goal
- Scope / steps sections → concrete bullets and **`[ ]` checkboxes** for trackable work

### 3. Quality bar for the spec

- **Actionable:** each major step is something a future reader can execute or verify.
- **Honest about unknowns:** open questions listed explicitly.
- **Concise:** prefer short bullets over essays; link to code paths with backticks.

### 4. User review

Present a short summary and ask for course corrections before treating the spec as “locked.”

### 5. Next steps

- **Implementation:** hand off to **`implement-from-spec`** when the user is ready to build.
- **Git:** when files should be committed, follow **`tao-git-workflow`** (stage `Docs/Dev Log/...`, then commit with a `docs:` message).

## Anti-patterns

- Vague “implement everything” without checkboxes or ordering.
- Skipping the template read and inventing ad-hoc headings that drift from the team’s Dev Log layout.
