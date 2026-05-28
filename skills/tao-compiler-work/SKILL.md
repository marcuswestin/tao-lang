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
5. Use `AST.is*` guards directly for optional AST values; generated guards return false for `null` and `undefined`.
6. Use `name` for grammar properties that can be referenced.
7. For UI/app-runtime features, verify the React Native/Expo target surface first. Unsupported behavior must become a validation error, a deliberate runtime error, or a clearly named Tao runtime helper instead of ad hoc generated code.
8. Update formatter behavior and tests when syntax shape changes.
9. Prefer runtime helpers for language constructs when a construct has reusable runtime semantics. Codegen should pass compiled operands, callbacks, or flags into a clearly named `TR.*` helper instead of expanding the construct’s full behavior inline at every call site.
10. Feature new language/runtime behavior in at least one `Apps/Test Apps/` app.

## Validation

- Run the narrow compiler/formatter tests first, such as `./agent test compiler` or `./agent test formatter`.
- Run broader checks with `./agent check` before handoff when behavior is cross-package.
