---
name: compiler-validator-codegen-contract
description: Guides Tao Lang compiler work so semantic and type-shape rules live in the validator first, then codegen trusts that contract—prefer assertions and direct AST handling over defensive branches. Use when implementing or extending compiler features (validation, codegen, runtime emission), when the user asks to add checks “in the compiler,” or when reviewing codegen for redundant runtime guards that belong in validation.
---

# Compiler: validator owns truth; codegen trusts it

## Contract

1. **Validator first** — Put compile-time rules in `packages/compiler` validation (including type-shape / usage checks appropriate to the current language). If the grammar accepts a construct, the validator decides whether it is **compile-appropriate** for this pipeline.
2. **Codegen assumes success** — Code generation runs only after validation. Treat the document as **already validated**: do not re-implement the same semantic checks in the generator “just in case.”
3. **Prefer hard failures over soft fallbacks** — When an invariant should never hold after validation, use **`assert` / `Assert.*` / non-null assertions** (per project norms) and narrow types rather than returning placeholders or swallowing errors.
4. **Tests** — Add or extend **validator** tests for new rules; add **codegen** tests that assume valid inputs (or that invalid inputs are rejected earlier), per `AGENTS.md` dev notes.

## Do

- Express “this must be true to compile” once, in validation.
- In codegen, **narrow** (`if`/`switch` that TypeScript understands) when the grammar is wider than the validated subset; the remaining branch can `assert` unreachable.
- Use shortcuts: non-null access, exhaustive `switch` with default `assertNever`, early `assert` on unexpected enum/union cases.

## Don’t

- Duplicate validator logic in codegen (e.g. re-checking optional fields the validator already required).
- Broad `try`/`catch` or vague “invalid AST” branches for states the validator forbids.
- User-facing error messages inside codegen for cases validation should already reject (keep codegen lean).

## When validation is intentionally partial

If a path is **deliberately** reachable without full validation (e.g. internal helper, partial pipeline, WIP feature), **document that locally** and keep the guard minimal and accurate—do not use that escape hatch to avoid adding a proper validator rule for real user-authored syntax.
