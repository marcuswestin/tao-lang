# Agents Guide

Best practices for AI agents working on the Tao Lang codebase.

## CRITICAL: Command Usage

**AI agents MUST ONLY use commands from `Justfile`:**

```bash
just <command recipe>
```

**Add new recipe if needed** to the Agent Commands section in Justfile. You **MUST ask for permission** before adding it

## Tooling

- **Bun** over Node.js for running scripts, tests, and builds
- **Just** for task running (Justfiles in root and each package)
- **mise** for tool version management (bun, node, just, dprint, oxlint)

## Project Structure

```
packages/compiler/       # Langium-based parser/compiler for .tao files
packages/tao-cli/        # CLI tool built with Bun
packages/internal-tools/ # Scripts for internal use
packages/expo-runtime/   # React Native/Expo runtime for Tao apps
Apps/                    # Example .tao applications (e.g., Tao Studio)
Docs/                    # Language design documentation
```

## Code Style

- **Formatter**: just fmt
- **Linter**: just lint

## Testing

- Use `bun test` with `bun:test` imports for `packages/compiler` and `packages/tao-cli`
- Use `jest` with `@testing-library/react-native` for `packages/expo-runtime`
- Test files live in `packages/<package>/tests - <package>/` directories
- Run all tests: `just test`
- Run tests for one package: `cd packages/<package> && just test`

## Available Commands

Run `just help` to list all available commands. Key ones:

- `just test` - Run all tests
- `just fmt` - Format and lint code

## MCP Integration

mise exposes project tasks to AI agents via MCP. The tasks are auto-generated from Justfile recipes prefixed with `_agent-` into `.config/mise-gen-just-commands.toml`.

### Regenerating mise-gen-just-commands.toml

When `Agents.just` changes, regenerate the TOML file:

```bash
just _agent-gen-mise-tasks
```

This extracts all public recipes from `Justfile` and generates `.config/mise-gen-just-commands.toml` for mise MCP.

## Command Design Principles

Commands in `Justfile` follow DRY (Don't Repeat Yourself) principles:

- **Favor fewer commands with arguments** over many one-off commands
- Commands should be reusable and composable
- If you need a new command, ask for permission first

## Development Workflow

1. Always use `just <command>` for any task
2. Format code before committing: `just fmt`
3. Run tests: `just test`
