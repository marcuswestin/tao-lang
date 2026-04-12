---
name: check-for-improvements
description: Review all current uncommitted changes, identify concrete improvements (bugs, code quality, style, missing tests), and present an actionable plan. Use when the user asks to check, review, or improve their current changes, or wants a quality review before committing.
---

# Check for Improvements

Analyze all uncommitted changes, propose concrete improvements, and execute approved ones.

## Workflow

### Step 1: Gather Current Changes

Run these commands to understand the full scope of changes:

```
./just-agents shell git status
./just-agents shell git diff
./just-agents shell git diff --cached
```

Collect the list of all modified, staged, and untracked files.

### Step 2: Analyze Changes

For each changed file, read the full file and its diff. Evaluate for:

- **Bugs & correctness** — logic errors, edge cases, off-by-one, null/undefined risks
- **Code quality** — naming, duplication, unnecessary complexity, dead code
- **Style consistency** — does it match surrounding code patterns and project conventions?
- **Error handling** — missing validation, unhandled failure modes
- **Test coverage** — are new/changed code paths covered by tests?
- **Documentation** — are exported functions documented per project conventions?

Skip trivia. Only flag improvements that meaningfully improve correctness, clarity, or maintainability.

### Step 3: Present Improvement Plan

Present findings as a numbered list. For each item include:

| Field    | Description                        |
| -------- | ---------------------------------- |
| **File** | Path to the file                   |
| **What** | Concrete description of the change |
| **Why**  | Brief justification (1 sentence)   |

Example:

> **1. `packages/compiler/compiler-src/validation/tao-lang-validator.ts`**
> **What:** Add exhaustive switch check for new `AliasStatement` node type
> **Why:** Missing case will silently skip validation for alias statements.

Group related improvements together. Order by importance (bugs first, then quality, then style).

### Step 4: Ask for Approval

Use the AskQuestion tool to let the user choose how to proceed:

- **Proceed with all** — Execute every proposed improvement
- **Proceed with modifications** — Let the user specify which items to include/skip/change
- **Cancel** — Do nothing

If the user chooses "modifications", ask follow-up questions to clarify which items to keep, skip, or adjust.

### Step 5: Execute Approved Improvements

Apply only the approved changes. After editing each file:

1. Check for linter errors with ReadLints
2. Fix any introduced errors before moving to the next file

Do **not** commit. The user decides when to commit. For staging and commits afterward, use **`tao-git-workflow`**.

Do **not** stage changes: never run `git add` (or equivalent) as part of this workflow. Leave all edits **unstaged** in the working tree so the user can review and stage themselves.

## Notes

- **No staging:** This skill must not modify the Git index (`git add`, `git restore --staged`, etc.). Only working-tree edits are allowed after approval.
- Focus on the _diff_, not the entire file — unless surrounding context reveals an issue.
- When in doubt about whether something is an improvement, include it but note it as low priority.
- If there are no meaningful improvements to suggest, say so clearly and don't invent busywork.
