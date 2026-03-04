# Tao Lang development agent instructions

---

## CRITICAL: **Only** run commands with `./just-agent`:

- **ALWAYS** use `./just-agent <cmd> <args>` for all commands
- **NEVER** run commands any other way than `./just-agent`
- **ALWAYS** consult `.cursor/rules/running-commands.mdc` for instructions on running commands
- **ALWAYS** start your session with running `./just-agent help`

---

## Misc Instructions:

- **ALWAYS** `test`, `fix` and `check` before committing
- **NEVER** delete files without asking
- **ALWAYS** document exported TS functions with `// <function name> <description>` (**never** use `/** ... */`)

### Main Tools used:

See `.config/mise.toml` for a list of the main tools we use

## Custom scripts:

When justfile recipes are insufficient, use our TS script runner `q-dev.ts`:

- `just q-dev help`
- `just q-dev <cmd> <args>`

See `packages/shared/scripts/q-dev.ts` for implementation and adding new commands.

---

## Project structure:

### Root Directory:

Human dev instructions:

- `README.md` - Human dev instructions
- `Justfile` - Human tasks runner file
- `LICENSE` - Project license

Agent dev instructions:

- `Agents.md` - Agent instructions
- `just-agents` - Agent command runner
- `just-agents.Justfile` - Agent commands

Tao Lang Project Docs:

- `Tao Chronicle/`- Roadmap, TODOs, and implementation history
- `Tao Design Docs/` - Language specifications, examples, and documentations

Misc configs and artifacts:

- `.builds/` - build artifacts
- `.config/` - configs for tools
- `.cursor/` + `.vscode/` - IDE configs
- `.*` - config files required in project root. Symlinked to `.config/*`

### Tao Lang implementation: packages/*

- `packages/compiler/` - Parser, validator, compiler and formatter (using Langium)
- `packages/tao-cli/` - Tao CLI: `tao <...>`
- `packages/std-lib/` - Standard library: e.g `use tao/ui Col, Row, Text`
- `packages/ide-extension/` - Tao Lang VSCode/Cursor Extension
- `packages/expo-runtime/` - Tao App runtime: Expo react native harness for compiled Tao apps
- `packages/shared/` - Code shared across all packages. TypeScript modules, internal scripts, etc

For package-specific instructions, see their AGENTS.md file, e.g `packages/compiler/AGENTS.md`.

### Test files:

- Test files are named `<name>.test.ts`
- Tests are executed with `bun test`
  - Except: `expo-runtime` tests can only be run using `node`/`jest`

---
