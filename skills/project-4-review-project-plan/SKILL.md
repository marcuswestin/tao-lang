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

1. Read the project plan and matching research doc if present.
2. Run one plan-review pass. The script auto-includes a sibling `Project Research` doc when present; pass `--research <path>` if the research doc is elsewhere.

   ```sh
   ./agent project-review --mode plan <plan-path>
   ```

3. Read both review outputs from the reported artifact directory.
4. Incorporate findings that improve clarity, sequencing, scope control, validation, or implementation safety.
5. Record valid future work in a deferred or follow-up section in the plan.
6. Ignore weak, irrelevant, duplicate, or scope-breaking feedback.
7. Repeat up to 3 passes only when the last pass produced meaningful new issues.
8. Update `Docs/Tao Project Roadmap.md` to `Reviewed` when the plan is ready, using the roadmap's project queue status values.

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
