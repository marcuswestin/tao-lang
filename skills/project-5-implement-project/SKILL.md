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
- A feature branch or worktree named from the project slug.

## Workflow

1. Use `./agent help` as the command reference for repo commands.
2. Read `AGENTS.md`, `CORE_TENETS.md`, `Docs/Tao Project Roadmap.md`, the research doc, and the plan doc.
3. Check git state with `./agent git status --short --branch`.
4. Create or switch to a `feat/<project-slug>` branch/worktree when needed and update the roadmap status to `In implementation`.
5. Implement one numbered plan step at a time.
6. For each step:
   - re-read files before editing;
   - make only that step's changes;
   - run the validation named in the plan;
   - update the plan or roadmap with completed/deferred discoveries;
   - run `./agent prep-commit`;
   - commit the coherent chunk with the plan's suggested subject or a tighter equivalent.
7. Stop if validation fails and fix that step before continuing.
8. Update the roadmap status to `Implemented` when all planned implementation steps are complete, using the roadmap's project queue status values.

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
