# Tao Lang TODOs

Tao Lang TODOs.

## STACK

Next tasks, in order:

#### Start compiling and running basic app

First:

- [ ] Commit!
  - [x] There are two almost idential justfiles in ide-extension...?
  - [ ] Fix the validator testing
  - [ ] Read through compiler-utils.ts
  - [ ] Read through other files
  - [ ] Create commit plan
  - [ ] Execute it
  - [ ] pre-commit: check for unstaged changes and askto stash them before continuing
- [ ] Follow up on having a few lexer tests written
- [ ] Start formatter
  - [ ] ASTNode.$cstNode.test/.range.start.line?

- [ ] Combine shared: shared/shared-ts-libs, /shared-scripts, just/foo.just;bar.just
- [ ] Consider exec before each just command
- [x] Extension validation isn't working. Try e.g `Person ro` which should warn; or an incorrect reference.
- [x] Write basic validation tests
- [x] Use Bun to build extension instead of esbuild script
- [x] Create "watch" command that watches _all_ components and auto rebuilds. Save expo and interactive tests for last. Then add those either together or separaterly
- [ ] Create AST testing helper
  - [ ] Get extension compiled map to work
  - [ ] Use Highlght or Comment vscode extension for syntax highlighting
    - E.g: "const foo = tao`view View {}`", where tao could be parse fn
    - Or: "const foo = \n//tao-lang-syntax:\n`view View {}`
  - [ ] Then adding this functionality to our vscode extension
- [ ] Create Validation testing helper
- [ ] Create test watch runner for all test suites
- [ ] Split up Justfile into smaller files

Then:

- [ ] Start app to implement against (Tao Studio)
- [ ] App and View declaration
- [ ] Validation
- [ ] Scoping

#### Start stubbing out Docs

- [ ] Create Docs with explanation for Tao, and language design

#### Fixes

- [ ] Describe all package justfile commands with a comment
