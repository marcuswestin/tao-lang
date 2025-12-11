# Tao Lang TODOs

Tao Lang

## STACK

Next tasks, in order:

#### Seed project components

- [x] Seed compiler
  - [x] packages/language
- [x] Seed cli
  - [x] package/tao-cli
- [x] Seed Runtime
  - [x] package/runtime
- [x] Seed test suites
  - [x] packages/language/tests/compile-tao-studio.test.ts
  - [x] packages/runtime/tests/views.test.ts
- [ ] Cleanups
  - [x] Use `set quiet` in main Justfile
  - [ ] Replace `"module": "Preserve",` with `"module": "ESNext",`
  - [ ] Fix ts errors in langium generated code. Set which ts library w `"typescript.tsdk": "path to node_modules/typescript/lib"`?

#### Start compiling and running basic app

- [ ] Start app to implement against (Tao Studio)

#### Start stubbing out Docs

- [ ] Create Docs with explanation for Tao, and language design

#### Agent Setup

- [ ] Write Agents.md
- [ ] Write .Agents.justfile, along w Agents.md instructions
- [ ] Get mise mcp running while in dev mode
