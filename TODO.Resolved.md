#### Seed project components (2024-06-09)

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
