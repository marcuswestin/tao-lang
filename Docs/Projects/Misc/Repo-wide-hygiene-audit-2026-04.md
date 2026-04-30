# Repo-wide cognitive simplification and hygiene audit

Read-only audit completed against the plan in `.cursor/plans/` (do not confuse with this file’s date). **Deliverable:** inventory, mechanical findings, per-package notes, and a **single prioritized backlog** (P0 / P1 / P2).

**Implemented:** Shared Tao test snippets were moved to [`packages/shared/shared-src/testing/tao-snippets.ts`](../../../packages/shared/shared-src/testing/tao-snippets.ts) (`@shared/testing/tao-snippets`); formatter `tsconfig` no longer includes `compiler-tests/fixtures`, and formatter tests import `@shared/testing/tao-snippets` instead of the compiler test tree.

**Scoring lens:** [AGENTS.md](../../../AGENTS.md) — DRY, one obvious entry point per use case, extend existing APIs, `@shared/*` over raw Node/Bun, JSDoc on exported helpers.

---

## Phase 0 — Map and inventory

Phase 0 answers: **who depends on whom** (npm + TypeScript), **where tests cross package lines**, and **how humans vs agents drive the repo**.

### Package graph (`packages/*/package.json`)

Most wiring is **TypeScript path aliases** ([`packages/tsconfig.base.json`](../../../packages/tsconfig.base.json)) and **composite `include` / `references`**, not always `workspace:*` entries in each `package.json`.

| Directory               | Declared `name`             | Notable declared deps (summary)                     | Primary role                                                                                                        |
| ----------------------- | --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `parser`                | `@tao/parser`               | `langium`, LSP types; dev `langium-cli`             | Grammar, AST codegen (`just gen` in package)                                                                        |
| `compiler`              | `@tao/compiler`             | `typir`, `typir-langium`, `@jridgewell/gen-mapping` | Validate, typecheck, codegen, LSP; exports [`tao-compiler.ts`](../../../packages/compiler/tao-compiler.ts)          |
| `formatter`             | `@tao/formatter`            | dev-only `@types/bun`, `typescript`                 | Formatter SDK; compiled with compiler/parser in composite ([compiler README](../../../packages/compiler/README.md)) |
| `tao-cli`               | `@tao/tao-cli`              | `commander`, `chokidar`, `picocolors`               | `tao` CLI binary build                                                                                              |
| `shared`                | `@tao/shared`               | `object-deep-merge`, commander typings              | `@shared/*` sources, Just includes, `scripts/`, testing helpers                                                     |
| `ide-extension`         | `tao-ide-extension`         | (extension manifest; runtime deps in full file)     | VS Code extension; `main` → `_gen-ide-extension/...`                                                                |
| `expo-runtime`          | `@tao/expo-runtime`         | Expo / RN stack, `jest-expo`                        | App shell + tests for compiled Tao                                                                                  |
| `headless-test-runtime` | `tao-headless-test-runtime` | RN + Jest + testing-library                         | Headless scenario tests; regen script                                                                               |
| `tao-std-lib`           | _(no `name` field)_         | RN peers only in snippet                            | Tao standard library **sources** consumed at compile time                                                           |

### Cross-package **test** and **fixture** coupling

**Snippets (resolved):** Canonical Tao strings live in [`shared/shared-src/testing/tao-snippets.ts`](../../../packages/shared/shared-src/testing/tao-snippets.ts). Compiler and formatter tests import `@shared/testing/tao-snippets`; [`formatter/tsconfig.json`](../../../packages/formatter/tsconfig.json) no longer includes `../compiler/compiler-tests/fixtures/**`.

**Historical note:** Previously [`formatter/formatter-tests/1-test-formatter.test.ts`](../../../packages/formatter/formatter-tests/1-test-formatter.test.ts) imported from `compiler/compiler-tests/fixtures/snippets.ts` and formatter `tsconfig` included that tree — that coupling is removed.

No other first-party package imports another package’s **test tree** in the original grep pass (aside from the former snippets path, now fixed).

