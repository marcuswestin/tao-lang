---
name: auto-research-plan-with-agents
description: Automatically iterate Tao project research and project-plan drafting by asking local Codex and Claude agents batches of questions, comparing their answers, updating research and plan docs, and repeating until implementation decisions are settled.
---

# Auto Research And Plan With Agents

## When To Use

- When the user wants Tao project research or planning to proceed without a user interview.
- When the user asks to ask local LM agents, Codex and Claude, instead of asking the user one question at a time.
- When converting an incomplete project research doc into a research-backed project plan through repeated agent consultation.

## Sources

Read:

1. `CORE_TENETS.md`
2. `Docs/Tao Project Roadmap.md`
3. The target `Docs/Projects/<Project Name> Project Research.md`
4. Relevant Tao specs, project docs, std-lib/runtime files, and TODOs
5. `skills/project-2-research-project/SKILL.md`
6. `skills/project-3-write-project-plan/SKILL.md`

## Workflow

1. Create a long question batch that covers scope, semantics, implementation strategy, validation, risks, non-goals, and unresolved design choices.
2. Ask both local LM agents the same question batch with `bash skills/auto-research-plan-with-agents/scripts/ask-local-agents.sh`.
3. Read both responses and decide what to accept, reject, defer, or re-question. Do not mechanically average their answers.
4. Update the research doc with decisions, alternatives, unresolved questions, and planning inputs.
5. Draft or update the project plan using the `project-3-write-project-plan` structure.
6. Create a new question batch focused on remaining gaps, contradictions, implementation sequencing, and validation.
7. Repeat agent consultation and doc updates until the plan is implementation-ready.
8. Update `Docs/Tao Project Roadmap.md` with the plan link and status `Planned` when the plan is ready.
9. Do not implement the project plan during this workflow.

## Agent Prompting Rules

- Ask both agents the same prompt in each round.
- Include the current research doc, current plan doc if it exists, roadmap excerpt, and relevant local context.
- Tell the agents to answer with decisions, rationale, risks, and concrete plan changes.
- Tell the agents to be brief and focus on the most important points, not to perform a thorough deep dive into every possible issue.
- Use the helper's pinned Claude default, `opus-4.8`. Do not use a floating `opus` alias or another Claude model unless the user explicitly changes the model.
- Prefer broad first-round questions and narrow later rounds.
- Save artifact paths from each round in the research doc or final report.
- If one agent fails, use the successful response only when it is enough; otherwise rerun a narrower prompt.
- If both local CLIs fail or an unsandboxed rerun is blocked because it would export private repository context, record the artifact path and failure reason. Do not invent agent feedback or route the same prompt through another external channel as a workaround; continue only with clearly labeled local synthesis or stop for user approval.

## Script

Use:

```sh
bash skills/auto-research-plan-with-agents/scripts/ask-local-agents.sh \
  --slug beautiful-app-defaults-round-1 \
  --prompt /private/tmp/beautiful-app-defaults-round-1-prompt.md
```

The script follows the same local CLI conventions as `skills/project-4-review-project-plan/scripts/project-review.sh`: artifacts are written under `/private/tmp/tao-project-reviews/` by default, with a `pass-1/` directory containing `prompt.md`, `codex-review.md`, `claude-review.md`, stderr files, `status.env`, and `combined-review.md`.

Environment:

- `CODEX_CMD`: Codex CLI command, default `codex`
- `CODEX_MODEL`: optional Codex model
- `CLAUDE_CMD`: Claude CLI command, default `claude`
- `CLAUDE_MODEL`: Claude model, default `opus-4.8`
- `REVIEW_TIMEOUT_SECONDS`: timeout per local agent, default `600`
- `PROJECT_REVIEW_DIR`: artifact root, default `/private/tmp/tao-project-reviews`

## Output

Report:

- research doc path;
- plan doc path;
- roadmap update;
- local agent artifact directories;
- key decisions made from comparing both agents;
- next skill to run: `project-4-review-project-plan`.

## Validation

- Run `./agent dprint check --incremental=false`.
- Run `./agent git diff --check`.
- Do not run code tests for docs-only planning unless implementation files changed.
