---
name: todo-batch
description: Implements one coherent batch from a markdown TODO list, updates the TODO file, and stops after validation.
---

# TODO Batch

## When to use

- When the user asks to implement TODO items.
- When the user points at a TODO file, section, or line and asks for the next batch.
- When a previous triage selected a concrete TODO batch.

## Steps

1. Read the full TODO file and derive the requested subtree or next coherent batch.
2. Prefer small, related, low-risk batches; include prerequisites when needed.
3. Ask before architecture-changing or public-contract-changing work unless the user already approved that direction.
4. Re-read files before editing if there may be concurrent changes.
5. Implement only the selected batch.
6. Update the TODO file to mark completed items, adjust wording when scope shifted, and add discovered follow-ups.
7. Stop after the batch. Do not continue into the next batch without a new user request.

## Validation

- Run the narrow relevant checks for touched packages, or `./just-agents check` when the change is cross-cutting.
- Report completed items, deferred items, TODO file updates, and test results.
