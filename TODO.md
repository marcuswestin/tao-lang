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
- [x] State
- [x] Actions
- [x] Runtime Scope
- [x] Operators +, -, *, /, %, ( )
- [ ] Schemas and Queries
- [ ] Member / pipeline: ., ->
- [x] Type System
- [x] Objects/Items
- [ ] Arrays/Lists, and Tuples/Pairs
- [ ] Event & Handler Syntax
- [ ] Functions
- [ ] Layout System
- [ ] Studio App
- [ ] State Libraries

### NEXT - todo:

- [ ] Schemas and Queries
  - [ ] Spec: [Query Design - Preferred.md](Docs/Projects/Data%20Schema%20and%20Queries/Query%20Design%20-%20Preferred.md), [Query Design - Alternatives.md](Docs/Projects/Data%20Schema%20and%20Queries/Query%20Design%20-%20Alternatives.md), [Prior Art - Query Languages.md](Docs/Projects/Data%20Schema%20and%20Queries/Prior%20Art%20-%20Query%20Languages.md), [Runtime - TanStack Query and InstantDB.md](Docs/Projects/Data%20Schema%20and%20Queries/Runtime%20-%20TanStack%20Query%20and%20InstantDB.md); target fictions: [Example App - Target](Docs/Projects/Data%20Schema%20and%20Queries/Example%20App%20-%20Target/README.md)
  - [ ] Align [Tao Language Design.md](Docs/Tao%20Language%20Design.md) Data Description with preferred schema as grammar converges
  - [ ] Implementation
    - [ ] Schema
    - [ ] Runtime interface
    - [ ] One provider

### Jumble...

- [ ] Combine with Tao Lang Roadmap.md
- [x] Sometimes `just dev` requires `just test` to work.
- [ ] Greatly simplify testing harnesses and code -- move from huge files with each test taking many lines (e.g parseMultipleFiles) to smaller files with each test taking fewer lines. Ex:

```ts
test('<batch name, e.g "use statement parsing">')
  .parseError("feature name, e.g 'use statement parsing'")
    .parseFile('path/to/file.tao')`use PublicView from ./ui/views`
    .parseFile('path/to/file.tao')`view MyView { PublicView }`
  .parse("import multiple declarations from same module")
    .parseFile(...)`...`
  .runHeadless()
test('...')
```

- [ ] Tell AGENTS.md who they are, and what matters
  - They are industry defining, and care deeply about quality. It _must be beautiful inside_
  - Oversees quality
  - TAO DEVELOPER ERGONOMICS **MATTERS**. Hundreds of thousands of engineers, and tens of thousands of designers, will depend on the readability and expressability of THIS LANGUAGE.
- [ ] Move parser tests into its package?
- [ ] Remove unused imports.
  - Is rewrite actually possible?
  - If yes, there are other ones we want to do as well.
  - Most likely this is another compilation target, that compiles a tao AST into a new Tao file.
- [ ] Split up validator into multple files. For example, split out all current type checking validation into its own file.
- [ ] Allow for currying actions: `action UpBy Count number { ... }` and `Button UpBy 2 -> { }` or something like that. Do we solve it with `on`?
  - `Button "Count 2", on press -> UpBy 2`
  - `Button on press UpBy.2 "Count 2"`
  - `Button UpBy.2 "Count 2"`
  - `Button "Count 2", -> UpBy 2`
    - This could work. Invocations are `do ...`, -> is shorthand for on ___ ACTION+ARGS;
    - Are ARGS evaluated at registration time, or at event time?
      - At event time. E.g `Input Password; LogIn -> Login Password`.
      - To have at registration time: `Alert "Value was ${read Name}, is ${Name}"`
        - This is not intuitive or obvious .. Don't think I like it.
- [ ] Remove `+` string concatenation, until it's clear that it's wanted when developing.
- [ ] Review, improve, SIMPLIFY, plan tao-type-system.ts
- [ ] Objects
- [ ] Move all AST checks downstream from validator into validator. Only leave things like Assert that ts-typecheck disambiguate. Otherwise assume that all AST checking needed has already been done by the time we get there.
  - [x] Object-shape checks for `+` and view render arguments moved upstream: validator rejects object-shaped operands / args; runtime `+` and `Value.render` now trust the contract and keep only `Assert`s (dropped `taoStringify`).
