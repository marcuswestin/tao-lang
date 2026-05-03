---
name: langium-formatting
description: Implements or reviews Tao Langium formatter behavior with idempotent formatting, safe whitespace edits, and comment-aware CST handling.
---

# Langium Formatting

## When to use

- When editing Tao formatter rules.
- When adding syntax that needs formatting.
- When investigating formatter idempotence, comments, indentation, or syntax-error resilience.

## Steps

1. Read `references/langium-formatting.md` before changing formatter behavior.
2. Locate the AST node and direct children/tokens responsible for the formatting change.
3. Prefer formatting container interiors over manually indenting child nodes.
4. Avoid aggressive `noSpace()` before tokens that may have attached comments.
5. Add or update formatter tests for the intended behavior and idempotence.
6. Keep formatter logic stateless and resilient to partial ASTs.

## Validation

- Run `./just-agents test formatter` or a targeted formatter filter.
- Include an idempotence case when adding new formatting behavior.
