# Tao Agent Guide

## SETUP

When starting in a new worktree (or fresh repo clone), the very first thing you must do is:

1. Run bootstrap: `bash .config/bootstrap-dev-env.sh`.
2. Run setup if bootstrap was skipped because tools already exist: `./agent setup`.
3. Create a new appropriately named branch: `./agent git-create-branch <branch-name>`.

## Dev environment (Nix / devenv)

Repo-wide development dependencies come from **Nix** via **[devenv](https://devenv.sh)**; see **`devenv.nix`**. Bootstrap installs Nix (if needed), **devenv**, and **direnv**, then runs **`devenv shell -- ./agent setup`**. With **direnv** allowed in this repo, shells load **`TAO_DEVENV=1`**.

Use **`skills/nix-devenv`** when adding shared CLI packages, or when debugging **PATH** / compiler mix-ups (for example Xcode versus Nix **clang** on macOS).

## Command Safety

- `./agent` is the only supported way for agents to interact with this repo.
- Start every session with `./agent help`.
- Use the named commands exposed by `./agent help`, for example `./agent rg <pattern>`, `./agent cat <path>`, and `./agent git status`.
- Git: use **`./agent git …`** (same arguments you would pass to `git`; `./agent git` forwards to the `git` CLI).
- `./agent` is the effective whitelist of allowed commands for agents in this repo.
- Do not run repo commands directly through `just`, `bun`, `npm`, `git`, or other tools.
- Do not edit `agent.Justfile` unless the user explicitly asks for agent command changes.

## Project

Tao is a programming language for building native and web apps.

- Required product principles live in `CORE_TENETS.md`. Read and preserve them for all design, implementation, documentation, and review work.
- React Native and Expo are the runtime authority for Tao UI/app behavior. Layout, styling, transforms, animation, gestures, accessibility, navigation, media, and platform features must map to React Native/Expo support, a Tao-owned runtime helper, or an explicit validation/runtime error.
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
- If one issue takes multiple failed or partial approaches, use `skills/multi-pass-debugging`, keep a working notes document, and re-research the owning layer before adding more shims.
- When you notice repo, tooling, documentation, workflow, or performance problems during normal work, use `skills/repo-issue-notes` and add a brief dated note to `agent-issues.md` before finishing. Do not derail the current task for non-blocking cleanup.
- Do not use sycophantic openers, closing fluff, emojis, or em dashes.
- Do not guess APIs, versions, flags, commit SHAs, package names, or command behavior. Verify by reading repo code, local docs, or official docs before asserting.

## Conventions

- Read existing code before editing; prefer local patterns over new abstractions.
- Keep changes small, DRY, and direct. Extend existing APIs instead of adding parallel ones with the same behavior.
- Use `@shared/*` abstractions over direct Node/Bun APIs when available.
- Do not import generated files from main source code.
- Use the return type of invoked functions instead of redeclaring an identical type.
- Add JSDoc to exported or shared TypeScript functions: `/** fnName verbs description */`.
- Format markdown tables for plain-text readability: pad cells so column pipes align vertically instead of using the shortest renderer-valid table form.
- For new language features, update validation and formatter behavior when applicable, add tests, and feature the behavior in at least one `Apps/Test Apps/` app.

## Testing

- General checks: `./agent check`.
- Full test suite: `./agent test`.
- Filtered tests: `./agent test <filter>`.
- Package commands: `./agent <package> <command> <args>`, for example `./agent compiler test`.
- Before landing work, run `./agent fix` and `./agent prep-commit` unless the user opts out.

## Git Safety and Workflow

- Use **`./agent git …`** for all git operations (see Command Safety).
- You **MUST** run **`./agent prep-commit`** before **`./agent git commit`** (or any other commit-creating git invocation, such as `git commit` via `./agent git`) unless the user explicitly instructs you to skip it.
- Remote, rebase, checkout, switch, pull, and push are not separate `./agent` recipes; if you use them via `./agent git`, do so only when the user or an agreed workflow requires it.
- Unless you are making a commit, **NEVER** stage your changes. I depend on stage for ongoing change review. If you require staging changes for some other reason, ask first.
- After merging or rebasing `main` into a feature branch, run `./agent prep-commit` until green before treating the branch as merge-ready.
- Use `skills/git-workflow` for staging, committing, batch commits, and merge preparation.
- **Merging into `main`:** Always **squash merge** feature branches into `main`. The squash commit message must include (in order): **one subject line**, a **short overview bullet list** (no fine-grained detail), then the **full `Squashed commit of the following:` appendix** with every original squashed commit exactly as Git’s default squash message includes them—see **`skills/git-workflow`** (“Squash merge into `main`”).

## Skills

Canonical agent workflows live in `skills/`. Use the relevant skill for task-specific procedures such as code review, TODO work, git workflow, compiler work, Langium formatting/scoping, and agent-system maintenance.
