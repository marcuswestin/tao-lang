---
name: check-code-conventions-and-quality
description: Compares uncommitted or requested code to repo conventions; infers pattern deltas; lists intended follow-up changes for review before any edits.
---

# Convention deltas and planned changes

**Purpose:** Help the user see how their work (or a chosen scope) lines up with existing repo conventions, what new patterns it introduces, and what follow-up edits would make the tree consistent—**before** anything is implemented.

**Default scope:** Current **uncommitted** changes (staged + unstaged).

**Other scopes (when the user asks):** The **whole repo**, or **specific files, directories, packages, or topics** they name.

## Step 1: Establish scope and inputs

- **Default:** Read the full staged + unstaged diff. That is the primary subject.
- **Repo-wide or targeted:** Read what the user pointed at (paths, package, or “entire codebase” for a convention). Use search and representative files; do not reread the universe unless the ask is truly global.

For the scoped material, extract:

- **What changed or what is under review** — concrete edits, new APIs, style shifts, refactors.
- **Repo baseline** — How the same concerns are handled elsewhere (naming, imports `@shared/*`, test layout, jsdoc, DRY patterns, `AGENTS.md` / `.cursor` rules). Cite adjacent or canonical examples when useful.
- **Delta** — Where the scoped work **aligns with**, **extends**, or **diverges from** those norms (new preference, accidental inconsistency, or unclear intent).

Distill **patterns** (usually 1–5): each pattern ties a **signature** (how to spot the same situation elsewhere) to the **intended direction** (match repo, or adopt the new convention consistently).

## Step 2: Extrapolate candidates (when relevant)

If the goal is consistency (not a one-off doc-only review), search the codebase for locations matching each pattern’s **signature**—including outside the diff if the user wants rollout guidance.

Collect candidates (file + line or region + short context). If the scope was **only** the diff, you may still mention “would also apply to …” elsewhere for awareness.

## Step 3: Deliver the review package (no implementation yet)

Present, in order:

1. **Convention / pattern summary** — Numbered list: what the work implies, how it compares to repo norms, and any ambiguities (flag uncertain items explicitly).

2. **Intended changes** — A concrete, reviewable list of follow-up edits: grouped by pattern, each item actionable (what to do where). Include counts if you listed many sites.

3. **Open questions** — Only if something must be decided before editing (e.g. two valid repo styles).

**Stop here for user review.** Do **not** apply edits, run refactors, or implement a “sample” in this turn unless the user already asked you to proceed after a prior review.

## Step 4: After the user approves or redirects

When the user says to proceed (possibly with corrections or a narrower scope):

- Apply the **approved** intended changes. If they asked for a **pilot subset** first, do that subset, then pause for another review if they want.
- Run `./just-agents check` (or the relevant package checks) on touched areas.
- Do **not** commit or stage unless they explicitly ask.

If they **reject** or **narrow** the list, revise the intended changes and wait again before editing.

## Notes

- **Infer intent from evidence** — Prefer patterns visible in the user’s diff or requested code; do not invent unrelated “cleanup.”
- **Uncertain patterns** — Include them but label as uncertain; do not treat guesswork as mandatory rollout.
- **Skip** generated, vendored, and `node_modules` paths.
- **Large candidate sets** — Group by package or directory; offer phased rollout or narrowed scope in the **intended changes** section.
- **Repo commands** — Use `./just-agents` only per workspace rules.
