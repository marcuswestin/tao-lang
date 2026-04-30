# Repo-wide cognitive simplification and hygiene audit

Read-only audit completed against the plan in `.cursor/plans/` (do not confuse with this file’s date). **Deliverable:** inventory, mechanical findings, per-package notes, and a **single prioritized backlog** (P0 / P1 / P2).

**Scoring lens:** [AGENTS.md](../../../AGENTS.md) — DRY, one obvious entry point per use case, extend existing APIs, `@shared/*` over raw Node/Bun, JSDoc on exported helpers.

---

## Phase 0 — Map and inventory

### Packages (workspace)

| Package                          | npm `name`          | Role                                                                                                                |
| -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `packages/parser`                | `@tao/parser`       | Langium grammar, generated AST, `langium-cli`                                                                       |
| `packages/compiler`              | `@tao/compiler`     | Validator, typecheck, codegen, LSP services; barrel [`tao-compiler.ts`](../../../packages/compiler/tao-compiler.ts) |
| `packages/formatter`             | `@tao/formatter`    | Formatter SDK; typecheck composite includes compiler + parser + shared                                              |
| `packages/tao-cli`               | `@tao/tao-cli`      | CLI (`tao`); Commander + chokidar; peers TypeScript                                                                 |
| `packages/tao-std-lib`           | (tao std)           | Standard library sources for apps                                                                                   |
| `packages/ide-extension`         | `tao-ide-extension` | VS Code extension; build uses `TAO_SKIP_COMPILER_BUILD=1` in prep chain                                             |
| `packages/expo-runtime`          | (Expo harness)      | Compiled Tao app runtime + tests                                                                                    |
| `packages/headless-test-runtime` | —                   | Jest harness, scenario compile to `.builds/`                                                                        |
| `packages/shared`                | `@shared` (paths)   | FS, testing SDKs, Just includes, scripts                                                                            |

Cross-package **test** coupling:

- [`packages/formatter/formatter-tests/1-test-formatter.test.ts`](../../../packages/formatter/formatter-tests/1-test-formatter.test.ts) imports [`packages/compiler/compiler-tests/fixtures/snippets.ts`](../../../packages/compiler/compiler-tests/fixtures/snippets.ts).
- [`packages/formatter/tsconfig.json`](../../../packages/formatter/tsconfig.json) explicitly includes `../compiler/compiler-tests/fixtures/**/*.ts`.

### Automation map

- **Humans:** root [`Justfile`](../../../Justfile) → imports [`packages/shared/just/all-imports.just`](../../../packages/shared/just/all-imports.just) (`dev-cmds`, `setups`, `fix-fmt-check`, `dev-watch`, `parallel-and-concurrent`, etc.).
- **Agents:** [`just-agents.Justfile`](../../../just-agents.Justfile) forwards to the same root recipes (`prep-commit`, `test`, `build`, `gen`, …).
- **`prep-commit`** ([`packages/shared/just/dev-cmds.just`](../../../packages/shared/just/dev-cmds.just) `_prep_commit`): `just clean` → `just build` → `TAO_SKIP_GEN=1 just test` → `just _check` → `just fix`. Comments document why tests skip regen after a full build.

---

## Phase 1 — Mechanical scans

### `getHumanErrorMessages` / manual message handling

- Occurrences in `packages/**/*.ts` (excluding `node_modules`): **parse-errors.ts** (implementation), **diagnostics.ts** (helpers), and tests: `2-test-parser-parse`, `2-test-parser-objects`, `2-test-parser-object-literal-vs-block`, `3-test.validation`, `5-test-type-checking`.
- **Imports of `diagnostics.ts`:** only [`3-test.validation.test.ts`](../../../packages/compiler/compiler-tests/3-test.validation.test.ts) and [`5-test-type-checking.test.ts`](../../../packages/compiler/compiler-tests/5-test-type-checking.test.ts).

**Gap:** parser-focused tests still hand-roll `getHumanErrorMessages().join('\n')` or `.length` checks instead of `expectHumanMessagesContain` / `expectSomeHumanMessageSatisfies`.

