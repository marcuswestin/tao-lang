# `@tao/formatter`

Tao source code formatter using Langium's node-centric formatting model.

## Layout

- **`formatter.ts`** — package entry: re-exports `TaoFormatter` and `extensivelyFormatInjectionBlocks`
- **`formatter-src/`** — implementation
  - `TaoFormatter.ts` — Langium `AbstractFormatter` subclass with per-node formatting rules
  - `FormatterSDK.ts` — high-level `Formatter.formatFile` / `Formatter.formatCode` API
  - `injectionFormatter.ts` — post-processing pass that re-indents `inject` blocks
- **`formatter-tests/`** — Bun tests
  - `1-test-formatter.test.ts` — main formatter test suite (table-driven cases + edge cases)
  - `2-test-formatted-injection-blocks.test.ts` — injection block formatting tests
  - `formatter-test-utils.ts` — test DSL (`testFormatter`, `dedent`, `visualize`)

## Entry point

`formatter.ts` — imported as `@formatter/*` (path alias resolves to `formatter-src/*`).

## How to test

```sh
just formatter test
```

## Composite build note

The formatter is typechecked together with the compiler in the compiler's composite project (`compiler/tsconfig.json` includes `../formatter/formatter-src/**/*`). This avoids circular package references — both depend on the same Langium/parser surface. See [compiler/README.md](../compiler/README.md).
