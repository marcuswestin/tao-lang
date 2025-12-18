#### Build & Dev Workflow Improvements (2025-12-18)

- [x] Rename `gen-mise-tasks` → `mise-tasks-gen` for consistency across all files
- [x] Add numbered prefixes to cursor commands for logical ordering (1-, 2-, 3-)
- [x] Create `1-check-for-improvements.md` pre-commit review command
- [x] Make oxlint respect .gitignore with `--ignore-path .gitignore` flag
- [x] Add `tsc` to compiler build step
- [x] Setup now builds all packages after installation
- [x] Add `git-stage-and-test` recipe for testing staged changes in isolation
- [x] Add `backups` and `staging-area` to .gitignore

#### Test Infrastructure & Error Handling (2025-12-18)

- [x] Extension validation isn't working. Try e.g `Person ro` which should warn; or an incorrect reference.
- [x] Write basic validation tests
- [x] Use Bun to build extension instead of esbuild script
- [x] Create "watch" command that watches _all_ components and auto rebuilds. Save expo and interactive tests for last. Then add those either together or separaterly
- [x] Refactor test harness with staged validation helpers (`lexTokens`, `parseAST`, `resolveReferences`, `parseTaoFully`)
- [x] Redesign error system with `UserInputRejection`, `UnexpectedBehavior`, `NotYetImplemented` error types
- [x] Remove Bun-specific APIs from parser for Node.js compatibility
- [x] Add `--runtime-dir` required option to CLI compile command
- [x] Add HCI (human-computer interaction) module for consistent user messaging
- [x] Clean up just file naming (`_vars.just` → `_shared-vars.just`, etc.)

#### Get extension working (2025-12-11)

- [x] Create basic vscode extension, and automate installation into current cursor instance.
- [x] Hook up inter-package imports and builds.
- [x] Use bun in extension instead of node/npm.
- [x] Commit Docs

#### Agent Setup (2024-06-11)

- [x] Write Agents.md
- [x] Get mise mcp running while in dev mode

Prompt:

    Create Agents.md for this project. Do a careful search through the project to consider a succinct best practices Agents.md file. Make sure to setup ability to use mise mcp, including generating a .config/mise-gen-just-commands.toml, by either reading the output of `just help` or using the just dump function to generate toml. Create an `Agents.just` file, and instruct all agents to ONLY EVER use `just --justfile Agents.just <cmd>` commands; and that if there is need for a command that isn't available, then ask for permission to add a just command to do it. Keep justfile commands DRY, and favor fewer commands with passed in args, over many one-off commands.

#### Seed project components (2024-06-10)

- [x] Seed compiler
  - [x] packages/language
- [x] Seed cli
  - [x] package/tao-cli
- [x] Seed Runtime
  - [x] package/runtime
- [x] Seed test suites
  - [x] packages/language/tests/compile-tao-studio.test.ts
  - [x] packages/runtime/tests/views.test.ts
- [x] Cleanups
  - [x] Use `set quiet` in main Justfile
  - [x] Replace `"module": "Preserve",` with `"module": "ESNext",`
  - [x] Fix ts errors in langium generated code. Set which ts library w `"typescript.tsdk": "path to node_modules/typescript/lib"`?

#### Dev Env Automation (2024-06-10)

- [x] README.md
- [x] Justfile
- [x] mise tools
- [x] idempotent `just setup` with `enter-tao` command
