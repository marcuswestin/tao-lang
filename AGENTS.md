# Tao Lang development agent instructions

---

## CRITICAL: **Only** run commands with `./just-agents`:

- **ALWAYS** use `./just-agents <cmd> <args>` for all commands
- **NEVER** run commands any other way than `./just-agents`
- **ALWAYS** consult `.cursor/rules/running-commands.mdc` for instructions on running commands
- **ALWAYS** start your session with running `./just-agents help`

---

## Misc Instructions:

- **NEVER** delete files without asking
- **ALWAYS** check changes with just-agent `test`; and `prep-commit` right before committing.
- **ALWAYS** jsdoc all TS functions with name and description: `/** <fn name> <desc> */`.
- **USUALLY** jsdoc on a single line, unless more is appropriate: `/** <fn name> <desc> */`.
- **SOMETIMES** jsdoc additional details with list items when appropriate: `/** <fn name> <desc>\n * - ...\n * - ...\n */`.

---

## Project structure:

### Root Directory:

Human instructions:

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

- `packages/compiler/` - Parser, validator, compiler and formatter (using Langium)
- `packages/tao-cli/` - Tao CLI: `tao <...>`
- `packages/tao-std-lib/` - Standard library: e.g `use tao/ui Col, Row, Text`
- `packages/ide-extension/` - Tao Lang VSCode/Cursor Extension
- `packages/expo-runtime/` - Tao App runtime: Expo react native harness for compiled Tao apps
- `packages/shared/` - Code shared across all packages. TypeScript modules, internal scripts, etc

For package-specific instructions, see their AGENTS.md file, e.g `packages/compiler/AGENTS.md`.

### Test files:

- Test files are named `<name>.test.ts`
- Tests are executed with `bun test`
  - Except: `expo-runtime` tests can only be run using `node`/`jest`

---
