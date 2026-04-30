# Tao Lang VS Code / Cursor extension

Language client for Tao Lang: LSP (parse, validate, format, go-to-definition), syntax highlighting, and related editor features.

## Layout

- **`extension-src/`** — hand-written TypeScript
  - `extension/main.ts` — VS Code extension client (activates language client, routes `Log` to output channel)
  - `language/main.ts` — language server entry (starts Langium services over IPC)
- **`extension-tests/`** — Bun smoke tests (bundled grammar existence)
- **`ide-syntaxes/`** — TextMate grammars (hand-maintained merge files + `_gen-syntaxes/` output)
- **`_gen-ide-extension/`** — **generated** esbuild bundle (`main.cjs`) plus copied `tao-std-lib/`
- **`esbuild.config.ts`** — bundle configuration

## Entry point

`extension-src/extension/main.ts` (VS Code `activate` / `deactivate`).

## Installation

1. Install from the marketplace or build from this package (see repository root `README.md` for extension dev notes).
2. Open a `.tao` file; the server starts automatically in development mode with an output channel.

## How to test

```sh
just ide-extension test
```

## Features

- Syntax highlighting, diagnostics, formatting, and navigation for `.tao` files.
