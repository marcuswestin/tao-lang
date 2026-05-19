---
name: project-3-write-project-plan
description: Write an implementation-ready Tao project plan from a completed project research document, with numbered intended implementation steps and roadmap updates.
---

# Project 3: Write Project Plan

## When to use

- After `project-2-research-project` has produced enough decisions for implementation planning.
- When converting a project research doc into an intended-step project plan.

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
   - numbered intended implementation steps;
   - validation;
   - deferrals.
4. Make each numbered step a meaningful implementation chunk, not a tiny checklist item and not a whole-project milestone.
5. Treat numbered steps as intended implementation slices. A step may require several smaller commits, and those commits do not have to fully implement the whole step, leave the project in a fully working state, or pass every check along the way.
6. For every step, include context, concrete work, likely commit units, validation, exit criteria, and a suggested commit subject pattern.
7. Explicitly say when validation can be deferred for intermediate commits. It is valid to make many small commits inside one step, each representing one coherent part of that step, including commits made without running tests or checks when that is the practical path.
8. Reserve the step's validation and exit criteria for deciding when the numbered step is complete, not for blocking every intermediate commit unless the work genuinely needs that boundary.
9. Update `Docs/Tao Project Roadmap.md` with the plan link and status `Planned`, using the roadmap's project queue status values.
10. Do not implement the plan in this step.

## Output

- Research doc path.
- Plan doc path.
- Roadmap update.
- Next skill to run: `project-4-review-project-plan`.

## Validation

- Run `./agent dprint check --incremental=false` and `./agent git diff --check`.
- Do not run code tests for docs-only planning unless implementation files changed.
