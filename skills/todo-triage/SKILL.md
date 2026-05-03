---
name: todo-triage
description: Reads TODO markdown, groups open work, identifies dependencies and risk, and recommends the next focused tasks without editing files.
---

# TODO Triage

## When to use

- When the user asks what to work on next.
- When the user asks to plan from `TODO.md` or another markdown backlog.
- When a TODO list needs dependency or risk triage.

## Steps

1. Read the requested TODO file, defaulting to `TODO.md`.
2. Ignore completed items unless the user asks for retrospective context.
3. Group open items by theme, dependency, risk, and likely package area.
4. Identify blocked items and prerequisites.
5. Recommend one to three next actions with short rationale.
6. If the user wants implementation, name the first focused batch that `todo-batch` should execute.

## Validation

- This is a read-only workflow. Do not edit TODO files during triage.
