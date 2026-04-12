---
name: plan-next-from-todo
description: >-
  Reads TODO.md (and related stacks), summarizes open work, and recommends what
  to tackle next with rationale and dependencies. Use when the user asks what to
  work on next, wants triage, or says plan / pick from TODO.
---

# Plan next from TODO

1. Read `TODO.md` (full file unless the user pointed at a section).
2. Ignore items already marked done (`[x]`) unless the user wants a retrospective.
3. Group remaining items by theme: stack / implementation / cleanup / tooling.
4. Call out **dependencies** (blocked vs unblocked) and **risk** (small chore vs architecture).
5. Recommend **one to three** next actions with a short reason each; prefer unblocked, high-leverage, or user-stated goals.
6. If the user wants execution next, suggest attaching **`implement-todo-batch`** with a concrete anchor (file + line) for the first slice.

Keep the reply concise: bullets, no long rewrites of the whole TODO file.
