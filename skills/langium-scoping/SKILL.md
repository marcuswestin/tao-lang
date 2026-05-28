---
name: langium-scoping
description: Implements or reviews Tao Langium scoping, exported symbols, local symbols, imports, and reference resolution.
---

# Langium Scoping

## When to use

- When changing Tao name resolution, imports, exported symbols, local scope, or visibility.
- When adding grammar constructs that introduce or reference symbols.
- When investigating unresolved or incorrectly resolved references.

## Steps

1. Read `references/langium-scoping.md` before changing scoping behavior.
2. Decide whether the change affects exported symbols, local symbols, scope lookup, or module resolution.
3. Never access `.ref` during scope computation; linking happens after indexing.
4. Any grammar rule that can be referenced by cross-reference syntax must expose its key as `name`.
5. In IDE recovery parses, optional AST fields may be `undefined`; only call `createDescription` with a real name.
6. Keep client file extensions and Langium `fileExtensions` in sync, or the server can crash opening supported-looking files.
7. Build scope chains from local symbols, imports, and global/indexed symbols in explicit precedence order.
8. Add validation or resolution tests that build documents, not parse-only tests.
9. Keep visibility and import rules centralized in the existing resolution/scoping helpers.

## Validation

- Run targeted compiler tests for resolution and validation.
- Run `./agent check` for cross-package scoping changes.
