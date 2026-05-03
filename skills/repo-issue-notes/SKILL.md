---
name: repo-issue-notes
description: Log unexpected Tao repo development issues, cleanup opportunities, speedups, flaky behavior, confusing docs, or workflow friction discovered during normal work. Use when a non-blocking problem should be remembered in agent-issues.md instead of interrupting the current task.
---

# Repo Issue Notes

Use this skill when an unexpected repo development issue comes up during another task.

## Steps

1. Decide whether the issue is worth remembering. Log it if another agent or cleanup pass could act on it later.
2. Do not stop the current task for non-blocking cleanup.
3. Read `agent-issues.md`.
4. Add a short entry at the top of `Open`.

## Entry Style

Use this shape:

```md
### YYYY-MM-DD - Brief description.

- Optional extra context needed to understand, reproduce, or fix it.
```

Keep entries informal and concise. A date and one sentence is enough when no extra context is needed.

## Cleanup Passes

When the task is to review or fix logged issues, read `Open`, pick a small related batch, verify the notes are still true, then move fixed or obsolete entries to `Reviewed` with a short outcome.
