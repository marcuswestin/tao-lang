# Tao Lang TODOs

Tao Lang TODOs.

## STACK

Next tasks, in order:

- [x] Fix just check
- [x] Merge shared and shared-tools
- [x] Formatter
- [ ] Scoping

#### Parser

- [ ] Flesh out Validation
- [ ] Standard Library
- [ ] Type System

#### Language

- [ ] Let
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
