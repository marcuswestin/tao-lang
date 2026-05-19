# Agent Opportunities

Informal notes from agents and users about repo problems, workflow friction, repeated tasks, annoyances, unmet desires, and ideas for future skills or agent workflows.

Use this file for anything worth remembering that should not interrupt the current task. Keep entries short, but include enough context for a later agent to understand why a skill, workflow, utility, or cleanup might help.

Format new entries like this and put them at the top of `Open`:

```md
### YYYY-MM-DD - Brief description.

- Source/context: user quote, agent observation, command/output context, or task context.
- Why it matters: the practical cost, repeated annoyance, blocked workflow, or user preference it reveals.
- Possible follow-up: skill, workflow, utility, doc cleanup, repo fix, or investigation that may address it.
```

## Open

### 2026-05-12 - `./agent` sometimes reports stale `.devenv` files during read commands.

- Source/context: while running simple `./agent cat` and `./agent git diff` commands, devenv intermittently failed or warned about missing `.devenv/load-exports` and stale `.devenv/gc/shell`; rerunning the command succeeded.
- Why it matters: transient wrapper failures make agents lose confidence in read-only commands and can waste time on false debugging trails.
- Possible follow-up: wrapper-health or devenv-troubleshooting workflow that distinguishes transient devenv cache problems from real command failures.

### 2026-05-04 - `./agent prep-commit` can fail inside compiler `ts-autofix`.

- Source/context: saw `TypeError: context.host.getCompilationSettings is not a function` from `ts-autofix` during the compiler autofix step after the build phase passed.
- Why it matters: prep-commit is the required gate before commits, so an unstable autofix step blocks normal landing work.
- Possible follow-up: prep-commit-failure triage workflow or a direct fix in the compiler autofix integration.

### 2026-05-03 - `./agent fd` is listed in help but is not available.

- Source/context: `./agent help` listed `fd`, but the command was not available when agents tried to use it.
- Why it matters: stale command-surface documentation wastes time and makes the allowlist less trustworthy.
- Possible follow-up: agent-command-surface audit that verifies each listed read command exists in the devenv shell.

## Reviewed

Move fixed, obsolete, or intentionally deferred notes here with a short outcome.
