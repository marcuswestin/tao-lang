# Agent Issues

Informal notes from agents about repo problems, cleanup opportunities, speedups, and workflow friction.

Add a note when something is worth remembering but should not interrupt the current task. Keep it short.

Format:

- `YYYY-MM-DD - Description of the problem or opportunity.`
- Add optional follow-up bullets only when they help explain, reproduce, or fix it.
- Put new notes at the top of `Open`.

## Open

### 2026-05-12 - `./agent` sometimes reports stale `.devenv` files during read commands.

- While running simple `./agent cat`/`./agent git diff` commands, devenv intermittently failed or warned about missing `.devenv/load-exports` and stale `.devenv/gc/shell`; rerunning the command succeeded.

## Reviewed

Move fixed or obsolete notes here with a short outcome.
