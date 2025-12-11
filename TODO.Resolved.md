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
