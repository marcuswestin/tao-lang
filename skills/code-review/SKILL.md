---
name: code-review
description: Reviews changed code for bugs, regressions, missing tests, and meaningful maintainability issues before implementation or commit.
---

# Code Review

## When to use

- When the user asks for a review.
- When staged, unstaged, branch, or PR changes need quality assessment.
- When deciding whether current changes are ready to commit or land.

## Steps

1. Establish the review scope: staged diff, unstaged diff, branch diff, named files, or the user's explicit target.
2. Read the relevant diff and enough surrounding code to understand behavior.
3. Compare changed behavior against nearby tests, validators, formatter rules, compiler/runtime contracts, and repo conventions.
4. Look for correctness bugs, regressions, missing validation, missing tests, unsafe git or command behavior, and meaningful maintainability problems.
5. Report findings first, ordered by severity, with precise file and line references.
6. Include open questions only when the answer changes whether something is a bug.
7. Keep summaries brief. Do not implement fixes unless the user asks.

## Validation

- A review can be read-only.
- If the user asks for fixes after review, run the relevant `./just-agents` checks for touched areas before declaring done.