### Automation map

**Include graph:** root [`Justfile`](../../../Justfile) → [`packages/shared/just/all-imports.just`](../../../packages/shared/just/all-imports.just), which pulls in (in order) [`_shared-vars.just`](../../../packages/shared/just/_shared-vars.just), [`deps-helpers.just`](../../../packages/shared/just/deps-helpers.just), [`setups.just`](../../../packages/shared/just/setups.just), [`ps-grep-and-filter.just`](../../../packages/shared/just/ps-grep-and-filter.just), [`dev-cmds.just`](../../../packages/shared/just/dev-cmds.just), [`fix-fmt-check.just`](../../../packages/shared/just/fix-fmt-check.just), [`dev-watch.just`](../../../packages/shared/just/dev-watch.just), [`parallel-and-concurrent.just`](../../../packages/shared/just/parallel-and-concurrent.just).

**Human entry (`Justfile`):**

- `test *FILTER`: **`gen`** then `bun test`, then `just headless-test-runtime test`, then `expo-runtime` tests ([`Justfile`](../../../Justfile) ~51–55).
- `check`: `build` then `_check` (lint/typecheck stack in shared just).
- `gen`: respects `TAO_SKIP_GEN=1` — skips `(cd packages/parser && just gen)` when set (~107–109).
- `build`: `just _build_all` (see below).
- Package shims: `parser`, `compiler`, `formatter`, `expo-runtime`, `headless-test-runtime`, `ide-extension`, `shared`, `cli`, `tao`, `q-dev`, etc.

**`_build_all`** ([`dev-cmds.just`](../../../packages/shared/just/dev-cmds.just) `_build_all`): `TAO_DEPS_BATCHED=1` → shared → parser → formatter → compiler → tao-cli → headless-test-runtime → expo-runtime → ide-extension with `TAO_SKIP_COMPILER_BUILD=1` for package build/install. This is the **authoritative build order** for “what runs before what.”

**Agent entry ([`just-agents.Justfile`](../../../just-agents.Justfile)):** forwards `fmt`, `fix`, `prep-commit`, `test`, `lint`, `check`, `gen`, `build`, `clean`, and per-package recipes to the **same** root `Justfile` via `MAIN_JUSTFILE := "--justfile Justfile"`. Adds `shell` (whitelisted commands per `ALLOWED_SHELL_COMMANDS`) and `git-dangerously` (raw git; policy in file comments).

**`prep-commit`:** `_prep_commit` runs `just clean` → `just build` → `TAO_SKIP_GEN=1 just test` → `just _check` → `just fix` (see comments in [`dev-cmds.just`](../../../packages/shared/just/dev-cmds.just) ~19–27).

---

## Phase 1 — Mechanical scans

Repeatable grep pass over `packages/**` (treat `expo-runtime/node_modules` as third-party noise). Each subsection lists **what was searched**, **counts or line anchors**, and **2–3 exemplars** where useful.

### `getHumanErrorMessages` (plural) — call sites

| File                                                                                                                                       | Line(s)                      | Role                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [`parse-errors.ts`](../../../packages/compiler/compiler-src/validation/parse-errors.ts)                                                    | type field; ~113, 122        | Implementation                                                                                                                |
| [`diagnostics.ts`](../../../packages/compiler/compiler-tests/test-utils/diagnostics.ts)                                                    | 4, 9, 20, 43                 | Shared test assertions                                                                                                        |
| [`2-test-parser-parse.test.ts`](../../../packages/compiler/compiler-tests/2-test-parser-parse.test.ts)                                     | 39                           | `join('\n')` then `toContain('Could not resolve reference')`                                                                  |
| [`2-test-parser-objects.test.ts`](../../../packages/compiler/compiler-tests/2-test-parser-objects.test.ts)                                 | 157                          | non-empty joined messages via `.length`                                                                                       |
| [`2-test-parser-object-literal-vs-block.test.ts`](../../../packages/compiler/compiler-tests/2-test-parser-object-literal-vs-block.test.ts) | 84, 94                       | same “length” pattern twice                                                                                                   |
| [`3-test.validation.test.ts`](../../../packages/compiler/compiler-tests/3-test.validation.test.ts)                                         | 332, 410, 420, 788, 804, 822 | `.length`, `.some`, messages next to inline `parseString`                                                                     |
| [`5-test-type-checking.test.ts`](../../../packages/compiler/compiler-tests/5-test-type-checking.test.ts)                                   | 94, 123, 144, 155, 176, 188  | manual `messages` (file also imports [`diagnostics.ts`](../../../packages/compiler/compiler-tests/test-utils/diagnostics.ts)) |

