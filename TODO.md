# Tao Lang TODOs

Tao Lang TODOs.

Also see Roadmap.

## STACK

### Recently DONE:

- [x] Fix extension. Not fully working anymore.

### Next tasks:

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
- [ ] Re-implement actions
  - [ ] Add automated test for tapping buttons with actions.
- [ ] Improve testing
  - [ ] Add View Keys
    - [ ] Dev System for accessing local State?
    - Could be done with hidden dev-only view renders inside a view when a state is declared for accessing it.
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
