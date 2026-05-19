---
name: project-3-write-project-plan
description: Write an implementation-ready Tao project plan from a completed project research document, with numbered committable steps and roadmap updates.
---

# Project 3: Write Project Plan

## When to use

- After `project-2-research-project` has produced enough decisions for implementation planning.
- When converting a project research doc into a committable-step project plan.

## Plan Doc

Read:

```text
Docs/Projects/<Project Name> Project Research.md
```

Write:

```text
Docs/Projects/<Project Name> Project Plan.md
```

The plan doc should sit next to the research doc directly under `Docs/Projects/`. Only create a folder if the project needs additional artifacts beyond those two docs.

## Workflow

1. Read the full research doc and related source/spec files.
2. Identify implementation boundaries, dependencies, non-goals, validation needs, and risks.
3. Write the project plan with:
   - summary;
   - goals and non-goals;
   - assumptions;
   - numbered implementation steps;
   - validation;
   - deferrals.
4. Make each numbered step a coherent committable chunk.
5. For every step, include context, concrete work, validation, exit criteria, and suggested commit subject.
6. Update `Docs/Tao Project Roadmap.md` with the plan link and status `Planned`, using the roadmap's project queue status values.
7. Do not implement the plan in this step.

## Output

- Research doc path.
- Plan doc path.
- Roadmap update.
- Next skill to run: `project-4-review-project-plan`.

## Validation

- Run `./agent dprint check --incremental=false` and `./agent git diff --check`.
- Do not run code tests for docs-only planning unless implementation files changed.
