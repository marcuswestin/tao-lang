# `@tao/expo-runtime`

Expo React Native app shell and integration tests for compiled Tao applications.

## Runtime platforms

All Tao apps run in Expo, but the host platform differs:

- **iOS** — Expo + React Native, with any iOS-only native behavior implemented behind Swift/Objective-C bridges or Expo-native modules.
- **Android** — Expo + React Native, with any Android-only native behavior implemented behind Kotlin/Java bridges or Expo-native modules.
- **Web app** — Expo web through `react-native-web`; code runs in the browser and cannot assume native modules, mobile-only APIs, or Node/Bun APIs.
- **Headless tests** — `packages/headless-test-runtime/` renders compiled apps in Jest without Expo, devices, browser layout, or native bridges.

When building runtime-dependent behavior:

- Keep compiler output and `@tao/tao-runtime` helpers platform-neutral by default.
- Put platform branching in the Expo/runtime layer or a clearly named runtime helper, not inline throughout generated Tao app code.
- Treat React Native APIs as the common surface only after checking their web behavior under `react-native-web`.
- Treat native bridges as optional capabilities: provide a web/headless fallback, a validation error, or a deliberate runtime error with a clear message.
- Do not import Node/Bun-only modules into app runtime code that can be bundled by Metro or web.
- Verify platform-sensitive changes with the closest available harness: compiler/codegen tests for emitted shape, `headless-test-runtime` for generic RN behavior, `expo-runtime` tests for Expo integration, and manual Expo iOS/Android/web checks when native or browser behavior changes.

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
