---
name: project-4-review-project-plan
description: Review a Tao project plan with two read-only subagent reviewers with different review personalities, then incorporate, defer, or ignore findings before implementation starts.
---

# Project 4: Review Project Plan

## When to use

- After `project-3-write-project-plan` creates a plan doc.
- When the user asks to critique a project plan.
- Before implementation starts on a non-trivial plan.

## Workflow

1. Read the project plan, matching research doc if present, roadmap row, and any directly linked local docs that define scope or historical context.
2. Launch one review pass using two read-only subagents in parallel. Do not run `./agent project-review` for this skill.
3. Give both subagents the plan path, research path if any, roadmap row, directly linked local context paths, and this shared instruction:
   - Review the plan only.
   - Do not edit files.
   - Return only the most important issues, not a full deep-dive audit.
   - Ground every finding in a repo file, command, source link, or plan section.
   - Include concrete suggested changes for accepted findings.
4. Use two different review personalities:
   - **Implementation Skeptic:** focus on repo reality, invalid assumptions, stale docs, missing dependencies, command/test feasibility, generated-code boundaries, runtime ownership, and acceptance paths that do not exercise the claimed provider/runtime.
   - **Scope Editor:** focus on product fit, roadmap ownership, sequencing, chunk size, non-goals, deferrals, ambiguity, overreach, and whether the plan is implementation-ready.
5. Wait for both subagents' final messages. If one fails or hangs, continue with the completed review plus one local pass in the missing personality rather than starting a broader review process.
6. Treat stale-doc findings as first-class plan issues: broken links, historical docs treated as active scope, roadmap/status drift, invalid command names, and acceptance paths that do not exercise the claimed provider/runtime.
7. Incorporate findings that improve clarity, sequencing, scope control, validation, or implementation safety.
8. Record valid future work in a deferred or follow-up section in the plan.
9. Ignore weak, irrelevant, duplicate, or scope-breaking feedback.
10. Do not run multiple review passes at once. If another round is useful, first apply the current round's accepted feedback to the plan and roadmap, validate those edits, then launch a fresh two-subagent review pass.
11. Repeat up to 3 total review passes only when the previous pass produced meaningful new issues and its fixes have already been applied.
12. Update `Docs/Tao Project Roadmap.md` to `Reviewed` when the plan is ready, using the roadmap's project queue status values.

## Output

- Review agents used.
- Findings incorporated.
- Findings deferred.
- Findings ignored.
- Plan doc path.
- Next skill to run: `project-5-implement-project`.

## Validation

- Run `./agent dprint check --incremental=false` and `./agent git diff --check` after doc edits.
- Do not run code tests for docs-only review updates.
