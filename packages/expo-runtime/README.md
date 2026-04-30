# `@tao/expo-runtime`

Expo React Native app shell and integration tests for compiled Tao applications.

## Layout

- **`app/`** — Expo Router app shell (renders compiled Tao bootstrap)
- **`tests-expo-runtime/`** — Jest integration tests (named to avoid Expo auto-discovery conflicts)
  - `test-runtime.jest-test.tsx` — renders compiled Tao output in JSDOM
  - `shared-scenarios.jest-test.tsx` — runs shared `Apps/Test Apps/` scenarios via the compiled scenario adapter
  - `tao-source-map-rewrite.jest-test.ts` — source map rewriting for Tao-to-Metro debugging
- **`_gen/`** — **generated** compiled Tao app output (bootstrap + runtime copies)
- **`tao-source-map-rewrite.cjs`** — Metro serializer plugin for Tao source maps

## Entry point

`app/index.tsx` — Expo Router entry that imports the generated bootstrap.

## How to test

```sh
just expo-runtime test
```

## Test file naming

Files use `*.jest-test.ts(x)` to distinguish from Bun's `*.test.ts` pattern used elsewhere in the monorepo. This prevents `bun test` from accidentally picking them up.
