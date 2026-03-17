# Tao Lang development agent instructions

---

- **CRITICAL:** `./just-agents` is your one way to interact with the codebase.
- **ALWAYS** use `./just-agents <cmd> <args>` for all commands.
- **ALWAYS** start your session by listing available commands: `./just-agents help`
- **CRITICAL:** You may ONLY run commands with `./just-agents <cmd> <args>`.
- **CRITICAL:** Execute shell commands with `./just-agents shell "<shell cmd>" "<args>"`.
- **CRITICAL**: **Never** modify just-agents.Justfile without asking first.
- Favor using `./just-agents shell mv <src> <dest>` over rewriting files and then deleting them.
- **Justfile Documentation:**
  - **If** you need to lookup `just`, first check: https://cheatography.com/linux-china/cheat-sheets/justfile/
  - **If** you need more details, see:: https://just.systems/man/en/

---

## Misc Instructions:

- **NEVER** delete files without asking.
- **ALWAYS** run `fix` and `prep-commit` before committing, unless explicitly instructed not to.

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

Apps built with Tao Lang:

- `Apps/Kitchen Sink` - Collection of Tao demonstrations
- `Apps/Tao Studio` - Intended development environment for Tao Lang

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
