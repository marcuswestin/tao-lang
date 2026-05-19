---
name: project-1-decide-next-project
description: Decide the next Tao project by reading the roadmap, project docs, TODOs, and repo state, then jointly selecting the highest-priority project with the user before any research or plan writing.
---

# Project 1: Decide Next Project

## When to use

- When the user asks what project to do next.
- When starting the numbered Tao project workflow.
- When the roadmap priority order needs to be reassessed.

## Sources

Read these before recommending:

1. `CORE_TENETS.md`
2. `Docs/Tao Project Roadmap.md`
3. `Docs/Tao Documentation Index.md`
4. `Docs/Projects/**`
5. `TODO.md` and `TODO.Resolved.md` when present
6. `./agent git status --short --branch`

## Workflow

1. Inspect the roadmap queue and feature inventory.
2. Identify planned, unplanned, blocked, and stale project areas.
3. Compare candidates by Buildable App MVP impact, dependency order, implementation risk, and doc readiness.
4. Present the top 3 candidates with rationale, blockers, and recommended next project.
5. Ask the user to decide or refine the recommendation.
6. Only after user agreement, update `Docs/Tao Project Roadmap.md` with the chosen priority/status, using the roadmap's project queue status values.
7. Do not write research or project-plan docs in this step.

## Output

- Recommendation and top alternatives.
- Roadmap update made, or exact roadmap update proposed if user has not decided.
- Next skill to run: `project-2-research-project`.

## Validation

- For read-only recommendation, no tests.
- If the roadmap is edited, run `./agent dprint check --incremental=false` and `./agent git diff --check`, then report status.
