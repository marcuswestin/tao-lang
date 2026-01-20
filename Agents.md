# Agents Guide

Best practices for AI agents working on the Tao Lang codebase.

## CRITICAL: Command Usage

**AI agents MUST ONLY use commands from `Justfile`:**

```bash
just <command recipe>
```

**Add new recipe if needed** to the Agent Commands section in Justfile. You **MUST ask for permission** before adding it

**NEVER merge changes into main branch without asking for permission first.**

## Agent Worktrees

When a worktree is created, a git hook is automatically run to setup the new worktree dev environment.

## Tooling

- **Bun** over Node.js for running scripts, tests, and builds
- **Just** for task running (Justfiles in root and each package)
- **mise** for tool version management (bun, node, just, dprint, oxlint)

## Project Structure

```
Justfile                 # *All* commands necessary to develop Tao Lang
packages/compiler/       # Langium-based parser/compiler for .tao files
packages/ide-extension/  # VSCode IDE extension for Tao Lang
packages/tao-cli/        # CLI tool built with Bun
packages/expo-runtime/   # React Native/Expo runtime for Tao apps
packages/shared/         # Tools & scripts for internal use
Apps/                    # Example .tao applications (e.g., Tao Studio)
Docs/                    # Language design documentation
.config/                 # Configuration files for the repo
.builds/                 # Build artifacts from the repo
TODO.md                  # Upcoming Projects and Tasks
TODO.Resolved.md         # Resolved Projects and Tasks
```

### Role of Each Package

- Compiler: The compiler is standalone, with an internal typescript API. It takes links to .tao files, and outputs a folder with typescript code to be run in the expo runtime.
- Expo Runtime: The expo runtime takes receives a compiled .tao app, and runs it in a React Native/Expo environment.
- Tao CLI: The cli is used to build apps with the compiler, run apps in expo runtimes, and more.
- Internal Tools: Scripts for more complex internal functionality than is appropriate for the Justfile

## Testing

- Use `bun test` with `bun:test` imports for `packages/compiler` and `packages/tao-cli`
- Use `jest` with `@testing-library/react-native` for `packages/expo-runtime`
- Test files live in `packages/<package>/tests - <package>/` directories
- Run all tests: `just test`
- Run tests for one package: `cd packages/<package> && just test`

## Available Commands

Run `just help` to list all available dev commands; and `just agent-help` to list additional available commands for agents. Key ones:

- `just test` - Run all tests
- `just pre-commit` - Run all checks.
- `just _agent-git <args>` - Execute git commands
- `just _agent-lint` - Run linting checks

## MCP Integration

mise exposes project tasks to AI agents via MCP. The tasks are auto-generated from Justfile recipes prefixed with `_agent-` into `.config/mise-gen-just-commands.toml`.

### Regenerating mise-gen-just-commands.toml

When `Agents.just` changes, regenerate the TOML file:

```bash
just _agent-mise-tasks-gen
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

# Hard and fast rules

- ALWAYS use `ast.isUseStatement`, NEVER use `if (statement.$type === 'UseStatement') {`
-
