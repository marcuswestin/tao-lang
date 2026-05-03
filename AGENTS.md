# Tao Lang Agent Guide

## Command Safety

- `./just-agents` is the only supported way for agents to interact with this repo.
- Start every session with `./just-agents help`.
- Run shell commands as `./just-agents shell <cmd> <args>`.
- Do not run repo commands directly through `just`, `bun`, `npm`, `git`, or other tools.
- Do not edit `just-agents.Justfile` unless the user explicitly asks for agent command changes.

## Project

Tao Lang is a programming language for building native and web apps.

- `packages/parser/` contains the Langium grammar and generated AST.
- `packages/compiler/` contains validation, resolution, and code generation.
- `packages/formatter/` contains Tao source formatting.
- `packages/tao-cli/` contains the CLI.
- `packages/tao-std-lib/` contains the standard library.
- `packages/expo-runtime/` and `packages/headless-test-runtime/` run compiled Tao apps.
- `packages/shared/` contains shared TypeScript and project scripts.
- `Apps/Test Apps/` contains sample apps used to exercise language/runtime behavior.

## Approach

- Read existing files before writing, and re-read before editing if the file may have changed.
- Be thorough in reasoning and concise in user-facing output.
- Avoid loading large files wholesale unless required; use targeted search or chunks first.
- Do not use sycophantic openers, closing fluff, emojis, or em dashes.
- Do not guess APIs, versions, flags, commit SHAs, package names, or command behavior. Verify by reading repo code, local docs, or official docs before asserting.

## Conventions

- Read existing code before editing; prefer local patterns over new abstractions.
- Keep changes small, DRY, and direct. Extend existing APIs instead of adding parallel ones with the same behavior.
- Use `@shared/*` abstractions over direct Node/Bun APIs when available.
- Do not import generated files from main source code.
- Use the return type of invoked functions instead of redeclaring an identical type.
- Add JSDoc to exported or shared TypeScript functions: `/** fnName verbs description */`.
- For new language features, update validation and formatter behavior when applicable, add tests, and feature the behavior in at least one `Apps/Test Apps/` app.

## Testing

- General checks: `./just-agents check`.
- Full test suite: `./just-agents test`.
- Filtered tests: `./just-agents test <filter>`.
- Package commands: `./just-agents <package> <command> <args>`, for example `./just-agents compiler test`.
- Before landing work, run `./just-agents fix` and `./just-agents prep-commit` unless the user opts out.

## Git Safety

- Safe git browsing and staging goes through `./just-agents shell git status|diff|log|add|commit`.
- Do not use `./just-agents git-dangerously` for `fetch`, `checkout`, `switch`, `pull`, `merge`, `push`, `rebase`, or similar remote/merge work unless the user explicitly asks for that operation.
- After merging or rebasing `main` into a feature branch, run `./just-agents prep-commit` until green before treating the branch as merge-ready.
- Use `skills/git-workflow` for staging, committing, batch commits, and merge preparation.

## Skills

Canonical agent workflows live in `skills/`. Use the relevant skill for task-specific procedures such as code review, TODO work, git workflow, compiler work, Langium formatting/scoping, and agent-system maintenance.
