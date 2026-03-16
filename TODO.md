# Tao Lang TODOs

Tao Lang TODOs.

## Tools next:

- [ ] Conductor
- [ ] Whispr flow
- [ ] Clawdbot

## STACK

Next tasks, in order:

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
- [ ] Start using https://github.com/callstack/react-native-testing-library!
  - [x] Spread compiled code across multiple files
- [x] Use a MultiCommand in settings.json to install extension and then restartExtensionHost (see .vscode/settings.json multiCommand.buildExtensionThenRestartHost, .vscode/keybindings.json, README Extension Development)
- [ ] Start using voice mode
- [ ] Ask to update implementing-scoping-for-langium-language.mdc. It looks out of date
- [ ] Remove grammar.ts
- [ ] Simplify TaoWorkspace to receive the shared workspace instead of the shared services.
- [ ] Change a bunch of function-oriented files to classes
- [ ] Switch from // comments to /** ... */ comments for documentation
- [ ] Don't duplicate all the shared packages from symlinks in vscode - ignore them.
- [ ] Replace with compiler-ast-switch-exhaustive.mdc rule for AST dispatching.
- [ ] Rename switchItemType_Exhaustive to switchNode_Exhaustive
- [ ] Enable "suspicious" lint category
- [ ] Enable "nursery" lint category
- [ ] Make all justfile recipies snake_case
- [ ] Consider adding warn for lint categories: "pedantic", "restriction", "style"
- [ ] Make lint type-aware
- [ ] Move typescript compiler generator into its own file (maybe class)
- [ ] Get kitchen sink build working and rendering
- [ ] Implement tracing properly
- [ ] Figure out how to test the ide extension in test-ide-extension.test.ts
- [x] Rename Agents.md to AGENTS.md
- [x] Update OXLINT_CMD: `OXLINT_CMD := "oxlint --ignore-path .gitignore --type-aware"`

#### Parser

- [ ] Flesh out Validation
- [x] Standard Library
- [ ] Type System

#### Language

- [x] Alias
- [ ] State

#### Improve Dev Environment

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
  - [ ] pre-commit: check for unstaged changes and askto stash them before continuing
- [ ] Follow up on having a few lexer tests written
- [ ] Start formatter
  - [ ] ASTNode.$cstNode.test/.range.start.line?
- [ ] Use workspaces: { "private": true, "workspaces": [ "packages/_", "apps/_" ]}; bun install installs for ALL with one lockile

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

- Check other LLM editor envs
  - [ ] Try google antigravity
  - [ ] Try Gemini code assist
  - [ ] Try gemini cli
  - [ ] Try Claude code direct
  - [ ] Try Codex code direct

Then:

- [ ] Start app to implement against (Tao Studio)
- [ ] App and View declaration
- [ ] Validation
- [ ] Scoping

#### Start stubbing out Docs

- [ ] Create Docs with explanation for Tao, and language design

#### Fixes

- [ ] Describe all package justfile commands with a comment