**`import … from './test-utils/diagnostics'`:** only [`3-test.validation.test.ts`](../../../packages/compiler/compiler-tests/3-test.validation.test.ts) and [`5-test-type-checking.test.ts`](../../../packages/compiler/compiler-tests/5-test-type-checking.test.ts). **Five** other compiler test files in the table still hand-roll plural-message checks.

### `getHumanErrorMessage` (singular) — related pattern

`getHumanErrorMessage()` returns one joined string; tests use `.toContain(...)` heavily without going through [`diagnostics.ts`](../../../packages/compiler/compiler-tests/test-utils/diagnostics.ts). Notable clusters:

- [`2-test-parser-alias-validation.test.ts`](../../../packages/compiler/compiler-tests/2-test-parser-alias-validation.test.ts) — lines ~11, 34, 43 (`Duplicate identifier`, `Could not resolve reference`).
- [`4-test-module-imports-exports.test.ts`](../../../packages/compiler/compiler-tests/4-test-module-imports-exports.test.ts) — many `.toContain` checks (~131 through ~856).
- [`6-test-codegen-bindings.test.ts`](../../../packages/compiler/compiler-tests/6-test-codegen-bindings.test.ts) — compile failure path ~22.

**Adoption gap:** where the intent is “substring appears in **some** human line”, prefer `expectHumanMessagesContain` / `expectAnyHumanMessageSubstring` on `ParseError` (extend `diagnostics.ts` if a needle repeats).

### Direct `TaoParser.parseString` outside harness

| File                                                                                               | Line(s)        | Notes                                                                                                   |
| -------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| [`test-harness.ts`](../../../packages/compiler/compiler-tests/test-utils/test-harness.ts)          | 23, 54, 65, 86 | **Canonical**                                                                                           |
| [`1-test-lexer.test.ts`](../../../packages/compiler/compiler-tests/1-test-lexer.test.ts)           | 56, 72         | Truncated / unterminated source — **reasonable** exception                                              |
| [`3-test.validation.test.ts`](../../../packages/compiler/compiler-tests/3-test.validation.test.ts) | 794–803        | Inline `validateUpToStage: 'all'` — align with `parseASTWithErrors` + same style as test above ~780–791 |

**Test-side call sites outside harness:** 3 (lexer ×2, validation ×1).

### Stub / placeholder tests

Pattern: `test('stub test', () => expect(true).toBe(true))` — **6 first-party files:**

1. [`2-test-parser-parse.test.ts`](../../../packages/compiler/compiler-tests/2-test-parser-parse.test.ts)
2. [`3-test.validation.test.ts`](../../../packages/compiler/compiler-tests/3-test.validation.test.ts)
3. [`1-test-formatter.test.ts`](../../../packages/formatter/formatter-tests/1-test-formatter.test.ts)
4. [`test-tao-cli.test.ts`](../../../packages/tao-cli/cli-tests/test-tao-cli.test.ts)
5. [`test-ide-extension.test.ts`](../../../packages/ide-extension/extension-tests/test-ide-extension.test.ts)
6. [`test-shared.test.ts`](../../../packages/shared/shared-tests/test-shared.test.ts)

Ignore `packages/expo-runtime/node_modules/**`.

### TODO / FIXME (`packages/**/*.ts`, `*.tsx`)

