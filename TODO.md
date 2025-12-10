# Tao Lang TODOs

Tao Lang

## STACK

Next tasks, in order:

- [ ] [Dev Env Automation](#dev-env-automation)
- [ ] [Agent Setup](#agent-setup)
- [ ] [Compiler Seed](#parsercompiler-seed)

## Project List

Projects to tackle:

#### Dev Env Automation

- [x] README.md
- [x] Justfile
- [x] mise tools
- [x] idempotent `just setup` with `enter-tao` command
- [ ] Start app to implement against
- [ ] Seed compiler
  - [ ] packages/language
- [ ] Seed cli
  - [ ] package/tao-cli
- [ ] Seed Runtime
  - [ ] package/runtime
- [ ] Seed test suites
  - [ ] packages/language/tests/compile-tao-studio.test.ts
  - [ ] packages/runtime/tests/views.test.ts
    - [ ] `const runners = [headless, webPlaywright, iosMaestro]`
    - [ ] `describe.each(runners)("runner $s", (runner) => { runner.expect(CODE).text('foo').press({ testID: 'button' }).text('bar') })`
  - [ ] packages/runtime/tests/runners/headless.ts
  - [ ] packages/runtime/tests/runners/web-playwright.ts
  - [ ] packages/runtime/tests/runners/ios-maestro.ts

#### Agent Setup

- [ ] Write Agents.md
- [ ] Write .Agents.justfile, along w Agents.md instructions
- [ ] Get mise mcp running while in dev mode

#### Parser/Compiler Seed

- [ ] Create langium grammar and generator commands
  - [ ] Init w langium command in src/compiler-seed
  - [ ] Move needed things over into src/compiler
  - [ ] Implement commands
    - [ ] _watch_tao_compiler # grammar, validator, compiler
    - [ ] _watch_dev_app
    - [ ] _run_dev_app
