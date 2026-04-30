---
name: extrapolate-updates
description: Analyzes all uncommitted changes to extract preferences, design patterns, and tendencies, then identifies and propagates similar changes across the codebase. Implements a sample handful for review before proceeding with the rest. Use when the user wants to extrapolate, propagate, or spread current changes across the repo, or says extrapolate / apply pattern / replicate changes.
---

# Extrapolate Updates

Analyze the current uncommitted diff, infer the patterns and preferences it reflects, then find and apply those same patterns across the rest of the codebase.

## Step 1: Analyze the diff

Read the full staged + unstaged diff. For each changed hunk, extract:

- **What changed** — the concrete edit (rename, reformat, new convention, API migration, style shift, structural refactor, etc.)
- **Why it changed** — the underlying preference, rule, or design pattern the author is adopting
- **Signature** — how to recognize other locations in the codebase that should receive the same treatment

Distill this into a short list of **patterns** (usually 1–5). Present them to the user as a numbered list before proceeding:

> **Patterns detected:**
>
> 1. Renamed `getFoo` → `fetchFoo` across service helpers (preference: `fetch` prefix for async data retrieval)
> 2. Replaced manual `fs.readFile` calls with `@shared/fs` abstractions (convention: use shared utilities)
> 3. …

## Step 2: Search the codebase

For each pattern, search the full codebase for remaining instances that match the **signature** from Step 1. Collect every candidate location (file + line + context snippet).

Present the full list of candidates grouped by pattern:

> **Candidates found:**
> Pattern 1 — `getFoo` → `fetchFoo`: 12 remaining sites
> Pattern 2 — manual `fs.readFile`: 4 remaining sites
> …

Give the total count. If zero candidates remain, say so and stop.

## Step 3: Implement a sample

Pick a representative handful (3–6 changes, covering each pattern at least once). Implement them in the codebase. Choose examples that are:

- Spread across different files/packages
- Representative of both easy and slightly tricky cases
- Small enough to review quickly

After implementing, present the sample changes clearly:

> **Sample changes made (X of Y total):**
>
> 1. `packages/compiler/foo.ts:42` — renamed `getUser` → `fetchUser`
> 2. `packages/shared/bar.ts:18` — replaced `fs.readFile` with `readFile` from `@shared/fs`
> 3. …

## Step 4: Ask for feedback

Ask the user to review the sample changes. Use the AskQuestion tool:

- **Go ahead** — Implement all remaining candidates using the same patterns
- **Go ahead with notes** — User provides minor corrections; apply those corrections then implement all remaining
- **Corrections needed** — Restart from Step 1, re-reading the diff (which now includes the sample changes) to recalibrate

## Step 5: Execute or restart

- **Go ahead:** Implement every remaining candidate. Run linter checks on touched files. Summarize what was done.
- **Go ahead with notes:** Incorporate the user's notes, fix the sample changes if needed, then implement all remaining candidates with the corrections applied. Summarize.
- **Corrections needed:** Revert the sample changes, then restart from Step 1 with the user's feedback in mind. The new analysis should account for what the user corrected.

After completing all changes, run `./just-agents check` on touched areas. Do **not** commit or stage — the user decides when to do that.

## Notes

- Focus on changes the user actually made, not hypothetical improvements. The goal is to **extrapolate their intent**, not impose new opinions.
- If a pattern is ambiguous (could be intentional or incidental), include it in the pattern list but flag it as uncertain — let the user confirm in the feedback step.
- Skip files that are generated, vendored, or in `node_modules`.
- When the candidate list is very large (>30), group by package/directory and ask the user whether to proceed with all or narrow scope before implementing.