**`packages/shared/just/*.just`:** no `TODO` / `FIXME` in this pass.

**TypeScript / TSX (exemplar table):**

| File                                                                                                                                                                                        | Note                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`formatter-test-utils.ts`](../../../packages/formatter/formatter-tests/formatter-test-utils.ts)                                                                                            | Newline / `trimEnd()` — assertion fidelity                               |
| [`gen-ide-syntax-files.ts`](../../../packages/shared/scripts/commands/gen-ide-syntax-files.ts)                                                                                              | Renamed from `gen-syntax-tmLanguage-files` (merge + markdown-embed copy) |
| [`Log.ts`](../../../packages/shared/shared-src/Log.ts), [`TaoErrors.ts`](../../../packages/shared/shared-src/TaoErrors.ts)                                                                  | Small API TODOs                                                          |
| [`tao-cli-main.ts`](../../../packages/tao-cli/cli-src/tao-cli-main.ts)                                                                                                                      | Watch / module graph                                                     |
| [`ValidationReporter.ts`](../../../packages/compiler/compiler-src/validation/ValidationReporter.ts), [`runtime-gen.ts`](../../../packages/compiler/compiler-src/codegen/app/runtime-gen.ts) | Product cleanup                                                          |
| [`codegen-util.ts`](../../../packages/compiler/compiler-src/codegen/codegen-util.ts) `compileTODO`                                                                                          | Placeholder emission (name contains `TODO`)                              |
| [`tao-runtime.ts`](../../../packages/tao-std-lib/tao/tao-runtime/tao-runtime.ts), [`runtime-utils.ts`](../../../packages/tao-std-lib/tao/tao-runtime/runtime-utils.ts)                      | `@tao/ui` / `@shared` deps                                               |
| [`app/index.tsx`](../../../packages/expo-runtime/app/index.tsx)                                                                                                                             | Generated-app guard                                                      |

Hygiene-first: formatter newline TODO + script rename; rest = product backlog.

### Generated imports in `compiler-src`

- Pattern `@parser/_gen-tao-parser` under `packages/compiler/compiler-src/**/*.ts`: **0 matches** ([AGENTS.md](../../../AGENTS.md)).

### Export helpers — JSDoc (AGENTS)

- [`test-harness.ts`](../../../packages/compiler/compiler-tests/test-utils/test-harness.ts): exported parse helpers use `/** … */` one-liners.
- [`AST-Wrapper.ts`](../../../packages/compiler/compiler-tests/test-utils/AST-Wrapper.ts): exported `wrap` uses a `//` block comment only — **add** `/** wrap … */` when next editing.

### Large / outlier test files

- [`1-test-formatter.test.ts`](../../../packages/formatter/formatter-tests/1-test-formatter.test.ts): **~765 lines** (last block ends ~764–765) — primary outlier for table-driven refactors.
- Compiler parser-split files: rank by line count in-editor if you need the next cut candidates.

---

## Phase 2 — Per-package cognitive notes

1. **`@tao/parser`** — Single responsibility: grammar + codegen via `just gen`. Mental model: Langium types and `AST.is*`.
2. **`@tao/compiler`** — [`compiler-src/`](../../../packages/compiler/compiler-src/) vs tests documented in [`compiler/README.md`](../../../packages/compiler/README.md) and [`compiler-tests/README.md`](../../../packages/compiler/compiler-tests/README.md). Entry: `tao-compiler.ts` exports. Validator/codegen contract: see [compiler-validator-codegen-contract SKILL](../../../.cursor/skills/compiler-validator-codegen-contract/SKILL.md).
3. **`@tao/formatter`** — `FormatterSDK`; composite typecheck intentionally bundles compiler/parser ([README](../../../packages/compiler/README.md)). ~~Formatter tests reached into compiler test fixtures~~ — snippets now `@shared/testing/tao-snippets` (Phase 0).
4. **`@tao/tao-cli`** — Thin orchestration; TODO in `tao-cli-main.ts` about module graph for watch — future simplification of dev UX.
5. **`tao-ide-extension`** — Generated `_gen-ide-extension`; syntaxes under `ide-syntaxes/_gen-syntaxes/`.
6. **`expo-runtime`** — Own `tsconfig` (Expo base + strict); paths to `@shared`; excludes `_gen-runtime-tests`.
7. **`headless-test-runtime`** — [`regenerate-headless-test-apps.ts`](../../../packages/headless-test-runtime/scripts/regenerate-headless-test-apps.ts) is a thin wrapper; real logic in [`headless-compile.ts`](../../../packages/headless-test-runtime/src/headless-compile.ts) (`regenerateAllHeadlessScenarioOutputs`, `compileTaoForHeadlessRuntime`).
8. **`shared`** — `@shared/testing` barrel ([`shared-src/testing/index.ts`](../../../packages/shared/shared-src/testing/index.ts)); Just recipes centralized under `packages/shared/just/`.

