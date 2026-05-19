---
name: project-6-review-implementation
description: Review an implemented Tao project against its plan by running selected implementation reviewers, incorporating valid findings, and repeating up to three passes when useful.
---

# Project 6: Review Implementation

## When to use

- After `project-5-implement-project` completes implementation.
- Before preparing a branch for merge.
- When the user asks for implementation review.

## Workflow

1. Read the project plan, matching research doc, roadmap row, and current git state.
2. Run one implementation review pass. The script auto-includes a sibling `Project Research` doc when present; pass `--research <path>` if the research doc is elsewhere. By default this runs all configured reviewers; if the user excludes a reviewer, pass `--reviewers codex` or `--reviewers claude` instead of running the excluded tool.

   ```sh
   ./agent project-review --mode implementation --base main <plan-path>
   ```

3. Read the requested review outputs from the reported artifact directory.
4. Incorporate valid findings that fix bugs, missed requirements, missing tests, unclear generated behavior, or meaningful maintainability risks.
5. Document valid deferred work in the plan or roadmap.
6. Ignore weak, duplicate, out-of-scope, or speculative feedback.
7. Validate changes using the relevant narrow checks or `./agent check`.
8. Commit review fixes through `git-workflow`.
9. Repeat up to 3 passes only when the previous pass produced meaningful new issues.
10. Update roadmap status to `Reviewed implementation` when ready for merge prep, using the roadmap's project queue status values.

## Progress Overview

After each completed review/fix/roadmap commit, post a short progress overview in the conversation. Use a Markdown title and include:

- Step completed: review pass, fix chunk, or roadmap update.
- Next step: the next review/fix/merge-prep action.
- Completed count: `X of Y steps` for the current review workflow.
- Elapsed time: exact if tracked, otherwise a clear estimate.
- Estimated time remaining: include a rough expected range for when the review workflow will likely finish in about 80% of cases.

Example:

```md
**Implementation Review Progress**

**Step Completed:** Codex-only review pass 2
**Next Step:** Commit valid review fixes
**Completed:** 4 of 6 steps
**Elapsed:** about 1h 20m
**Estimate Remaining:** likely about 30-60m in the 80% case, mostly final validation and roadmap update
```

## Output

- Artifact directory.
- Findings incorporated, deferred, and ignored.
- Commits created.
- Validation run.
- Next skill to run: `project-7-prepare-merge`.

## Validation

- Run relevant tests after fixes.
- Run `./agent prep-commit` before any commit.
