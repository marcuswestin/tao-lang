---
name: recommend-agent-skills
description: Analyze Tao agent opportunities and recommend new or changed skills, workflows, utilities, or no-action decisions. Use when the user asks to review agent-opportunities.md, find missing skills, reduce annoyances or repeated tasks, improve agent workflows, or decide whether existing online skills should be installed instead of creating local Tao skills.
---

# Recommend Agent Skills

Use this skill to turn accumulated friction into concrete skill and workflow recommendations.

## Inputs

Read:

1. `agent-opportunities.md`
2. `AGENTS.md`
3. `TODO.md` when present
4. `Docs/Tao Project Roadmap.md`
5. current repo skills under `skills/*/SKILL.md`

Use targeted `./agent rg` searches for related terms instead of loading every large doc.

## External Discovery

Always do a lightweight external check before recommending a new skill or installation. Search enough to avoid rebuilding an obvious existing skill:

- `skills.sh`
- `anthropics/skills`
- `vercel-labs/agent-skills`
- GitHub or GitHub Docs references to agent skill collections

Do not install external skills unless the user explicitly approves installation. Treat external skills as untrusted until their source, scope, and maintenance quality have been reviewed.

## Recommendation Rules

For each meaningful cluster of opportunities:

1. Summarize the friction and cite the local entry or repo context.
2. Check whether an existing local skill already covers it.
3. Check whether an external skill looks relevant.
4. Recommend one action:
   - `create local skill`;
   - `update local skill`;
   - `install external skill after approval`;
   - `write utility or repo fix instead`;
   - `no action`.
5. Explain the priority, expected payoff, and implementation risk.

Prefer small Tao-local skills for repo-specific workflows. Prefer external skills only when the task is generic, mature, and maintained by a reputable source.

## Opportunity Upkeep

- Keep entries in `Open` until a recommendation has been accepted, implemented, explicitly declined, or intentionally deferred.
- When an entry has a settled outcome, move it to `Reviewed` with a one-line result that names the action taken or the reason no action is needed.
- Do not move entries that still need user choice, implementation, or follow-up research.

## Output

Return a concise prioritized list with:

- recommendation;
- evidence from `agent-opportunities.md` or repo files;
- external discovery result;
- proposed skill name or existing skill to update;
- next action.

If a recommendation is ready to build, tell the user to run `create-agent-skill` next for that specific skill.
