---
name: project-4-review-project-plan
description: Review a Tao project plan with Codex and Claude through the project-review script, then incorporate, defer, or ignore findings before implementation starts.
---

# Project 4: Review Project Plan

## When to use

- After `project-3-write-project-plan` creates a plan doc.
- When the user asks to have Codex and Claude critique a project plan.
- Before implementation starts on a non-trivial plan.

## Workflow

1. Read the project plan, matching research doc if present, roadmap row, and any directly linked local docs that define scope or historical context.
2. Run one plan-review pass. The script auto-includes a sibling `Project Research` doc when present and directly linked local `.md` / `.tao` context from the plan and research doc; pass `--research <path>` if the research doc is elsewhere.

   ```sh
   ./agent project-review --mode plan <plan-path>
   ```

   The shared reviewer script defaults Claude to pinned `opus-4.6`. Do not use a floating `opus` alias or `opus-4.7` unless the user explicitly changes the model.

3. Read both review outputs from the reported artifact directory. The prompt asks reviewers to be brief and return only the most important issues rather than a full deep-dive audit. If one reviewer fails or hangs, use any completed output and rerun only the missing reviewer with the existing prompt instead of starting broader research.
4. Treat stale-doc findings as first-class plan issues: broken links, historical docs treated as active scope, roadmap/status drift, invalid command names, and acceptance paths that do not exercise the claimed provider/runtime.
5. Incorporate findings that improve clarity, sequencing, scope control, validation, or implementation safety.
6. Record valid future work in a deferred or follow-up section in the plan.
7. Ignore weak, irrelevant, duplicate, or scope-breaking feedback.
8. Do not run multiple review passes in one `project-review` invocation. If another round is useful, first apply the current round's accepted feedback to the plan and roadmap, validate those edits, then run a fresh one-pass review.
9. Repeat up to 3 total review passes only when the previous pass produced meaningful new issues and its fixes have already been applied.
10. Update `Docs/Tao Project Roadmap.md` to `Reviewed` when the plan is ready, using the roadmap's project queue status values.

## Output

- Artifact directory.
- Findings incorporated.
- Findings deferred.
- Findings ignored.
- Plan doc path.
- Next skill to run: `project-5-implement-project`.

## Validation

- Run `./agent dprint check --incremental=false` and `./agent git diff --check` after doc edits.
- Do not run code tests for docs-only review updates.
