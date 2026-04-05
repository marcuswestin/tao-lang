# Tao Lang development agent instructions

---

- **CRITICAL:** `./just-agents` is your one way to interact with the codebase.
- **ALWAYS** use `./just-agents <cmd> <args>` for all commands.
- **ALWAYS** start your session by listing available commands: `./just-agents help`
- **CRITICAL:** You may ONLY run commands with `./just-agents <cmd> <args>`.
- **CRITICAL:** Execute shell commands with `./just-agents shell "<shell cmd>" "<args>"`.
- **ALWAYS** use it for piping commands too, e.g: `./just-agents shell ls | ./just-agents shell head -n 20`
- **CRITICAL**: **Never** modify just-agents.Justfile without asking first.
- Favor using `./just-agents shell mv <src> <dest>` over rewriting files and then deleting them.
- **Justfile Documentation:**
  - **If** you need to lookup `just`, first check: https://cheatography.com/linux-china/cheat-sheets/justfile/
  - **If** you need more details, see:: https://just.systems/man/en/

---

## Misc Instructions:

- **NEVER** delete files without asking.
- **ALWAYS** run `fix` and `prep-commit` before committing, unless explicitly instructed not to.
- **ALWAYS** use the return type of an invoked function (either implicitly or explicitly) rather than redeclaring an identical type. Don't: `type AType = { ... }; let foo: AType = fn();`, Do: `let foo = fn();`

### DRY (do not repeat yourself)

- **CRITICAL:** Do not add a second public API that duplicates another’s behavior and return shape (same inputs, same `getFile` / `getErrors` / build steps) just to expose one extra field or a slightly different assertion message. **Extend** the existing function’s return type or options instead, and keep a **single** implementation.
- **Before** copying a helper, search for an existing one (`grep`/semantic search) and **prefer** composing or widening it over parallel copies.
- Shared private builders are fine, but there should be **one** obvious exported entry point per use case, not two near-identical exports.

## Documentation:

- **ALWAYS** jsdoc all TS functions, in the form: `/** <fn name> <verb> <desc> */`, e.g `/** getUserById returns the user with the given id */`.
- **USUALLY** jsdoc on a single line, unless more is appropriate: `/** <fn name> <verb> <desc> */`.
- **ALWAYS** start multiline jsdoc lines right after `/**` without a newline; and end with `*/` right at the end of the last line, without a newline before it.
- **SOMETIMES** jsdoc additional details with list items when appropriate: `/** <fn name> <verb> <desc>\n * - ...\n * - ...\n */`.

- `README.md` - Human instructions
- `Justfile` - Human command runner file (`just <command> <args>`)
- `LICENSE` - Project license

Agent instructions:

- `AGENTS.md` - Agent instructions
- `just-agents` - Agent command runner (`./just-agents <command> <args>`)
- `just-agents.Justfile` - Agent commands

Misc configs and artifacts:

- `.builds/` - build artifacts
- `.config/` - configs for tools
- `.cursor/` + `.vscode/` - IDE configs
- `.*` - config files required in project root. Symlinked to `.config/*`

Tao Lang Project Docs:

- `Docs/`- Dev Log, Code examples, Roadmap, & more,

### Tao Lang implementation: packages/*

- `packages/parser/` - Langium grammar and generated AST for Tao Lang
- `packages/compiler/` - Validator and compiler (using Langium)
- `packages/tao-cli/` - Tao CLI: `tao <...>`
- `packages/tao-std-lib/` - Standard library: e.g `use tao/ui Col, Row, Text`
- `packages/ide-extension/` - Tao Lang VSCode/Cursor Extension
- `packages/expo-runtime/` - Tao App runtime: Expo react native harness for compiled Tao apps
- `packages/shared/` - Code shared across all packages. TypeScript modules, internal scripts, etc

### Test files:

- Test files are named `<name>.test.ts`
- Tests are executed with `./just-agents test <test name pattern>`
  - Except: `expo-runtime` tests are slow, and are run with `./just-agents test-all`
