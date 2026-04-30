# `@tao/parser`

Langium grammar and generated AST for Tao Lang.

## Layout

- **`tao-grammar.langium`** — the Tao language grammar (source of truth for syntax)
- **`src/`** — hand-written parser modules (kept as `src/` rather than `parser-src/` because Langium CLI generates into `src/_gen-tao-parser/`)
  - `parser.ts` — package entry: re-exports `LGM` (Langium), `AST` (typed AST namespace), and `TaoTokenBuilder`
  - `parserASTExport.ts` — AST namespace: re-exports generated AST types plus Langium utility types under a single `AST` import
  - `tao-token-builder.ts` — multi-mode lexer (string templates with `${…}` interpolation)
  - `node.ts`, `lsp.ts`, `generate.ts` — thin Langium subsystem re-exports
  - `vscode-languageserver/index.ts` — aggregated LSP protocol re-exports
  - `_gen-tao-parser/` — **generated** (do not edit): AST types, module, grammar from `just gen`
- **`langium-config.json`** — Langium CLI configuration

## Entry point

`src/parser.ts` — imported as `@parser` via tsconfig paths.

## Testing

Parser has no local test files. Grammar correctness is verified through `packages/compiler/compiler-tests/` (stages 1-2: lexer and parser tests). This is intentional — the parser's only consumer is the compiler, so testing at the integration boundary is more valuable than unit-testing generated code.

## Regenerating

```sh
just gen
```

Or directly: `bunx langium generate --mode=development` from this directory.
