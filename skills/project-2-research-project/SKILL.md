---
name: project-2-research-project
description: Run an interview-style research phase for a selected Tao project, asking the user one question at a time and recording decisions, conclusions, web findings, alternatives, and open questions in a project research document.
---

# Project 2: Research Project

## When to use

- After `project-1-decide-next-project` selects a project.
- When a project goal exists but the design, constraints, or success criteria are not clear enough for a plan.
- When the user wants interview-style project research.

## Research Doc

Create or update:

```text
Docs/Projects/<Project Name> Project Research.md
```

The standard research and plan pair stays directly under `Docs/Projects/` even when related docs live in topical folders. Only create a folder if the project needs additional artifacts beyond those two docs.

## Workflow

1. Read `Docs/Tao Project Roadmap.md`, the selected roadmap row, and related project/spec docs.
2. Create the research doc if missing with sections:
   - Goal
   - Current Context
   - Decisions
   - User Interview Notes
   - Repo Findings
   - External Research
   - Alternatives Considered
   - Unresolved Questions
   - Planning Inputs
3. Treat the user interview as the primary research source, asking one question at a time.
4. Prefer questions that change scope, semantics, UX, implementation approach, validation, or priority.
5. Inspect repo files before asking questions that can be answered locally.
6. Use web search when current external facts, APIs, platform behavior, or tool behavior matter.
7. Record stable decisions and conclusions in the research doc in coherent batches. Do not rewrite the document after every interview answer when the user is still answering a block of related questions.
8. Stop when the research doc records every decision needed to write the plan.
9. Update the roadmap status to `Researching` or `Ready for plan` as appropriate, using the roadmap's project queue status values.

## Output

- Research doc path.
- Decisions made.
- Remaining unresolved questions, if any.
- Next skill to run: `project-3-write-project-plan`.

## Validation

- Run `./agent dprint check --incremental=false` and `./agent git diff --check` after the full batch of doc edits is done. Do not interrupt rapid research edits with repeated validation unless the user asks.
- Do not run code tests for docs-only research.