---

## Phase 3 — Test helpers and fewer lines per test

**Existing assets (prefer extending):**

- [`test-harness.ts`](../../../packages/compiler/compiler-tests/test-utils/test-harness.ts) — stages, `parseMultipleFiles`, workspace exposure.
- [`diagnostics.ts`](../../../packages/compiler/compiler-tests/test-utils/diagnostics.ts) — human-message assertions with full dump on failure.
- [`AST-Wrapper.ts`](../../../packages/compiler/compiler-tests/test-utils/AST-Wrapper.ts) — fluent navigation.
- [`@shared/testing/tao-snippets`](../../../packages/shared/shared-src/testing/tao-snippets.ts) — cross-suite Tao strings (see [`compiler-tests/README.md`](../../../packages/compiler/compiler-tests/README.md)).
- [`formatter-test-utils.ts`](../../../packages/formatter/formatter-tests/formatter-test-utils.ts) — `testFormatter('…').format(…).equals(…)`.

**Recommendations:**

1. Migrate **error assertions** in `2-test-parser-parse`, `2-test-parser-objects`, `2-test-parser-object-literal-vs-block` to `diagnostics.ts` (or add one thin helper, e.g. `expectSomeHumanMessage`, exported from the same module — **extend**, don’t fork).
2. For **“Could not resolve reference”** and similar repeated needles, add a named helper in `diagnostics.ts` if more than two call sites need it (keeps tests one-liners).
3. **Formatter:** extract rows `{ title, raw, expected }[]` + one loop where cases are uniform; keep `testFormatter` DSL for readability.
4. **Snippets:** ~~move~~ **done** — [`tao-snippets.ts`](../../../packages/shared/shared-src/testing/tao-snippets.ts) under `@shared/testing`.

---

## Phase 4 — Style and config consistency

