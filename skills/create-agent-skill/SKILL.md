---
name: create-agent-skill
description: Create or update a Tao repo skill after interviewing the user until requirements are clear. Use when a needed skill or workflow has been identified and the user wants an agent to ask questions, design the skill, and create or edit skills/<name>/SKILL.md using Tao conventions and available skill-creator guidance.
---

# Create Agent Skill

Use this skill when a skill need is clear enough to start shaping, but not necessarily clear enough to write.

## Grounding

1. Read `skills/agent-system-maintenance/SKILL.md`.
2. Read the existing skill being updated, or inspect nearby `skills/*/SKILL.md` examples for a new skill.
3. Read the current agent platform's skill-creator guidance when available, such as a global `skill-creator` skill.
4. Keep the result Tao-local under `skills/<skill-name>/SKILL.md`.

Do not add platform-specific metadata such as `agents/openai.yaml` unless the repo has explicitly adopted that metadata for Tao-local skills.

## Interview

Ask one question at a time until these are clear:

- trigger phrases and contexts;
- what the skill must do;
- what it must not do;
- required repo files, commands, or external sources;
- output shape;
- validation or acceptance checks.

Skip questions that can be answered by inspecting the repo.

## Creation Rules

1. Use a lowercase hyphenated name under 64 characters.
2. Put all trigger information in the YAML `description`.
3. Keep `SKILL.md` concise and procedural.
4. Add references only when the skill needs optional deeper context.
5. Prefer existing Tao commands through `./agent`.
6. Preserve user-owned dirty work and do not stage changes unless the user asks.
7. Update `agent-opportunities.md` when the new skill resolves or partially resolves an opportunity.

## Validation

After edits:

1. Run `./agent git diff --check`.
2. Run the narrowest relevant repo validation.
3. For agent-system changes that affect normal workflows, run `./agent check` unless the user opts out.

## Output

Report:

- skill path;
- what it now triggers on;
- validation run;
- any unresolved opportunities left in `agent-opportunities.md`.
