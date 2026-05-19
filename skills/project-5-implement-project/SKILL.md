---
name: project-5-implement-project
description: Implement a reviewed Tao project plan one intended step at a time on a feature branch or worktree, committing each coherent functional unit and validating at sensible boundaries.
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
   - split the step into coherent units of functionality when the step is too large for one useful commit;
   - commit each implemented unit of functionality, using the plan's suggested subject pattern or a tighter equivalent;
   - prefer running the relevant checks or tests at each useful boundary, but do not require every intermediate commit to be fully implemented, fully working, or fully test-passing;
   - skip checks or tests before an intermediate commit when running them would not provide meaningful signal for that incomplete unit, and record the deferred validation in the plan or implementation notes;
   - run the validation named in the plan before treating the numbered step as complete, unless the step is intentionally intermediate and the plan defers that validation;
   - update the plan or roadmap with completed/deferred discoveries;
   - when a commit is meant to close the numbered step or a validation boundary, run `./agent prep-commit` before committing unless the user explicitly opted out.
7. Stop on validation failures that block the current validation boundary. Do not stop merely because an intentional intermediate commit has deferred checks.
8. Update the roadmap status to `Implemented` when all planned implementation steps are complete, using the roadmap's project queue status values.

## Output

- Branch/worktree used.
- Commits created.
- Plan steps completed.
- Validation run.
- Deferred work recorded.
- Next skill to run: `project-6-review-implementation`.

## Validation

- Use the plan's per-step validation at step completion or at the validation boundary named in the plan.
- Intermediate commits may defer checks or tests when the unit is intentionally incomplete; record that validation was deferred.
- Run `./agent prep-commit` before commits that close a numbered step or validation boundary unless the user explicitly opted out.
