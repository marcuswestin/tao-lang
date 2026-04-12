---
name: implement-from-spec
description: >-
  Implements a Tao Lang feature from a written spec (e.g. under TODO Specs or
  Docs/Dev Log): clarify ambiguities, add missing TODOs in the spec, then code
  with project rules and tests. Use when the user references a spec file or
  says implement the spec.
---

# Implement from spec

## Before coding

1. Open the spec path the user gave (or infer from `TODO Specs/` / `Docs/Dev Log/`).
2. **Do not guess** on ambiguous requirements: ask clarifying questions until the plan is clear enough to implement or to split into phases.
3. If work is discovered during implementation, **add TODO items to the spec file** (checkboxes) before doing that work, unless the user wants a single atomic PR.

## During implementation

- Follow `AGENTS.md`, `./just-agents` for all commands, and relevant `.cursor/rules/` (grammar, AST, formatter, etc.).
- Keep changes aligned with the spec; if the spec is wrong, propose an update to the spec text, then implement.

## Verification

- Run `./just-agents fix` and `./just-agents prep-commit` (or at least targeted tests) before calling the work done.
- Land commits using **`tao-git-workflow`**.

## Related skills

- **`create-spec-file`** — how to author the spec document and template.
- **`create-project`** — full “new Dev Log project + spec + branch” bootstrap.
