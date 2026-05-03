---
name: agent-system-maintenance
description: Maintains AGENTS.md, platform adapters, skills, humans.md, and agent/MCP discovery without increasing startup context or duplication.
---

# Agent System Maintenance

## When to use

- When editing `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `humans.md`, or `skills/`.
- When adding, removing, or reorganizing agent skills.
- When evaluating platform adapters or MCP configuration.

## Steps

1. Inventory current agent-facing files before changing them.
2. Keep `AGENTS.md` concise and limited to always-needed safety and repo context.
3. Put reusable workflows in `skills/` and long details in skill `references/`.
4. Keep platform folders as adapters or symlinks only.
5. Do not add MCP config until `humans.md` policy has been followed.
6. Remove duplicated instructions after moving them to the canonical location.
7. Verify symlinks and confirm no useful content remains only in platform-specific folders.

## Validation

- Confirm `skills/*/SKILL.md` is the only canonical skill source.
- Confirm platform skill paths point to `skills/`.
- Run `./just-agents check` for the final migration unless the user opts out.
