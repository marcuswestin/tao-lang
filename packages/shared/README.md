# `@tao/shared`

Utilities, testing helpers, Just recipes, and scripts shared across all Tao packages.

## Layout

- **`shared-src/`** — runtime utilities exported via `@shared` (FS, Log, Assert, Streams, switch\_safe, TaoErrors, etc.)
  - **`shared-src/testing/`** — test-only exports available via `@shared/testing` (scenarios, snippets, runtime helpers, Bun SDK)
- **`shared-tests/`** — Bun tests for shared utilities
- **`just/`** — shared Just recipe fragments imported by the root `Justfile`
- **`scripts/`** — CLI tools and hooks (e.g. `q-dev` commander program, IDE syntax gen, cursor hooks)

## Entry point

`shared.ts` — the barrel re-exported as `@shared` via `tsconfig.base.json` paths.

## How to test

```sh
just shared test
```

## Recipe index (`just/`)

| File                           | Key recipes                             |
| ------------------------------ | --------------------------------------- |
| `_shared-vars.just`            | Shared variables and paths              |
| `deps-helpers.just`            | `_bun_deps`, dependency install helpers |
| `setups.just`                  | One-time setup recipes                  |
| `ps-grep-and-filter.just`      | Process grep/filter utilities           |
| `dev-cmds.just`                | `_build_all`, `_prep_commit`, `_clean`  |
| `fix-fmt-check.just`           | `_fix`, `_fmt`, `_check`, `_lint`       |
| `dev-watch.just`               | `_watch`, `_dev`                        |
| `parallel-and-concurrent.just` | Parallel/concurrent execution helpers   |
| `env-guards.just`              | Environment variable guard recipes      |
