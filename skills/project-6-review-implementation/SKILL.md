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

1. Read the project plan, matching research doc, roadmap row, directly linked local docs, and current git state.
2. Run one implementation review pass. The script auto-includes a sibling `Project Research` doc when present and directly linked local `.md` / `.tao` context from the plan and research doc; pass `--research <path>` if the research doc is elsewhere. By default this runs all configured reviewers; if the user excludes a reviewer, pass `--reviewers codex` or `--reviewers claude` instead of running the excluded tool.

   ```sh
   ./agent project-review --mode implementation --base main <plan-path>
   ```

   The shared reviewer script defaults Claude to pinned `opus-4.8`. Do not use a floating `opus` alias or another Claude model unless the user explicitly changes the model.

3. Read the selected review outputs from the reported artifact directory. The prompt asks reviewers to be brief and return only the most important issues rather than a full deep-dive audit. If one requested reviewer fails or hangs, use any completed output and rerun only the missing requested reviewer with the existing prompt instead of starting broader research.
4. Treat stale-doc findings as first-class implementation issues when the code, plan, roadmap, historical docs, command names, or acceptance paths disagree.
5. Incorporate valid findings that fix bugs, missed requirements, missing tests, unclear generated behavior, or meaningful maintainability risks.
6. Document valid deferred work in the plan or roadmap.
7. Ignore weak, duplicate, out-of-scope, or speculative feedback.
8. Validate changes using the relevant narrow checks or `./agent check`.
9. Commit review fixes through `git-workflow`.
10. Do not run multiple review passes in one `project-review` invocation. If another round is useful, first apply the current round's accepted fixes, validate them, and commit the review-fix chunk when appropriate.
11. Repeat up to 3 total review passes only when the previous pass produced meaningful new issues and its fixes have already been applied.
12. Update roadmap status to `Reviewed implementation` when ready for merge prep, using the roadmap's project queue status values.

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