- **Strictness:** [`packages/tsconfig.base.json`](../../../packages/tsconfig.base.json) sets `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, etc. [`packages/shared/tsconfig.json`](../../../packages/shared/tsconfig.json) extends `tsconfig.dev.json` and sets `composite: false` / `noEmit: true` — intentional for scripts + tests; document if newcomers ask why shared differs from compiler composite.
- **Formatter `tsconfig`:** broader includes (compiler `compiler-src` + fixtures) — matches composite story; increases IDE surface — acceptable if documented ([compiler README](../../../packages/compiler/README.md) already explains formatter inclusion in compiler; formatter README could mirror one sentence).
- **`bun:test` imports:** compiler tests often import `describe`/`expect`/`test` from `./test-utils/test-harness`; formatter utilities import `bun:test` directly — **document as intentional** (harness is compiler-specific) or re-export a tiny `describe`/`test` from formatter-test-utils for consistency (low priority).

---

## Phase 5 — Automation quality

- **`prep-commit`:** Order and `TAO_SKIP_GEN=1` rationale are clear in `_prep_commit` comments.
- **`just test` (root):** Runs `gen`, then `bun test`, then `headless-test-runtime test`, then `expo-runtime` tests — high-level flow is discoverable from [`Justfile`](../../../Justfile) lines 51–55.
- **Headless regen:** Output anchored under `.builds/headless-test-runtime/_gen-runtime-tests` to avoid watch loops ([`headless-compile.ts`](../../../packages/headless-test-runtime/src/headless-compile.ts)); scenario discovery via `@shared/testing` — good separation.
- **Just includes:** `all-imports.just` bundles many concerns; **optional** future simplification is a **table of recipes** in `packages/shared/just/README.md` (human-only doc) listing which file defines which public recipe — reduces “where is `_prep_commit`?” searches.

---

## Phase 6 — Prioritized backlog

### P0 (blockers / correctness risk)

_No P0 items identified in this read-only pass._ (If `formatter-test-utils` newline TODO ever masked a real regression, promote after reproduction.)

### P1 (high impact on cognition / DRY / boundaries)

| Item                                                          | Why it hurts                                                       | Primary files                                                                                                         | Direction                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| ~~Formatter tests depend on compiler **test** tree~~ **Done** | Was: formatter imported `compiler-tests/fixtures/snippets`         | `formatter/formatter-tests/1-test-formatter.test.ts`, `formatter/tsconfig.json` → `@shared/testing/tao-snippets`      | Implemented                                                               |
| `diagnostics.ts` underused                                    | Duplicate plural / singular message checks; worse failure messages | Parser tests above; also `2-test-parser-alias-validation`, `4-test-module-imports-exports`, `6-test-codegen-bindings` | Use `expectHumanMessagesContain` (and thin wrappers for repeated needles) |
| Huge formatter test file                                      | Hard to navigate; duplicate formatting for similar cases           | `formatter-tests/1-test-formatter.test.ts`                                                                            | Table-driven cases + keep `testFormatter` DSL                             |
| Direct `TaoParser.parseString` in validation suite            | Two ways to drive the pipeline                                     | `3-test.validation.test.ts`                                                                                           | Prefer harness or document “only here because …” in file header           |

### P2 (style, cleanup, docs)

| Item                            | Why it hurts                             | Primary files                                                                          | Direction                                                               |
| ------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Stub tests in many packages     | Noise in test output; no signal          | Six `*.test.ts` files listed in Phase 1                                                | Remove or replace with minimal smoke (e.g. one import/exec per package) |
| Formatter newline TODO          | Possible assertion drift                 | `formatter-tests/formatter-test-utils.ts`                                              | Fix TaoFile newline behavior; drop `trimEnd` hacks                      |
| ~~Script rename TODO~~ **Done** | Discoverability                          | `gen-ide-syntax-files.ts`, `q-dev.ts` `gen-ide-syntax-files`, `ide-extension/Justfile` | Renamed + call sites updated                                            |
| Just recipe discoverability     | New contributors grep many `.just` files | `packages/shared/just/*.just`                                                          | Optional `README.md` index of recipes                                   |

---

## Success criteria (met if you can answer)

1. **Where do shared Tao test strings live?** — [`packages/shared/shared-src/testing/tao-snippets.ts`](../../../packages/shared/shared-src/testing/tao-snippets.ts) (`import from '@shared/testing/tao-snippets'`).
2. **What is the one parse helper per stage?** — [`test-harness.ts`](../../../packages/compiler/compiler-tests/test-utils/test-harness.ts): `lexTokens`, `parseAST`, `resolveReferences`, `parseTaoFully`, `parseASTWithErrors`, `parseMultipleFiles`.
3. **What automates gen vs test?** — Root `just test` always runs `gen` first; `prep-commit` runs full `just build` (includes gen) then `TAO_SKIP_GEN=1 just test`.

---

## Optional follow-ups

- [`.cursor/skills/check-for-improvements/SKILL.md`](../../../.cursor/skills/check-for-improvements/SKILL.md) on a dirty tree before commit.
- [`.cursor/skills/extrapolate-updates/SKILL.md`](../../../.cursor/skills/extrapolate-updates/SKILL.md) after choosing snippet location or diagnostic pattern.
