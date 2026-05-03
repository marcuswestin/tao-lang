---
name: typescript-style
description: Applies Tao TypeScript style for constructor properties, JSDoc, generated imports, shared abstractions, and inferred return types.
---

# TypeScript Style

## When to use

- When editing TypeScript source.
- When reviewing TypeScript style drift.
- When adding exported or shared functions/classes.

## Steps

1. Prefer TypeScript constructor parameter properties over manual `this.x = x` assignments for direct constructor storage.
2. Add single-line JSDoc to exported or shared functions: `/** fnName verbs description */`.
3. Prefer conventional acronym casing in new identifiers, such as `URL` and `HTTP`.
4. Use `@shared/*` abstractions when available.
5. Do not import generated files from main source code.
6. Use the inferred return type of function calls instead of redeclaring identical local types.

## Validation

- Run the narrow package check for touched TypeScript files, or `./just-agents check` for shared/cross-package changes.
