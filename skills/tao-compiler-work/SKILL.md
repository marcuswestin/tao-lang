---
name: tao-compiler-work
description: Guides Tao parser, validator, formatter, compiler, and runtime emission work so semantic rules live in validation and codegen stays lean.
---

# Tao Compiler Work

## When to use

- When changing Tao grammar, validation, resolution, formatting, codegen, or runtime emission.
- When adding a language feature.
- When reviewing compiler code for duplicate validation or defensive codegen.

## Steps

1. Read the grammar, validator, formatter, and codegen paths affected by the feature.
2. Put user-facing semantic/type-shape rules in validation first.
3. Let codegen assume validation already ran; use assertions for states that should be unreachable after validation.
4. Prefer exhaustive `switch_safe` dispatch for grammar unions and single `AST.is*` checks for concrete type checks.
5. Use `name` for grammar properties that can be referenced.
6. Update formatter behavior and tests when syntax shape changes.
7. Feature new language/runtime behavior in at least one `Apps/Test Apps/` app.

## Validation

- Run the narrow compiler/formatter tests first, such as `./just-agents test compiler` or `./just-agents test formatter`.
- Run broader checks with `./just-agents check` before handoff when behavior is cross-package.
