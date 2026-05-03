---
name: convention-audit
description: Audits code or docs against Tao repo conventions, identifies pattern drift, and proposes concrete cleanup changes.
---

# Convention Audit

## When to use

- When the user asks whether current changes match repo conventions.
- When a refactor may have introduced inconsistent patterns.
- When deciding which cleanup changes should be made before implementation or commit.

## Steps

1. Establish scope: current diff by default, or the files/directories/topics named by the user.
2. Read the scoped material and adjacent canonical examples.
3. Identify the baseline pattern used elsewhere in the repo.
4. Identify deltas: aligned changes, intentional new patterns, accidental drift, duplication, or missing tests/docs.
5. Search for other locations matching the same pattern when consistency matters.
6. Present a concise list of proposed changes grouped by pattern.
7. Ask for approval before mutating files unless the user already asked to execute the audit results.

## Validation

- For read-only audits, no test run is required.
- For executed cleanup, run `./just-agents check` or the narrow package check that covers touched files.
