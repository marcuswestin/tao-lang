# `@tao/expo-runtime`

Expo React Native app shell and integration tests for compiled Tao applications.

## Runtime platforms

All Tao apps run in Expo, but the host platform differs:

- **iOS** — Expo + React Native, with any iOS-only native behavior implemented behind Swift/Objective-C bridges or Expo-native modules.
- **Android** — Expo + React Native, with any Android-only native behavior implemented behind Kotlin/Java bridges or Expo-native modules.
- **Web app** — Expo web through `react-native-web`; code runs in the browser and cannot assume native modules, mobile-only APIs, or Node/Bun APIs.
- **Headless tests** — `packages/headless-test-runtime/` renders compiled apps in Jest without Expo, devices, browser layout, or native bridges.

When building runtime-dependent behavior:

- Treat React Native/Expo as the authority for all UI runtime behavior: layout, styling, transforms, animation, gestures, accessibility, navigation, media, and platform APIs.
- Keep compiler output and `@tao/tao-runtime` helpers platform-neutral by default.
- Put platform branching in the Expo/runtime layer or a clearly named runtime helper, not inline throughout generated Tao app code.
- Treat React Native APIs as the common surface only after checking their web behavior under `react-native-web`.
- Treat native bridges as optional capabilities: provide a web/headless fallback, a validation error, or a deliberate runtime error with a clear message.
- Do not import Node/Bun-only modules into app runtime code that can be bundled by Metro or web.
- Verify platform-sensitive changes with the closest available harness: compiler/codegen tests for emitted shape, `headless-test-runtime` for generic RN behavior, `expo-runtime` tests for Expo integration, and manual Expo iOS/Android/web checks when native or browser behavior changes.

## Layout

- **`index.ts`** — direct Expo root entry that registers the generated Tao bootstrap with `registerRootComponent`
- **`tests-expo-runtime/`** — Jest integration tests (named to avoid Expo auto-discovery conflicts)
  - `test-runtime.jest-test.tsx` — renders compiled Tao output in JSDOM
  - `shared-scenarios.jest-test.tsx` — runs shared `Apps/Test Apps/` scenarios via the compiled scenario adapter
  - `tao-source-map-rewrite.jest-test.ts` — source map rewriting for Tao-to-Metro debugging
- **`_gen/`** — **generated** compiled Tao app output (bootstrap + runtime copies)
- **`tao-source-map-rewrite.cjs`** — Metro serializer plugin for Tao source maps

## Entry point

`index.ts` registers `runtime-entrypoint.ts` through Expo's `registerRootComponent`. `runtime-entrypoint.ts` imports the generated `_gen/tao-app/app-bootstrap` component, so both legacy `app { ui RootView }` apps and navigation-rooted apps boot through the direct entry.

## How to test

```sh
just expo-runtime test
```

## Device smoke

Use `Apps/Test Apps/App Shell Safe Area and Keyboard/App Shell Safe Area and Keyboard.tao` for plain UI-root safe-area and keyboard checks. Use `Apps/Test Apps/App Shell Safe Area and Keyboard Tabs/App Shell Safe Area and Keyboard Tabs.tao` for bottom-tab keyboard checks.

Checklist:

- iOS notch device: top content starts below the unsafe status-bar area.
- iOS home indicator: the bottom input and submit action can scroll above the keyboard and home indicator.
- Android edge-to-edge: top and bottom system UI do not cover content.
- Android keyboard: focusing `Bottom keyboard field` keeps the field visible.
- Android bottom tabs: focusing `Tabbed bottom field` hides the tab bar instead of pushing it awkwardly.
- Web: the fixture still scrolls through the normal web shell.

Useful local commands:

```sh
just dev roPhone "./Apps/Test Apps/App Shell Safe Area and Keyboard/App Shell Safe Area and Keyboard.tao"
just dev roPhone "./Apps/Test Apps/App Shell Safe Area and Keyboard Tabs/App Shell Safe Area and Keyboard Tabs.tao"
just expo-runtime android-start
just expo-runtime web
```

## Test file naming

Files use `*.jest-test.ts(x)` to distinguish from Bun's `*.test.ts` pattern used elsewhere in the monorepo. This prevents `bun test` from accidentally picking them up.
