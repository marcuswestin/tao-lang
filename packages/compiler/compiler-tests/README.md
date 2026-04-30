# Compiler integration tests

These tests exercise the Tao pipeline (lex → parse → link → validate → typecheck) and related tooling. Repo workflows and agents: see [AGENTS.md](../../AGENTS.md).

## Pipeline stages and where to add tests

| Stage                 | Primary focus                              | Test files (current)                                                                                                           |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Lexing                | Tokens, lexer errors                       | [`1-test-lexer.test.ts`](1-test-lexer.test.ts)                                                                                 |
| Parsing / AST         | CST shape, grammar, `parseAST` / `Wrapped` | [`2-test-parser-*.test.ts`](.) — split from the former monolithic parser suite (see below)                                     |
| Linking / scope       | Cross-refs, scopes                         | `2-test-parser-scope-resolution.test.ts`, parts of parser suite                                                                |
| Modules               | Imports, exports, `share`, multi-file      | [`4-test-module-imports-exports.test.ts`](4-test-module-imports-exports.test.ts)                                               |
| Structural validation | Placement rules, `validationMessages`      | [`3-test-validation.test.ts`](3-test-validation.test.ts)                                                                       |
| Type system (Typir)   | Assignability, inference, call sites       | [`5-test-type-checking.test.ts`](5-test-type-checking.test.ts)                                                                 |
| Codegen               | Emitted TS/TSX shape                       | [`6-test-codegen-bindings.test.ts`](6-test-codegen-bindings.test.ts)                                                           |
| Source maps / LSP     | Traces, definitions                        | [`trace-to-source-map.test.ts`](trace-to-source-map.test.ts), [`TaoDefinitionProvider.test.ts`](TaoDefinitionProvider.test.ts) |

### Conventions

1. **One primary home per pipeline stage** — e.g. AST shape belongs in parser-split files; do not duplicate the same assertion under `3-test.validation` unless the test is specifically about diagnostics after full validation.
2. **Shared Tao snippets** — If the same source string appears in multiple packages (compiler, formatter, etc.), import from [`@shared/testing/tao-snippets`](../../shared/shared-src/testing/tao-snippets.ts) (exported via `@shared/testing`) instead of copying.
3. **Diagnostic assertions** — Prefer helpers in [`test-utils/diagnostics.ts`](test-utils/diagnostics.ts) so failures print **all** human messages (avoid silent `.some()` misses).

## Parser suite split (`2-test-parser-*.test.ts`)

The former monolithic `2-test-parser.test.ts` was split by `describe` block so each file maps to one mental model:

| File                                                                                                       | Topics                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`2-test-parser-parse.test.ts`](2-test-parser-parse.test.ts)                                               | Core parse: app, actions, `do`, templates   |
| [`2-test-parser-module-declaration.test.ts`](2-test-parser-module-declaration.test.ts)                     | `hide` / `share` / bare module visibility   |
| [`2-test-parser-alias-statements.test.ts`](2-test-parser-alias-statements.test.ts)                         | Aliases, string templates, interpolation    |
| [`2-test-parser-scope-resolution.test.ts`](2-test-parser-scope-resolution.test.ts)                         | `resolveReferences`                         |
| [`2-test-parser-alias-validation.test.ts`](2-test-parser-alias-validation.test.ts)                         | Duplicate / unresolved aliases              |
| [`2-test-parser-objects.test.ts`](2-test-parser-objects.test.ts)                                           | Objects, member access, `set`, nested paths |
| [`2-test-parser-struct-item-types.test.ts`](2-test-parser-struct-item-types.test.ts)                       | `type` struct syntax, typed literals        |
| [`2-test-parser-object-literal-vs-block.test.ts`](2-test-parser-object-literal-vs-block.test.ts)           | Grammar invariant: Block vs ObjectLiteral   |
| [`2-test-parser-local-parameter-types.test.ts`](2-test-parser-local-parameter-types.test.ts)               | Phase 1: `Title is text`                    |
| [`2-test-parser-dot-local-type-ref.test.ts`](2-test-parser-dot-local-type-ref.test.ts)                     | Phase 2: `.Title` shorthand                 |
| [`2-test-parser-action-local-parameter-types.test.ts`](2-test-parser-action-local-parameter-types.test.ts) | Phase 3: action locals + `do Bump .Step`    |

## Phase labels (local / dot-local / action locals)

| Phase | Meaning                                          | Parser AST                                 | Validation / types                                                    | Formatter / codegen                                                                     |
| ----- | ------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1     | Callable local parameter types (`Title is text`) | `localSuperType` on `ParameterDeclaration` | Structural + Typir                                                    | Formatter spacing for `is text`                                                         |
| 2     | Dot-local typed literals (`.Title "x"`)          | `DotLocalTypeRef`                          | Placement + assignability                                             | Preserve dot shorthand                                                                  |
| 3     | Action-local params + `do Bump .Step`            | Same as 1–2 under `action`                 | [`3-test-validation.test.ts`](3-test-validation.test.ts) Phase blocks | [`6-test-codegen-bindings.test.ts`](6-test-codegen-bindings.test.ts), formatter Phase 3 |

## Test utilities

- [`test-utils/test-harness.ts`](test-utils/test-harness.ts) — `parseTaoFully`, `parseAST`, `parseMultipleFiles`, `parseASTWithErrors`, etc.
- [`test-utils/diagnostics.ts`](test-utils/diagnostics.ts) — Assertions on `ParseError` / human messages.
- [`test-utils/AST-Wrapper.ts`](test-utils/AST-Wrapper.ts) — Fluent AST navigation in tests.
- [`../../shared/shared-src/testing/tao-snippets.ts`](../../shared/shared-src/testing/tao-snippets.ts) — Shared Tao source strings for compiler/formatter tests (`@shared/testing/tao-snippets`).