### Direct `TaoParser.parseString` outside harness

| Location                                                                                                | Notes                                                                                        |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`test-harness.ts`](../../../packages/compiler/compiler-tests/test-utils/test-harness.ts)               | Canonical — keep                                                                             |
| [`1-test-lexer.test.ts`](../../../packages/compiler/compiler-tests/1-test-lexer.test.ts)                | Lexer-edge cases (truncated input); reasonable exception                                     |
| [`3-test.validation.test.ts`](../../../packages/compiler/compiler-tests/3-test.validation.test.ts) ~794 | At least one direct call — check if it could use `parseMultipleFiles` / harness with options |

### Stub / placeholder tests

`test('stub test', () => expect(true).toBe(true))` appears in:

- `packages/compiler/compiler-tests/2-test-parser-parse.test.ts`
- `packages/compiler/compiler-tests/3-test.validation.test.ts`
- `packages/formatter/formatter-tests/1-test-formatter.test.ts`
- `packages/tao-cli/cli-tests/test-tao-cli.test.ts`
- `packages/ide-extension/extension-tests/test-ide-extension.test.ts`
- `packages/shared/shared-tests/test-shared.test.ts`

(Plus third-party copies under `expo-runtime/node_modules` — ignore.)

### TODO / FIXME in tooling and tests (sample)

| File                                                                                                         | Topic                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [`formatter-test-utils.ts`](../../../packages/formatter/formatter-tests/formatter-test-utils.ts)             | Newline / `trimEnd()` workaround — assertion fidelity |
| [`gen-syntax-tmLanguage-files.ts`](../../../packages/shared/scripts/commands/gen-syntax-tmLanguage-files.ts) | Rename script to match expanded behavior              |
| Various `compiler-src`, `tao-cli`, `tao-std-lib`                                                             | Product TODOs — triage separately from “hygiene”      |

### Generated imports in `compiler-src`

- Grep for `@parser/_gen-tao-parser` in `packages/compiler/compiler-src`: **no matches** (good; aligns with AGENTS rule).

### Export helpers JSDoc

- [`test-harness.ts`](../../../packages/compiler/compiler-tests/test-utils/test-harness.ts): major exports already documented.
- [`AST-Wrapper.ts`](../../../packages/compiler/compiler-tests/test-utils/AST-Wrapper.ts): `wrap` exported — verify one-line JSDoc if missing when touching file.

### Large / outlier test files

- Formatter suite [`1-test-formatter.test.ts`](../../../packages/formatter/formatter-tests/1-test-formatter.test.ts) is very large (hundreds of lines + many `testFormatter` cases) — primary candidate for **table-driven** extractions or shared case lists.

---

## Phase 2 — Per-package cognitive notes

1. **`@tao/parser`** — Single responsibility: grammar + codegen via `just gen`. Mental model: Langium types and `AST.is*`.
2. **`@tao/compiler`** — [`compiler-src/`](../../../packages/compiler/compiler-src/) vs tests documented in [`compiler/README.md`](../../../packages/compiler/README.md) and [`compiler-tests/README.md`](../../../packages/compiler/compiler-tests/README.md). Entry: `tao-compiler.ts` exports. Validator/codegen contract: see [compiler-validator-codegen-contract SKILL](../../../.cursor/skills/compiler-validator-codegen-contract/SKILL.md).
3. **`@tao/formatter`** — `FormatterSDK`; composite typecheck intentionally bundles compiler/parser ([README](../../../packages/compiler/README.md)). **Cognitive snag:** formatter _tests_ reach into _compiler test fixtures_ (see Phase 0).
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
- [`fixtures/snippets.ts`](../../../packages/compiler/compiler-tests/fixtures/snippets.ts) — cross-suite Tao strings (documented in [`compiler-tests/README.md`](../../../packages/compiler/compiler-tests/README.md)).
- [`formatter-test-utils.ts`](../../../packages/formatter/formatter-tests/formatter-test-utils.ts) — `testFormatter('…').format(…).equals(…)`.

**Recommendations:**

