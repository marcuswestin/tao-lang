# Tao Lang TODOs

Tao Lang TODOs.

Also see Roadmap.

## PROCESS

- For each feature:
  1. Create new tao app, demonstrating the next feature to implement.
  2. Derive a spec from that app.
  3. Create a plan from that spec.
  4. Write tests.
  5. Implement and pass tests.

## STACK

### Language

- [x] Just Dev Scripts
- [x] Parser
- [x] Compiler
- [x] Unit tests & AST helper lib
- [x] IDE extension
- [x] App Runtime
- [x] e2e Testing Runtime
- [x] Validation
- [x] Standard Library
- [x] Aliases
- [ ] Type System
- [x] State
- [x] Actions
- [ ] Runtime Scope
- [ ] Operators +,-,*,/,%,(),.,->
- [ ] Objects/Items, Arrays/Lists, and Tuples/Pairs
- [ ] Event & Handler Syntax
- [ ] Functions
- [ ] Layout System
- [ ] Studio App
- [ ] State Libraries

### NEXT - todo:

- Dev Env:
  - [ ] Try removing the just-agents restriction and see what development is like without it.

#### HIGH - MUST

- [ ] Improve testing
  - [ ] Add View Keys
  - [ ] Dev System for seeing local State?
    - Could be done with hidden dev-only view renders inside a view when a state is declared for accessing it.
- [ ] Implement prototype-chaining based scope (See kitchen sink test scenario)
  - [ ] Get kitchen sink test passing: invocations need to have scoped dependencies passed in somehow ..
- [ ] Objects/Items
- [ ] Event & Handler Syntax
- [ ] String operation: ADJACENCY CONCATENATION
  - "Year is " birthYear + age " today."
  - [ ] Requires EITHER newline-delimited statements; OR view render always ends with "{ .. }" AND the only non-keyword prefixed view body statement type is a view render AND keywords are reserved and cannot be alias names.
  - Without `{}` termination: `Text "hi " name \n Button title "click me" {}` becomes ambiguous. I.e is it a concatenation of "hi " + name + Button + ..., or "hi " + name; Button render; ...?
- [ ] String operation: INTERPOLATION
  - "Hello, {name}!"
  - "A block starts with \{ and {"ends"} with \}."

#### MEDIUM

- [ ] Add ability to specify which app to dev-run.
- [ ] Try implementing source maps.
- [ ] Upgrade react native.
- [ ] Have ALL Node imports through a single shared import. Path, etc
- [ ] Make sure filtered test running works for just and just-agents.
- [ ] The two test-runtime*.tsx files are almost identical. Consolidate them.
  - [ ] Simplify compiler test harness file ..
- [ ] Require reference names to be uppercase?

#### LOW

- [ ] Formatting: allow consecutive lines of same type have no space between them.
- [ ] Get Highlighting to work in `tao` fence blocks: Use Highlght or Comment vscode extension for syntax highlighting
  - E.g: "const foo = tao`view View {}`", where tao could be parse fn
  - Or: "const foo = \n//tao-lang-syntax:\n`view View {}`
  - [ ] Then adding this functionality to our vscode extension

#### CLEANUPS

- High
  - [ ] Simplify TaoWorkspace to receive the shared workspace instead of the shared services.
  - [ ] Extract Tao runtime manifest parsing and compiled-app test helpers into a shared package/module so expo-runtime and headless-test-runtime do not drift.

- Low
  - [ ] Change a bunch of function-oriented files to classes
  - [ ] Enable "suspicious" lint category
  - [ ] Enable "nursery" lint category
  - [ ] Consider adding warn for lint categories: "pedantic", "restriction", "style"
  - [ ] Standardize naming: ThisIsAURLFunction, not ThisIsAUrlFunction; private justfiles use _snake_case, not kebab-case.
  - [ ] Review and rationalize recipe dependencies and declarations.

## TODO Categories:

### IMPLEMENTATION TASKS

### CLEANUP TASKS

### Dev Tooling to check out, LLM editor environments, dev productivity for our repo, etc

- [ ] Start using voice mode

- Editors to review
  - [ ] Try google antigravity
  - [ ] Try Gemini code assist
  - [ ] Try gemini cli
  - [ ] Try Claude code direct
  - [ ] Try Codex code direct

- Tools to try out
  - [ ] Conductor
  - [ ] Whispr flow
  - [ ] Clawdbot

### DONE:

- [x] Start app to implement against (Tao Studio)
- [x] App and View declaration
- [x] Validation
- [x] Scoping
- [x] Fix extension. Not fully working anymore.
- [x] Auto-activate `mise` from `./just-agents` so commands do not need a separate shell prefix.
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
  - [x] Identify old and out of date code, writing, and documentation. (audit: corrected stale Expo runtime path; noted duplicate “consolidate harness” TODO themes.)
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
      - [x] Expo Router warned on dev reload for every generated `.tsx` under `app/` (“missing the required default export”) because it treated compiler output as file-based routes. **Fix:** `compileOneTaoFileModule` in `app-gen-main.ts` appends a no-op `export default function TaoCompilerExpoRouterStub() { return null }` on each emitted Tao module (not the bootstrap), satisfying the router without moving emit roots.
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
