# Commit all chunks

Commit all uncommitted changes in small, self-contained pieces, with an appropriate commit message for each piece.

- Make **no further changes** to the codebase—only commits. If you need a code change, ask first.
- Prefer the **smallest** self-contained commits first.

## Required flow

1. Run **`./just-agents prep-commit` once** first so the tree is green before batch commits.
2. Stage with `./just-agents shell git add <paths>`.
3. Commit each piece with **`./just-agents git-dangerously commit -m '<message>'`** (single-quoted `-m` body). This avoids running the full prep hook on every commit after the first green `prep-commit`.

Full policy (prep vs fast batch, message format, merge rules): **`tao-git-workflow`** skill.
