# Tao Lang TODOs

Tao Lang TODOs.

Also see Roadmap.

## STACK

### Recently DONE:

- [x] Fix extension. Not fully working anymore.
- [x] Simplify grammar
  - [x] Collapse all blocks into a single type: Block
- [x] Move to multiple compiled files, and enable exports
- [x] Simplify grammar. Collapse different types some: E.g AST.isBlock, AST.isDeclaration
- [x] Make all declarations a single type: Declaration
  - [x] Handle exports by creating an exports object for each top level declaration.
- [x] Write e2e tests
  - [x] Implement scenario actions
- [x] Move all compilation to runtime-gen
  - [ ] Move use statement handling to RuntimeGen class: returns map of output file paths to compiled code for each.
- [x] Re-implement actions
  - [x] Implement global state - jotai prob
  - [x] Use legendapp/state instead of jotai.
  - [x] Roll up all view state references, and compile their hooks.
  - [x] Add automated test for tapping buttons with actions.
  - [x] Cleanup implementation.

### Next tasks:

- [ ] Upgrade react native.
- [ ] Try implementing source maps.
- [ ] Add ability to specify which app to dev-run.
- [ ] Implement prototype-chaining based scope (See kitchen sink test scenario)
- [ ] Ask agents to prepare a MAJOR cleanup.
  - [ ] Identify duplicates or near-duplicates of code, functionality, etc. A great large example are the two runtime test harnesses. Lots of duplicated things with small variations.
  - [ ] Identify old and out of date code, writing, and documentation.
  - [ ] Identify patterns that are idiosyncratic to the rest of the codebase. For example, previously the formatter lived inside compiler-src. Validator should probably be its own package. Tests use different and sprawly test harnesses I think that could be simpler.
  - [ ] Apps, Docs, and TODOs are likely needing a lot of cleanup.
  - [ ] Improve Agents instructions, rules, and commands.
    - [ ] Consider making all commands in to skills instead. Use /migrate-to-skills? Then delete?
    - [ ] Search online and find skills for used dependencies!
      - (E.g if we were using instant-db, it would mean finding https://www.instantdb.com/docs/using-llms and deciding to run `npx skills add instantdb/skills`)
    - [x] List all files to consider.
    - [x] Remove, move, edit, add rules and commands and instructions.
    - [x] List all skills etc that get loaded into context all the time/too often. Make it more precise and efficient.
  - [ ] Naming conventions. E,g ThisIsAURLFunction, not ThisIsAUrlFunction; private justfiles should be _snake_case, not kebab-case.
  - [ ] Already identified:
    - [ ] Runtime code duplication
      - `packages/tao-std-lib/tao/tao-runtime/` and `packages/expo-runtime/use/@tao/tao-runtime/` are the same three files (`tao-runtime.ts`, `runtime-store.ts`, `runtime-operators.ts`); compiler already copies from std-lib into emit output, so the Expo copy is extra drift surface.
    - [ ] Test harness assimilation
      - `packages/expo-runtime/test-runtime.tsx` and `packages/headless-test-runtime/src/test-runtime.tsx` share adapter shape, bun `TaoSDK_compile` spawn, path slugs, RTL cleanup / `pressVisibleText`; differ on module load (jest reset vs `require.cache`), SDK URL, env keys, output roots—share only the safe common bits (e.g. spawn/error/path helpers).
      - `packages/expo-runtime/jest.config.js` and `packages/headless-test-runtime/jest.config.js` are almost the same (`moduleNameMapper`); presets / `testMatch` differ.
      - Expo scenario tests use `../../shared/shared-src/...`; headless uses `@shared/...`—align imports.
      - Folder `packages/expo-runtime/tests - expo-runtime/` (space in name) is awkward for tooling and scripts.
    - [ ] Cross-package utils
      - `packages/tao-cli/cli-src/tao-cli-main.ts` redefines `fileExists` / `isDirectory` next to the same helpers in `packages/compiler/compiler-src/Paths.ts`—collapse to one place (e.g. `packages/shared`).
      - `assertNever` lives in `packages/compiler/compiler-src/compiler-utils.ts` but is imported from CLI and validator—move tiny helpers to `packages/shared` so `compiler-utils` stays codegen-focused.
    - [ ] Compiler layout
      - `packages/compiler/compiler-src` mixes codegen (`app-typescript-gen/`, `compiler-main.ts`), validation (`validation/`, `parse-errors.ts`), path/module resolution (`Paths.ts`, `ModulePath.ts`, `ModuleResolution.ts`, `StdLibPaths.ts`), LSP/services (`tao-services.ts`, `langium-lsp.ts`, `Tao*Provider.ts`, `TaoWorkspaceManager.ts`), and `parser.ts`—group into subfolders when you refactor paths/imports.
      - `StdLibPaths.ts` is a thin wrapper over `ModulePath.ts`; merge or inline to reduce parallel path modules.
      - `compiler-utils.ts` name vs contents (Langium codegen + shared bits)—split or rename for clarity.
    - [ ] Apps / repo noise (optional)
      - `Apps/` has many scenarios and scratch artifacts; tighten conventions or ignore patterns if reviews feel noisy.
    - [ ] Misc
      - [runtime_reload] λ WARN Route "./_gen-tao-compiler/tao-app/app/Fridge.tsx" is missing the required default export. Ensure a React component is exported as default. (This happens in all generated view files)
    - [ ] Recipe dependencies. Many recipes call others unecessarily; and some dependencies are declared at the top, others in implementation. What makes most sense here? Are there recipies that should be changed?
    - [ ] While doing all this, a lot of code will end up in @shared. It will be important to organize well. START BY MAKING A PLAN FOR THIS. For example, test harnesses will be sharing things that other code probably doesn't need.
    - [ ] Do different parts of @shared need different dependencies when used? Do we handle it with a single package.json with peerDependencies?
- [ ] Try removing the just-agents restriction and see what development is like without it.
- [ ] Improve testing
  - [ ] Add View Keys
    - [ ] Dev System for accessing local State?
    - Could be done with hidden dev-only view renders inside a view when a state is declared for accessing it.
- [ ] Get kitchen sink test passing: invocations need to have scoped dependencies passed in somehow ..
- [ ] Try other code environments
  - [ ] Antigravity
  - [ ] Gemini Code Assist
  - [ ] Gemini CLI
  - [ ] Claude Code Direct
  - [ ] Codex Code Direct
- [ ] Organize compiler-src - it's unorganized.
- [ ] Formatting: allow consecutive lines of same type have no space between them.
- Have ALL Node imports through a single shared import. Path, etc
- [ ] Fix just agents test with a pattern flag passed in
- [ ] The two test-runtime*.tsx files are almost identical. Consolidate them.
- [ ] Simplify compiler test harness file ..
- [ ] Consider requiring parameter lists to start with a comma.
- [ ] Require reference names to be uppercase.
- [ ] Actions
  - For each of: Declaration, Registration; Statements: State Update, Action invocation:
    - [ ] Write Parser tests: AI
    - [ ] Implement parser tests: AI
  - For each again:
    - [ ] Write e2e tests: AI
    - [ ] Implement e2e tests: Together

#### Unordered:

- [ ] Consolidate README and TODO.md.
- [ ] Clean up headless-test-runtime slop.

#### In Order:

### DONE Stack

- [x] Start app to implement against (Tao Studio)
- [x] App and View declaration
- [x] Validation
- [x] Scoping

## TODO Categories:

### IMPLEMENTATION TASKS

- [ ] Write the FULL Language Design, and FULL Specification.
  - [ ] FIRST of all: Write a tao script that demonstrates all CURRENT working features. That's v0.1
  - [ ] Create the roadmap by writing out small example apps with features added in order.
    - -> Start with a tao program that demonstrates all the v0.2 features.
      - -> Then derive a spec from that.
      - -> Then create a roadmap for that.
      - -> Then start checking off the milestones one by one.
    - -> Then a v0.3 app.
      - -> ...
- [ ] Start dividing up @Language Spec - Syntax Semantics.md into smaller files.
  - (These files might be used to create LLM skills.)
  - (Probably want a folder hierarchy of some sort, even if loose.)
- [ ] String operations
  - [ ] adjacency concatenation
    - "Year is " birthYear + age " today."
    - [ ] Requires EITHER newline-delimited statements; OR view render always ends with "{ .. }" AND the only non-keyword prefixed view body statement type is a view render AND keywords are reserved and cannot be alias names.
    - Without `{}` termination: `Text "hi " name \n Button title "click me" {}` becomes ambiguous. I.e is it a concatenation of "hi " + name + Button + ..., or "hi " + name; Button render; ...?
  - [ ] interpolation
    - "Hello, {name}!"
    - "A block starts with \{ and {"ends"} with \}."
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

### CLEANUP TASKS

- [ ] Start using voice mode
- [ ] Simplify TaoWorkspace to receive the shared workspace instead of the shared services.
- [ ] Change a bunch of function-oriented files to classes
- [x] Switch from // comments to /** ... */ comments for documentation
- [x] Don't duplicate all the shared packages from symlinks in vscode - ignore them.
- [ ] Replace with compiler-ast-switch-exhaustive.mdc rule for AST dispatching.
- [ ] Rename switchType_Exhaustive to switchNode_Exhaustive
- [ ] Enable "suspicious" lint category
- [ ] Enable "nursery" lint category
- [x] Use snake_case for private justfile recipes and kebab-case for public ones
- [ ] Consider adding warn for lint categories: "pedantic", "restriction", "style"
- [x] Make lint type-aware
- [ ] Move typescript compiler generator into its own file (maybe class)
- [ ] Extract Tao runtime manifest parsing and compiled-app test helpers into a shared package/module so expo-runtime and headless-test-runtime do not drift.
- [ ] Get kitchen sink build working and rendering
- [ ] Implement tracing properly
- [ ] Figure out how to test the ide extension in test-ide-extension.test.ts
- [x] Rename Agents.md to AGENTS.md
- [x] Update OXLINT_CMD: `OXLINT_CMD := "oxlint --ignore-path .gitignore --type-aware"`

### Parser

- [ ] Flesh out Validation
- [x] Standard Library
- [ ] Type System

### Language

- [x] Alias
- [ ] State

### Improve Dev Environment

- [ ] Non e2e Testing: Compiler
  - [ ] Compiler should be tested on a per-statement basis.
    - Could be compiled, then run in isolation, with a mock runtime.

First:

- [ ] Create pre-commit hook to check for unstaged changes and ask to stash them before continuing
- [ ] Commit!
  - [x] There are two almost idential justfiles in ide-extension...?
  - [ ] Fix the validator testing
  - [ ] Prefer backtick strings
  - [ ] Read through compiler-utils.ts
  - [ ] Read through other files
  - [ ] Create commit plan
  - [ ] Execute it
  - [ ] pre-commit: check for unstaged changes and ask to stash them before continuing
- [ ] Follow up on having a few lexer tests written
- [ ] Start formatter
  - [ ] ASTNode.$cstNode.test/.range.start.line?
- [ ] Use workspaces: { "private": true, "workspaces": [ "packages/_", "apps/_" ]}; bun install installs for ALL with one lockile
- [ ] Fix the `./just-agents` commit wrappers so `git-commit` works with staged changes and `post-commit-unstash` points at a real root recipe.
- [x] Auto-activate `mise` from `./just-agents` so commands do not need a separate shell prefix.

- [ ] Combine shared: shared/shared-ts-libs, /shared-scripts, just/foo.just;bar.just
- [ ] Consider exec before each just command
- [ ] Create AST testing helper
  - [ ] Get extension compiled map to work
  - [ ] Use Highlght or Comment vscode extension for syntax highlighting
    - E.g: "const foo = tao`view View {}`", where tao could be parse fn
    - Or: "const foo = \n//tao-lang-syntax:\n`view View {}`
  - [ ] Then adding this functionality to our vscode extension
- [ ] Create Validation testing helper
- [ ] Create test watch runner for all test suites
- [ ] Split up Justfile into smaller files

### Dev Tooling to check out, LLM editor environments, dev productivity for our repo, etc

- Editors to review:
  - [ ] Try google antigravity
  - [ ] Try Gemini code assist
  - [ ] Try gemini cli
  - [ ] Try Claude code direct
  - [ ] Try Codex code direct

### Tools to try next

- [ ] Conductor
- [ ] Whispr flow
- [ ] Clawdbot

### Start stubbing out Docs

- [x] Create Docs with explanation for Tao, and language design

### Fixes

- [x] Describe all package justfile commands with a comment
