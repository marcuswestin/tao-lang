---
name: project-5-implement-project
description: Implement a reviewed Tao project plan one committable step at a time on a feature branch or worktree, validating and committing each coherent chunk.
---

# Project 5: Implement Project

## When to use

- After `project-4-review-project-plan` marks a plan reviewed.
- When the user asks to implement a project plan through the numbered workflow.

## Requirements

- A reviewed `Docs/Projects/<Project Name> Project Plan.md`.
- Clean or understood git state.
- If starting a new sprint worktree, a feature branch named from the project slug.
- If working in the local checkout, the current branch; do not create or switch branches unless the user explicitly asks.

## Workflow

1. Use `./agent help` as the command reference for repo commands.
2. Read `AGENTS.md`, `CORE_TENETS.md`, `Docs/Tao Project Roadmap.md`, the research doc, and the plan doc.
3. Check git state with `./agent git status --short --branch`.
4. If this sprint starts in a new worktree, create a `feat/<project-slug>` branch there; if working in the local checkout, keep the current branch. Update the roadmap status to `In implementation`.
5. Implement one numbered plan step at a time.
6. For each step:
   - re-read files before editing;
   - make only that step's changes;
   - run the validation named in the plan;
   - update the plan or roadmap with completed/deferred discoveries;
   - run `./agent prep-commit`;
   - commit the coherent chunk with the plan's suggested subject or a tighter equivalent;
   - after the commit, post a concise progress overview in the conversation.
7. Stop if validation fails and fix that step before continuing.
8. Update the roadmap status to `Implemented` when all planned implementation steps are complete, using the roadmap's project queue status values.

## Step Progress Overview

After each completed plan-step commit, report progress with a short, polished
conversation update. Use a Markdown title and include:

- Step completed: number and name.
- Next step: number and name, or final review/merge preparation when no steps remain.
- Completed count: `X of Y steps`.
- Elapsed time: exact if tracked, otherwise a clear estimate.
- Estimated time remaining: best current estimate, with uncertainty when needed.

Example:

```md
**Project Progress**

**Step Completed:** 6. Add Runtime Navigation Actions
**Next Step:** 7. Remove Expo Router Shell
**Completed:** 6 of 9 steps
**Elapsed:** about 2h 10m
**Estimate Remaining:** about 45-75m, mostly example migration and final validation
```

## Output

- Branch/worktree used.
- Commits created.
- Plan steps completed.
- Validation run.
- Deferred work recorded.
- Next skill to run: `project-6-review-implementation`.

## Validation

- Use the plan's per-step validation.
- Run `./agent prep-commit` before each commit.