- [x] Inline actions. (expression: `action` optionalName `{` action-body `}` — e.g. `Button title "Go", Action action { ... }`)
- [x] Use https://github.com/TypeFox/langium-in-browser-codegen-example/blob/main/src/generator/generator-with-tracing.ts to redo codegen. (Tao already used `expandTracedToNode` / `toStringAndTrace`; aligned expression codegen with the example: `traceToNode` for op / literals / `referenceName` per Langium; implemented `ActionExpression` emit + formatter dispatch.)

#### HIGH - MUST

- [ ] Upgrade packages: expo@54.0.33 - expected version: ~54.0.34; expo-linking@8.0.11 - expected version: ~8.0.12; expo-web-browser@15.0.10 - expected version: ~15.0.11
- [ ] This should be a type error:

```tao
type Title is text

view RootView {
  Number Value Counter
  Col {
    Button Title, Action UpBy3 // <- Title is not a value
  }
}
```

- [ ] This should _not_ be a type error:

```tao
type Title is text
alias Title "Up by 3" // <-
```

- [ ] Improve testing
  - [ ] Add View Keys
  - [ ] Make test app less ugly. Black background, white text.
- [ ] Objects/Items
- [ ] Event & Handler Syntax
- [ ] String operation: ADJACENCY CONCATENATION
  - "Year is " birthYear + age " today."
  - [ ] Requires EITHER newline-delimited statements; OR view render always ends with "{ .. }" AND the only non-keyword prefixed view body statement type is a view render AND keywords are reserved and cannot be alias names.
  - Without `{}` termination: `Text "hi " name \n Button title "click me" {}` becomes ambiguous. I.e is it a concatenation of "hi " + name + Button + ..., or "hi " + name; Button render; ...?
- [ ] String operation: INTERPOLATION
  - "Hello, {name}!"
  - "A block starts with \{ and {"ends"} with \}."
- [ ] State access render performance:
  - [ ] Research
    - https://legendapp.com/open-source/state/v2/react/react-introduction/
    - https://legendapp.com/open-source/state/v2/react/react-api/
    - https://legendapp.com/open-source/state/v2/react/fine-grained-reactivity/
    - https://legendapp.com/open-source/state/v2/react/helpers-and-hooks/
  - [ ] Implement
  - [ ] Add debug build with tracing: - https://legendapp.com/open-source/state/v2/react/tracing/

#### MEDIUM

- [ ] Cleanup runtime code and types. A lil scrappy as is.
- Dev Env:
  - [ ] Claude code direct
  - [ ] Try removing the just-agents restriction and see what development is like without it.
  - [ ] Voice mode
  - [ ] Cleanup Justfile, which swelled up a bit with many multi-line recipes. Consider moving to q-dev for more stuff?
  - [ ] Require shared declarations to be explained in some way (e.g text describing its functionality, intended use, and expected behavior)

- [ ] Combine, or restructure, validators. (UseStatement and TaoLangValidator)
- [ ] Map view render statements in the source to the DOM in Chrome DevTools. Maybe similar to React Native DevTools. Ideal would be to right-click on an element in the browser view, and then see the corresponding view render statement in the source code. (We may want to implement "view keys" to make this work - see below. A way for the developer to uniquely name views)
- [ ] Module metadata: Add a way to add metadata to a module.
- [ ] Duplicate declarations in a module should give an error.
- [ ] Add "let" definitions?
- [ ] Examine whitespace newline sensitivity necessary or not. `view TestView { Col \n Row }` should be valid, without `view TestView { Col { } Row }`
  - OR, do we require rendering block for now? `view TestView { Col { } Row { } }`
  - OR, do we require a comma? `view TestView { Col, Row }`, and
    ```tao
    view TestView {
      Col,
      Row {
        Text "Hello, World!"
      },
    }
    ```

- [ ] Have ALL Node imports through a single shared import. Path, etc
- [ ] Make sure filtered test running works for just and just-agents.
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

```
```
