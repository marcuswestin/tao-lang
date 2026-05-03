# Human Guide for Tao Lang Agents

This file is for maintainers. It is not startup context for agents.

## Purpose

The repo should have one portable agent system:

- `AGENTS.md` gives every agent the short, critical repo rules.
- `skills/` contains task-specific workflows.
- Platform folders such as `.cursor/`, `.claude/`, `.codex/`, and `.gemini/` contain discovery glue only.
- MCP configuration is added only after a human decides it is worth the capability and security cost.

## Where Information Belongs

- Put always-needed safety rules in `AGENTS.md`: command entrypoints, git safety, broad repo conventions, and test commands.
- Put task procedures in `skills/<name>/SKILL.md`: reviews, commits, TODO batches, feature planning, compiler work, and similar workflows.
- Put long reference material in `skills/<name>/references/`: examples, API notes, detailed Langium guidance, and checklists that should load only on demand.
- Put human policy and maintenance advice in `humans.md`.
- Put implementation documentation for Tao itself under `Docs/`.
- Use MCPs for live external capabilities, not static instructions.

## Skill Authoring

Every skill should be small and composable:

```markdown
---
name: code-review
description: Reviews changed code for bugs, regressions, missing tests, and meaningful maintainability issues.
---

# Code Review

## When to use

- When the user asks for review.

## Steps

1. Establish the review scope.
2. Read the relevant diff and nearby code.
3. Report findings first, ordered by severity.
```

Guidelines:

- Use kebab-case folder names.
- Keep `SKILL.md` focused on procedure, not background essays.
- Put long examples or detailed reference material in `references/`.
- Avoid platform names unless the skill is explicitly about that platform.
- Include validation steps when the workflow mutates files.
- Prefer one skill per job. Split broad workflows instead of creating monoliths.

## Reviewing Skills

Before accepting a new or changed skill:

1. Read the frontmatter and confirm the description clearly states when it triggers.
2. Read the body and remove generic advice that a competent coding agent already knows.
3. Confirm it does not conflict with `AGENTS.md`.
4. Confirm it does not rely on Cursor, Claude, Codex, or Gemini behavior unless it is a platform adapter skill.
5. Check that any scripts are deterministic, scoped, and safe to run.
6. Check that any references are useful enough to justify their maintenance cost.

## Finding Skills to Add

Prefer official and maintained sources:

- Agent Skills specification: <https://agentskills.io/specification>
- OpenAI skills catalog: <https://github.com/openai/skills>
- Claude Code skills docs: <https://docs.claude.com/en/docs/claude-code/skills>
- Gemini CLI docs: <https://google-gemini.github.io/gemini-cli/>
- Cursor docs: <https://docs.cursor.com/>

When evaluating third-party skills:

- Inspect every `SKILL.md`.
- Inspect every bundled script before running it.
- Prefer read-only workflows first.
- Pin external sources by commit when practical.
- Avoid skills that install dependencies, call external services, or change git state unless that behavior is essential and explicit.
- Do not commit secrets, tokens, hostnames, or personal machine paths.

## Deciding on MCPs

Add an MCP only when it provides a capability that static docs or a skill cannot provide well.

Good MCP candidates:

- Project issue trackers, when agents need live issue metadata.
- Design/file systems, when agents need to inspect current external artifacts.
- Documentation/search systems, when APIs change frequently.
- Database or service inspectors, only with read-only default permissions.

Avoid MCPs when:

- A static reference file is enough.
- The server requires broad write permissions.
- Secrets would need to be committed.
- The setup is too personal for a repo-level config.

Default policy:

- Start read-only.
- Keep credentials outside the repo.
- Commit shared MCP config only when it contains no secrets.
- Document setup in `humans.md` or `Docs/`, not in `AGENTS.md`.

## Platform Discovery Checks

After changing agent files, verify discovery manually:

- Cursor: confirm `.cursor/skills` points to `skills/` and `.cursor/hooks.json` still points shell execution through `packages/shared/scripts/cursor-hooks/command-whitelist.sh`.
- Claude Code: confirm `.claude/skills` points to `skills/`, and `CLAUDE.md` points to `AGENTS.md`.
- Codex: confirm `AGENTS.md` is concise and root-visible; confirm `.codex/skills` points to `skills/` where supported.
- Gemini CLI: confirm `GEMINI.md` loads with `/memory show`; confirm `.gemini/skills` points to `skills/` where supported.

## Quarterly Cleanup

Once per quarter:

- Remove stale skills that nobody uses.
- Check for duplicated instructions between `AGENTS.md`, platform adapters, and skills.
- Review whether any long `SKILL.md` should move detail into `references/`.
- Re-check official docs for platform discovery changes.
- Re-evaluate MCPs and remove ones that are not used.
- Run `./agent check` after maintenance edits.
