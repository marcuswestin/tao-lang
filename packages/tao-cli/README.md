# `@tao/tao-cli`

The `tao` CLI binary: compile and format Tao source files.

## Layout

- **`tao-cli.ts`** — package entry (calls `taoCliMain()`)
- **`cli-src/`** — implementation
  - `tao-cli-main.ts` — Commander program: `tao compile`, `tao fmt`; exports `TaoSDK_compile` for programmatic use
  - `hci-human-computer-interaction.ts` — user-facing output (colors, error mapping, verbose/debug modes)
  - `tao-sdk/sdk-format.ts` — file-level format helper (read, format, write-if-changed)
- **`cli-tests/`** — Bun integration tests (compile real apps, outputFileName, error-app)

## Entry point

`tao-cli.ts` — also the esbuild bundle input for the production `tao` binary.

## How to test

```sh
just cli test
```

## Commands

- `tao compile <path> --runtime-dir <dir> [--watch] [--std-lib-root <dir>]`
- `tao fmt <path> [--verbose]`
