# `@tao/compiler`

Validator, Typir-backed type checker, codegen, and Langium services for Tao Lang.

## Layout

- **`compiler-src/`** — implementation (non-generated). The name avoids clashing with other `src` trees when multiple packages are opened in one editor workspace.
- **`compiler-tests/`** — Bun tests; see [compiler-tests/README.md](compiler-tests/README.md) for pipeline stages and the parser suite split.
- **`tao-compiler.ts`** — package entry used by the CLI and composite builds.

## Why does `tsconfig.json` include the formatter?

[`tsconfig.json`](tsconfig.json) lists `../formatter/formatter.ts` and `../formatter/src/**/*` under `include` so this **composite** project typechecks the formatter together with the compiler. Both depend on the same Langium/parser surface; building them in one TypeScript project avoids circular package references and keeps a single place for `tsc -b` until formatter is split into its own composite boundary with explicit project references.

## Regenerating the parser

Parser codegen is driven from the repo root (`just gen`). Package `just test` / `just build` for the compiler typically runs `gen` first so tests never run against a stale grammar.