1. Migrate **error assertions** in `2-test-parser-parse`, `2-test-parser-objects`, `2-test-parser-object-literal-vs-block` to `diagnostics.ts` (or add one thin helper, e.g. `expectSomeHumanMessage`, exported from the same module — **extend**, don’t fork).
2. For **“Could not resolve reference”** and similar repeated needles, add a named helper in `diagnostics.ts` if more than two call sites need it (keeps tests one-liners).
3. **Formatter:** extract rows `{ title, raw, expected }[]` + one loop where cases are uniform; keep `testFormatter` DSL for readability.
4. **Snippets:** move `fixtures/snippets.ts` to `packages/shared` (e.g. `shared-src/testing/tao-snippets.ts`) or a tiny `packages/test-fixtures` package so formatter and compiler import the **same** layer — **one** mental location for “canonical Tao strings.”

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

| Item                                               | Why it hurts                                                                                         | Primary files                                                                                                                   | Direction                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Formatter tests depend on compiler **test** tree   | Breaks mental “package = ownership” boundary; moving compiler tests breaks formatter typecheck/tests | `formatter/formatter-tests/1-test-formatter.test.ts`, `formatter/tsconfig.json`, `compiler/compiler-tests/fixtures/snippets.ts` | Move snippets to `@shared` or `packages/test-fixtures`; single import path |
| `diagnostics.ts` underused                         | Duplicate join/contain patterns; worse failure messages                                              | `2-test-parser-parse.test.ts`, `2-test-parser-objects.test.ts`, `2-test-parser-object-literal-vs-block.test.ts`                 | Use `expectHumanMessagesContain` / add small named wrappers                |
| Huge formatter test file                           | Hard to navigate; duplicate formatting for similar cases                                             | `formatter-tests/1-test-formatter.test.ts`                                                                                      | Table-driven cases + keep `testFormatter` DSL                              |
| Direct `TaoParser.parseString` in validation suite | Two ways to drive the pipeline                                                                       | `3-test.validation.test.ts`                                                                                                     | Prefer harness or document “only here because …” in file header            |

### P2 (style, cleanup, docs)

| Item                        | Why it hurts                             | Primary files                                            | Direction                                                               |
| --------------------------- | ---------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Stub tests in many packages | Noise in test output; no signal          | Six `*.test.ts` files listed in Phase 1                  | Remove or replace with minimal smoke (e.g. one import/exec per package) |
| Formatter newline TODO      | Possible assertion drift                 | `formatter-tests/formatter-test-utils.ts`                | Fix TaoFile newline behavior; drop `trimEnd` hacks                      |
| Script rename TODO          | Discoverability                          | `shared/scripts/commands/gen-syntax-tmLanguage-files.ts` | Rename + update Just call sites                                         |
| Just recipe discoverability | New contributors grep many `.just` files | `packages/shared/just/*.just`                            | Optional `README.md` index of recipes                                   |

---

## Success criteria (met if you can answer)

1. **Where do shared Tao test strings live?** — Today: [`compiler/compiler-tests/fixtures/snippets.ts`](../../../packages/compiler/compiler-tests/fixtures/snippets.ts); **target:** shared or `test-fixtures` (see P1).
2. **What is the one parse helper per stage?** — [`test-harness.ts`](../../../packages/compiler/compiler-tests/test-utils/test-harness.ts): `lexTokens`, `parseAST`, `resolveReferences`, `parseTaoFully`, `parseASTWithErrors`, `parseMultipleFiles`.
3. **What automates gen vs test?** — Root `just test` always runs `gen` first; `prep-commit` runs full `just build` (includes gen) then `TAO_SKIP_GEN=1 just test`.

---

## Optional follow-ups

- [`.cursor/skills/check-for-improvements/SKILL.md`](../../../.cursor/skills/check-for-improvements/SKILL.md) on a dirty tree before commit.
- [`.cursor/skills/extrapolate-updates/SKILL.md`](../../../.cursor/skills/extrapolate-updates/SKILL.md) after choosing snippet location or diagnostic pattern.
