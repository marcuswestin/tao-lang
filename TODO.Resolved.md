**Archival log:** older sections may reference removed paths, commands, or tooling.

#### Documentation cleanup archival note (2026-05-01)

- [x] Trimmed `TODO.md` to active scratchpad items (now/soon/backlog only).
- [x] Removed legacy in-file DONE dump from active TODO tracking.
- [x] Moved raw design debates into Design WIP docs:
  - `Docs/Projects/Design WIP/Language Syntax Brainstorm.md`
  - `Docs/Projects/Design WIP/UI Layout and Styling.md`
  - `Docs/Projects/Design WIP/Error Handling.md`
  - `Docs/Projects/Design WIP/App Routing and Navigation.md`

#### Consolidating TODO scratch archive (2026-05-01)

Pulled forward from `Docs/Projects/Misc/TODO-scratch-archive-git-HEAD.md` before deleting it; the items below were complete but had not been migrated into this file:

- [x] Fixed: `just dev` no longer requires `just test` to have run first.
- [x] Object-shape checks for `+` and view render arguments moved upstream into the validator; runtime `+` and `Value.render` now trust the contract and keep only `Assert`s (dropped `taoStringify`).
- [x] Inline actions implemented as an expression form: `action` optionalName `{` action-body `}` (e.g. `Button title "Go", Action action { ... }`).
- [x] Switched expression codegen to Langium traced codegen pattern (per [`langium-in-browser-codegen-example`](https://github.com/TypeFox/langium-in-browser-codegen-example/blob/main/src/generator/generator-with-tracing.ts)) — `traceToNode` for op / literals / `referenceName`; `ActionExpression` emit + formatter dispatch implemented.

#### Pre-2026-05-01 archived completion list (verbatim from `TODO-scratch-archive-git-HEAD.md`)

Verbatim copy of the archive's `### DONE:` block. Some items overlap conceptually with the more recent dated sections below; preserved as-is so the historical record is intact. Not deduplicated.

- [x] Start app to implement against (Tao Studio)
- [x] App and View declaration
- [x] Validation
- [x] Scoping
- [x] Fix extension. Not fully working anymore.
- [x] Auto-activate `mise` from `./agent` so commands do not need a separate shell prefix.
- [x] Simplify grammar
  - [x] Collapse all blocks into a single type: Block
- [x] Move to multiple compiled files, and enable exports
- [x] Simplify grammar. Collapse different types some: E.g AST.isBlock, AST.isDeclaration
- [x] Make all declarations a single type: Declaration
  - [x] Handle exports by creating an exports object for each top level declaration.
- [x] Combine shared: shared/shared-ts-libs, /shared-scripts, just/foo.just;bar.just
- [x] Create AST testing helper
- [x] Split up Justfile into smaller files
- [x] Write e2e tests
  - [x] Implement scenario actions
- [x] Move all compilation to runtime-gen
  - [x] Move use statement handling to RuntimeGen class: returns map of output file paths to compiled code for each.
- [x] Re-implement actions
  - [x] Implement global state - jotai prob
  - [x] Use legendapp/state instead of jotai.
  - [x] Roll up all view state references, and compile their hooks.
  - [x] Add automated test for tapping buttons with actions.
  - [x] Cleanup implementation.
- [x] Major cleanup — phase 1 (inventory, shared helpers, Expo test imports)
  - [x] Identify duplicates or near-duplicates of code, functionality, etc. (audit: dual `test-runtime` harnesses, shared jest `moduleNameMapper`, `FsPathChecks` + `assertNever` moves, runtime source vs emit copy).
  - [x] Identify old and out of date code, writing, and documentation. (audit: corrected stale Expo runtime path; noted duplicate "consolidate harness" TODO themes.)
  - [x] Identify idiosyncratic patterns. (audit: Expo `@shared` via mapper + sources; spaced test folder since renamed to `tests-expo-runtime/`; `compiler-src` mixing concerns.)
  - [x] Improve Agents instructions, rules, and commands — list files, edit rules/commands/instructions, trim always-loaded skills.
  - [x] Cross-package utils: `fileExists`/`isDirectory` in `@shared/FsPathChecks`; `assertNever` in `@shared/TypeSafety`; compiler `Paths` re-exports; CLI and validator imports updated.
  - [x] Align Expo scenario sources with `@shared/...` (`test-runtime.tsx`, `shared-scenarios.jest-test.tsx`) and `expo-runtime/tsconfig.json` `paths` (no `baseUrl`, for oxlint).
  - [x] Renamed Expo Jest folder to `packages/expo-runtime/tests-expo-runtime/` (was `tests - expo-runtime/`); updated `jest.config.js` `testMatch`.
    - [x] Dropped spaced test folder name: `tests-expo-runtime/` + `testMatch` in `jest.config.js`.
    - [x] Shared Jest `moduleNameMapper` in `packages/shared/jest-module-name-mapper.cjs`; both runtimes `require` it from `jest.config.js`.
    - [x] Shared Tao bun harness in `@shared/TaoBunSdk` (`runTaoSdkCompileBunSync`, inline script builder, `formatBunSpawnSyncErrorMessage`) for test-runtime `TaoSDK_compile` subprocesses.
    - [x] Compiler layout
      - [x] Grouped `packages/compiler/compiler-src`: `codegen/` (`compiler-codegen.ts`, `app/` ex-`app-typescript-gen/`), `resolution/` (`Paths`, `ModulePath`, `ModuleResolution`), `langium/` (`tao-services`, `langium-lsp`, `TaoDefinitionProvider`, `TaoScopeComputation`, `TaoScopeProvider`, `TaoWorkspaceManager`, `parser`), `validation/parse-errors.ts`; entry `compiler-main.ts` stays at root. Public imports include `@compiler/codegen/compiler-codegen`, `@compiler/resolution/ModulePath`, `@compiler/langium/tao-services`, `@compiler/validation/parse-errors`.
      - [x] `StdLibPaths.ts` removed; `@tao/...` directory resolution lives on `ModulePath.ts` (`isTaoModuleImport`, `resolveModuleImportDirectory`).
      - [x] Renamed `compiler-utils.ts` → `compiler-codegen.ts` (Langium traced codegen); imports use `@compiler/codegen/compiler-codegen`.
    - [ ] Apps / repo noise (optional)
      - `Apps/` has many scenarios and scratch artifacts; tighten conventions or ignore patterns if reviews feel noisy.
    - [ ] Misc
      - [x] Expo Router warned on dev reload for every generated `.tsx` under `app/` ("missing the required default export") because it treated compiler output as file-based routes. **Fix:** `compileOneTaoFileModule` in `app-gen-main.ts` appends a no-op `export default function TaoCompilerExpoRouterStub() { return null }` on each emitted Tao module (not the bootstrap), satisfying the router without moving emit roots.
    - [x] Document acronym casing for new identifiers (`URL` not `Url`) in `AGENTS.md`.
  - [x] Test harness assimilation
    - [x] Shared `compiledScenarioTaoAppBootstrapRelativePath` (`@shared/TaoPaths`) and `throwIfTaoSdkCompileFailed` (`@shared/TaoBunSdk`) for duplicated scenario output paths and compile failure checks; Expo vs headless still differ on `jest.resetModules` vs `require.cache`, SDK URL, env keys, and output roots by design.
    - [x] Jest `moduleNameMapper` already centralized in `packages/shared/jest-module-name-mapper.cjs`; documented intentional `preset` / `testMatch` differences in both `jest.config.js` files.
- [x] Create Docs with explanation for Tao, and language design
- [x] Describe all package justfile commands with a comment
- [x] Fix just check
- [x] Merge shared and shared-tools
- [x] Formatter
- [x] Scoping
- [x] Fix build
- [x] Make modules `use Col, Row from tao/ui`, as well as `use FridgeView` for same-module imports
- [x] Add standard library support -- `use tao/ui Col, Row, Text`
- [x] Implement `class TaoWorkspace` instead of the ad-hoc services object
- [x] Format the symbols in imports, e.g `Row ,   Col` → `Row, Col`
- [x] Generalize Grammar
  - [x] Determine if there are any additional grammar cleanups related to these, or others that we should do:
  - [x] Statements = ViewBlock | FunctionBlock | HandlerBlock | TopLevelStatement | ..
  - [x] Add instruction: All referencable grammar entities need to use key "name", not "key" or something else.
  - [x] Naming: AliasStatement -> AliasDeclaration; NameBinding -> Declaration; Declaration = AliasDeclaration | StateDeclaration | ParameterDeclaration | ...;
    - [x] Cleanup various ___Declaration references in ts code.
  - [x] Inline ViewBody in ViewRenderStatement
- [x] Start using https://github.com/callstack/react-native-testing-library!
  - [x] Spread compiled code across multiple files
- [x] Use a MultiCommand in settings.json to install extension and then restartExtensionHost (see .vscode/settings.json multiCommand.buildExtensionThenRestartHost, .vscode/keybindings.json, README Extension Development)
- [x] Move parser into its own package
- [x] Move formatter into its own package
- [x] Switch from // comments to /** ... */ comments for documentation
- [x] Don't duplicate all the shared packages from symlinks in vscode - ignore them.
- [x] Use snake_case for private justfile recipes and kebab-case for public ones
- [x] Make lint type-aware
- [x] Rename Agents.md to AGENTS.md
- [x] Update OXLINT_CMD: `OXLINT_CMD := "oxlint --ignore-path .gitignore --type-aware"`
- [x] Get kitchen sink build working and rendering
- [x] Figure out how to test the ide extension in test-ide-extension.test.ts
- [x] Improve Agents docs, rules, and commands.
- [x] Write TODO tests for parsing `file`, `share` declarations.
- [x] Add grammar for `file`, `share` declarations.
- [x] Make tests non-todo, and ensure they pass.
- Imports
- [x] Add grammar for `use` imports with relative paths only:
- [x] Add test harness functions for parsing multiple files.
- [x] Write TODO tests for parsing `use` imports with multiple files.
- [x] Make tests non-todo, and ensure they pass.
- Resolution
- [x] Write TODO tests for resolving `use` imports to the corresponding module files.
- [x] Add TaoScopeComputation to export `share` declarations.
- [x] Add TaoScopeProvider for resolving `use` imports.
- [x] Make tests non-todo, and ensure they pass (11 pass, 3 todo for UseStatement validation).
- [x] Add view arguments
- [x] Fix shared module tsconfigs so that all can import each other
- [x] BIIIIG lift: make grammar more permissive, and do more checking in validation. E.g: `view TestView { share let name = "Ro" }` should give an error message saying "share" can only be done at the top level, rather than a less clear parsing error message.
- [x] "This activation event can be removed as VS Code generates these automatically from your package.json contribution declarations."
  - This is for "activationEvents": ["onLanguage:tao"]
- [x] `just dev` warnings/errors/updates.
- [x] export const `Switch` (`type` / `property` / `bind`) wrapping the exhaustive switch helpers in `TypeSafety.ts`
- [x] Implement prototype-chaining based scope (See kitchen sink test scenario)
  - [x] Get kitchen sink test passing: invocations need to have scoped dependencies passed in somehow ..
- [x] Make "file" visibility into "hide".
- [x] _gen- -> ../_gen patch may have screwed up many different parts of the dev env. Search, confirm, fix.
  - Fixed: dprint `excludes` only had `**/_gen-*`, so plain `_gen/` (Expo `tao-app` output) was still formatted; added `**/_gen/**`. Swept repo for stale Expo paths — none found; eslint/gitignore/clean already covered `_gen/`.
  - Optional later: exclude `_gen/tao-app/**` from `packages/expo-runtime/tsconfig.json` if TS server noise on generated files becomes annoying (watch import resolution vs `app/index.tsx`).
- [x] just dev -> "IDE TextMate grammar merged" twice
- [x] Dedup code. DRY, move to shared, etc:
  - [x] expo-runtime: function compileTaoForExpoRuntime(opts: CompileOpts): CompileResult
  - [x] headless-test-runtime: export async function compileTaoForHeadlessRuntime(opts: CompileOpts)
  - [x] .. and their util functions
  - [x] and whatever else makes sense
- [x] Add ability to specify which app to dev-run.
- [x] Try implementing source maps.
- [x] Upgrade react native.

#### Build & Dev Workflow Improvements (2025-12-18)

- [x] Rename `gen-mise-tasks` → `mise-tasks-gen` for consistency across all files
- [x] Add numbered prefixes to cursor commands for logical ordering (1-, 2-, 3-)
- [x] Create `1-check-for-improvements.md` pre-commit review command
- [x] Make oxlint respect .gitignore with `--ignore-path .gitignore` flag
- [x] Add `tsc` to compiler build step
- [x] Setup now builds all packages after installation
- [x] Add `git-stage-and-test` recipe for testing staged changes in isolation
- [x] Add `backups` and `staging-area` to .gitignore

#### Test Infrastructure & Error Handling (2025-12-18)

- [x] Extension validation isn't working. Try e.g `Person ro` which should warn; or an incorrect reference.
- [x] Write basic validation tests
- [x] Use Bun to build extension instead of esbuild script
- [x] Create "watch" command that watches _all_ components and auto rebuilds. Save expo and interactive tests for last. Then add those either together or separaterly
- [x] Refactor test harness with staged validation helpers (`lexTokens`, `parseAST`, `resolveReferences`, `parseTaoFully`)
- [x] Redesign error system with `UserInputRejection`, `UnexpectedBehavior`, `NotYetImplemented` error types
- [x] Remove Bun-specific APIs from parser for Node.js compatibility
- [x] Add `--runtime-dir` required option to CLI compile command
- [x] Add HCI (human-computer interaction) module for consistent user messaging
- [x] Clean up just file naming (`_vars.just` → `_shared-vars.just`, etc.)

#### Get extension working (2025-12-11)

- [x] Create basic vscode extension, and automate installation into current cursor instance.
- [x] Hook up inter-package imports and builds.
- [x] Use bun in extension instead of node/npm.
- [x] Commit Docs

#### Agent Setup (2024-06-11)

- [x] Write Agents.md
- [x] Get mise mcp running while in dev mode

Prompt:

    Create Agents.md for this project. Do a careful search through the project to consider a succinct best practices Agents.md file. Make sure to setup ability to use mise mcp, including generating a .config/mise-gen-just-commands.toml, by either reading the output of `just help` or using the just dump function to generate toml. Create an `Agents.just` file, and instruct all agents to ONLY EVER use `just --justfile Agents.just <cmd>` commands; and that if there is need for a command that isn't available, then ask for permission to add a just command to do it. Keep justfile commands DRY, and favor fewer commands with passed in args, over many one-off commands.

#### Seed project components (2024-06-10)

- [x] Seed compiler
  - [x] packages/language
- [x] Seed cli
  - [x] package/tao-cli
- [x] Seed Runtime
  - [x] package/runtime
- [x] Seed test suites
  - [x] packages/language/tests/compile-tao-studio.test.ts
  - [x] packages/runtime/tests/views.test.ts
- [x] Cleanups
  - [x] Use `set quiet` in main Justfile
  - [x] Replace `"module": "Preserve",` with `"module": "ESNext",`
  - [x] Fix ts errors in langium generated code. Set which ts library w `"typescript.tsdk": "path to node_modules/typescript/lib"`?

#### Dev Env Automation (2024-06-10)

- [x] README.md
- [x] Justfile
- [x] mise tools
- [x] idempotent `just setup` with `enter-tao` command
