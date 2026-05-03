---
name: feature-planning
description: Starts a focused feature track by clarifying scope, creating a branch when requested, and drafting a project plan document.
---

# Feature Planning

## When to use

- When the user asks to start a feature, project, branch, or implementation plan.
- When a feature needs a documented scope before coding.
- When work should be split into milestones before implementation.

## Steps

1. Confirm the project name, one-line scope, success criteria, and any explicit non-goals.
2. Check git state with `./just-agents shell git status`; if dirty, ask how to handle existing changes before branching.
3. If a branch is requested, create a short kebab-case branch name aligned with the feature.
4. Place project plans under `Docs/Projects/` in a theme-appropriate subfolder.
5. Draft a concise plan with summary, goals, non-goals, milestones, risks, and references.
6. Commit only if the user asks, using `git-workflow`.

## Validation

- Run `./just-agents check` only if implementation files changed.
- For docs-only planning, validate paths and git status.
