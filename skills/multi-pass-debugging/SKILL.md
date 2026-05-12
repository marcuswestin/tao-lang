---
name: multi-pass-debugging
description: Regroup when one bug has multiple failed or partial fixes. Use after 60-90 minutes of churn, repeated failure-shape changes, or when fixes are drifting into wrappers/shims instead of removing the cause.
---

# Multi-Pass Debugging

## When to use

- The same issue has consumed significant time with no stable fix.
- Two or more plausible fixes failed or only partially worked.
- The investigation is drifting across layers without a clear owner.
- Proposed fixes are mostly wrappers, env surgery, retries, or cleanup scripts.

## Workflow

1. Freeze and capture state in a short working note.
2. Record exact symptom, command, expected behavior, and constraints.
3. List attempted fixes with outcomes and rollback status.
4. Write 2-4 falsifiable hypotheses tied to a specific ownership layer.
5. Pick the smallest next experiment that can disprove one hypothesis.
6. Validate in a clean context (fresh shell/process or clean cache boundary).
7. Keep the winning fix, remove discarded shims, and update the note.

## Required note fields

- Problem statement
- Constraints/safety limits
- Attempt log
- Current verified facts
- Hypotheses and probes
- Next trial plus rollback

## Tao-specific guidance

- For iOS native build issues, check `skills/nix-devenv` before adding PATH/SDK wrappers.
- Prefer fixing the owner layer (devenv, Expo config, generated output, runtime startup) over adding cross-layer glue.
