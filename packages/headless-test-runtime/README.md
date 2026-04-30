# `@tao/headless-test-runtime`

Headless React Native test harness for compiled Tao apps (no Expo, no device).

## Layout

- **`src/`** — compile helpers
  - `headless-compile.ts` — `compileTaoForHeadlessRuntime`, `regenerateAllHeadlessScenarioOutputs`, path constants
- **`tests/`** — Jest test files
  - `test-runtime.jest-test.tsx` — renders local RN components + shared scenario suite
  - `jest-watch-compiler-hook.ts` — touched by watch mode to trigger Jest re-runs
- **`scripts/`** — entry scripts
  - `regenerate-headless-test-apps.ts` — thin entry for `just regen-test-apps` (calls `regenerateAllHeadlessScenarioOutputs`)

## Entry point

No runtime entry — this is a test-only package. The main export is `src/headless-compile.ts`.

## How to test

```sh
just headless-test-runtime test
```

## Watch mode

`just headless-test-runtime watch` runs Jest + `watchexec` on `../compiler`. On compiler changes, it regenerates all scenario outputs and touches the hook file so Jest picks up the new outputs.

## Generated output

Scenario compile output goes under `.builds/headless-test-runtime/_gen-runtime-tests/` (outside this package) to avoid watch loops.
