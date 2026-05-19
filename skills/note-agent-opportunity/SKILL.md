---
name: note-agent-opportunity
description: Record Tao repo agent opportunities, including user annoyances, repetitive tasks, unmet desires, workflow friction, repo/tooling issues, confusing docs, speedups, and possible future skills. Use when the user asks to note irritation, frustration, a repetitive behavior, a desired helper, or when an agent notices a non-blocking opportunity worth preserving in agent-opportunities.md.
---

# Note Agent Opportunity

Use this skill to preserve useful friction without derailing the current task.

## Steps

1. Decide whether the note belongs here. Log it when a future agent could act on it through a skill, workflow, utility, doc cleanup, repo fix, or investigation.
2. Keep working on the primary task unless the user explicitly asks to switch.
3. Read `agent-opportunities.md`.
4. Add a dated entry at the top of `Open`.
5. Include source/context, why it matters, and a possible skill/workflow follow-up when one is apparent.

## Entry Style

Use this shape:

```md
### YYYY-MM-DD - Brief description.

- Source/context: user quote, agent observation, command/output context, or task context.
- Why it matters: the practical cost, repeated annoyance, blocked workflow, or user preference it reveals.
- Possible follow-up: skill, workflow, utility, doc cleanup, repo fix, or investigation that may address it.
```

Keep entries compact. Preserve the user's wording when it explains the irritation or desire better than a paraphrase.

## Review Passes

When asked to review opportunities, use `recommend-agent-skills` instead of manually triaging this file.
