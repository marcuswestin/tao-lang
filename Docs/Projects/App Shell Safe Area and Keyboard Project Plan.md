# App Shell Safe Area and Keyboard Project Plan

## Summary

Harden Tao's generated Expo app shell so real-device apps respect safe-area insets and scroll focused inputs above the software keyboard by default. This project should make the generated root safe on notched iPhones, Android edge-to-edge devices, home-indicator screens, bottom-tab apps, and simple form screens without authors adding boilerplate.

The implementation should stay in generated app shell and runtime helpers. It should not add raw layout syntax, source styling syntax, or a general forms model.

## Research Basis

This plan uses repo research plus current React Native and Expo guidance:

- [Expo SDK 54 `react-native-safe-area-context`](https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/) says the library exposes device safe-area inset information for notches, status bars, home indicators, and related OS UI, and that apps need `SafeAreaProvider` at the app root.
- [React Native `SafeAreaView`](https://reactnative.dev/docs/safeareaview) is deprecated in favor of `react-native-safe-area-context`, so Tao should not build on RN core `SafeAreaView`.
- [React Native `KeyboardAvoidingView`](https://reactnative.dev/docs/keyboardavoidingview) adjusts height, position, or bottom padding based on keyboard height, but the `behavior` prop differs between Android and iOS.
- [React Native `ScrollView`](https://reactnative.dev/docs/scrollview) has useful keyboard props such as `automaticallyAdjustKeyboardInsets` on iOS, `keyboardDismissMode`, `keyboardShouldPersistTaps`, and Android `scrollsChildToFocus`.
- [Expo keyboard handling](https://docs.expo.dev/guides/keyboard-handling/) recommends `KeyboardAvoidingView` for simpler cases and `react-native-keyboard-controller` for larger scrollable entry forms; it also calls out Android `softwareKeyboardLayoutMode` and bottom tab keyboard behavior.
- [Expo SDK 54 `react-native-keyboard-controller`](https://docs.expo.dev/versions/v54.0.0/sdk/keyboard-controller/) includes `KeyboardAwareScrollView` and `KeyboardToolbar` support for iOS and Android and lists bundled version `1.18.5`.

## Start Here

Relevant current files:

- `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` emits the generated app bootstrap. UI roots currently render `AppUIView` directly inside `RN.ScrollView`; navigation roots wrap `AppNavigationRoot` in `SafeAreaProvider`.
- `packages/compiler/compiler-tests/6-test-codegen-navigation.test.ts` already asserts navigation bootstraps import and render `SafeAreaProvider`.
- `packages/expo-runtime/package.json` already depends on `react-native-safe-area-context` but does not currently depend on `react-native-keyboard-controller`.
- `packages/expo-runtime/app.json` has Android `edgeToEdgeEnabled: true` but no `softwareKeyboardLayoutMode`.
- `packages/expo-runtime/tests-expo-runtime/safe-area-context-mock.tsx` and `packages/headless-test-runtime/src/navigation-test-mocks.tsx` mock safe-area behavior for tests.
- `Docs/Tao Language Design/UI Layout Specification.md` explicitly defers safe-area and keyboard-aware layout from raw layout syntax.
- `Docs/Projects/Beautiful App Defaults MVP Project Plan.md` expects app-shell defaults to own safe area, scroll padding, keyboard-aware behavior, and web/tablet max-width behavior.

## Goals

- Wrap every generated Expo app root in one predictable safe-area provider.
- Apply safe-area insets to generated UI app shell content without double-padding React Navigation-managed screens.
- Make the default generated UI root keyboard-aware for native form screens.
- Preserve web behavior: web keeps the existing `ScrollView` path and safe-area context, but does not import native-only keyboard-controller behavior.
- Keep app-shell hardening separate from Tao layout syntax and component styling.
- Add test coverage that proves compiler output, runtime mocks, and generated shell styles are stable.
- Add a real-device smoke checklist for iOS notch/home-indicator devices and Android edge-to-edge keyboard behavior.

## Non-Goals

- No new Tao source syntax for safe areas, scroll containers, keyboard, forms, or layouts.
- No full forms model, field validation system, submit lifecycle, input binding overhaul, or keyboard toolbar customization API.
- No broad navigation redesign.
- No visual-defaults template work beyond preserving compatibility with existing app-shell defaults.
- No automated device farm or full visual regression system.
- No modal-specific safe-area or keyboard policy unless the current implementation naturally needs a root-level mock or helper boundary.

## Assumptions

- Tao UI and runtime semantics continue to target React Native and Expo.
- Expo SDK 54 remains the implementation baseline for this project unless the repo upgrades before implementation starts.
- `react-native-safe-area-context` is the safe-area authority.
- `react-native-keyboard-controller` is acceptable as a native runtime dependency if review confirms it works in the Tao Expo dev-client path and does not break web/headless tests.
- The first implementation should favor a robust default shell over author-facing configurability.
- Navigation screens may need different treatment from simple UI roots because React Navigation and bottom tabs already own some safe-area behavior.

## Ownership And Handoff

This project owns the non-visual app-shell safety layer:

- safe-area provider placement;
- deterministic plain-UI-root safe-area padding;
- keyboard avoidance and keyboard-aware scrolling defaults;
- Android keyboard configuration decisions;
- bottom-tab keyboard safety decisions;
- one focused safe-area and keyboard fixture;
- runtime and generated-bootstrap tests that prove the shell boundary works.

Beautiful App Defaults and Look Great By Default keep ownership of design-driven shell appearance: visual tokens, web/tablet max-width policy, component polish, status/splash tinting, font defaults, gutters that vary by selected design template, and broader design-debug output. After this project lands, update the priority-5 design-defaults docs or roadmap notes so overlapping safe-area, scroll-padding, and keyboard bullets are narrowed to visual polish on top of this mechanical shell.

## Implementation Steps

### 1. Establish A Tao App Shell Runtime Boundary

**Context:** Generated bootstrap code currently owns root shell behavior inline. That makes safe-area and keyboard behavior easy to add once, but hard to test and reuse. A Tao-owned runtime helper gives compiler output a stable target while keeping raw layout syntax unchanged.

**Concrete work:**

- Add platform-resolved runtime helpers under `packages/tao-std-lib/tao/tao-runtime/`, likely:
  - `AppShell.tsx` for shared types and non-platform helpers;
  - `AppShell.native.tsx` for safe-area and native keyboard imports;
  - `AppShell.web.tsx` for web-safe scroll behavior with no native-only keyboard-controller import.
- If the helper imports `react-native-safe-area-context` or `react-native-keyboard-controller`, add those packages to `@tao/std-lib` as peer dependencies and dev dependencies, and keep the concrete installed runtime versions in `packages/expo-runtime/package.json`.
- Export a provider/root wrapper that owns:
  - `SafeAreaProvider`;
  - root background and content styles received from generated bootstrap props;
  - a native/web platform branch for scroll shell behavior;
  - a narrow prop contract for `kind: "ui" | "navigation"` and optional runtime-ready callback plumbing.
- Do not import generated `./tao-design` from the std-lib helper. Generated bootstrap should continue to read `TaoDesignProvider`, `resolveStyle`, and `useTaoDesignContext` from generated `tao-design.ts`, then pass resolved shell values into `AppShell`.
- Use an API shape close to:

  ```ts
  export interface TaoAppShellProps {
    kind: 'ui' | 'navigation'
    backgroundColor: string | number
    contentStyle?: RN.StyleProp<RN.ViewStyle>
    onRuntimeReady?: () => void
    children: React.ReactNode
  }
  ```

- Do not pass `initialWindowMetrics` in the first implementation unless the implementation proves the generated provider is not remounted by dev-client reloads or runtime root replacement.
- Keep the helper internal to generated app/runtime output. Do not expose it as Tao source syntax.
- Add or update Jest mocks for external native modules and platform/inset inputs. Do not mock `AppShell` itself in tests that claim to validate shell behavior.

**Likely commit units:**

- Runtime `AppShell` helper and exports.
- `@tao/std-lib` dependency/peer dependency declarations if the helper imports external modules.
- Test mocks for external safe-area and keyboard modules.
- Focused runtime tests for safe-area padding calculation with mocked insets.

**Validation:**

- `./agent expo-runtime test`
- `./agent headless-test-runtime test`

Intermediate commits in this step can defer full `./agent check` until the helper is wired into generated bootstrap.

**Exit criteria:** A reusable Tao runtime helper can render UI and navigation roots under a single safe-area provider in tests, with mocked insets producing deterministic shell padding.

**Suggested commit subject pattern:** `feat(runtime): add tao app shell helper`

### 2. Wire Generated App Bootstraps Through The Shell

**Context:** `app-gen-main.ts` should stop open-coding the app root shell. The compiler should emit imports and JSX for the runtime helper so future shell changes do not require large generated-code string edits.

**Concrete work:**

- Update `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` so UI roots render through the new shell helper instead of direct `RN.ScrollView`.
- Update navigation root output so `SafeAreaProvider` is not special-cased only for navigation in generated code.
- Preserve `TaoDesignProvider` ordering so shell background and shell spacing can still read the design context.
- Preserve `onRuntimeReady` behavior for navigation roots.
- Add compiler tests for:
  - UI bootstrap imports the shell helper;
  - navigation bootstrap imports the shell helper;
  - UI root no longer directly emits the old bare `RN.ScrollView` shell;
  - generated output still uses `TaoDesignProvider`;
  - navigation still passes `onRuntimeReady`.

**Likely commit units:**

- Codegen import and JSX changes.
- Compiler tests for UI roots.
- Compiler tests for navigation roots.

**Validation:**

- `./agent compiler test "bootstrap"`
- `./agent compiler test "navigation"`

Name new compiler tests with `bootstrap` in the test or describe text so the filtered command selects them. Intermediate commits may skip tests while generated output is in motion, but the step is not complete until both filtered compiler test groups pass.

**Exit criteria:** All generated app roots enter through the same shell boundary, and existing navigation behavior remains intact.

**Suggested commit subject pattern:** `feat(compiler): emit tao app shell wrapper`

### 3. Apply Safe-Area Insets Without Double Padding

**Context:** Safe-area handling has two different jobs: the app root must know device insets, and the visible content frame must avoid the unsafe top and bottom regions. Navigation roots also need care because React Navigation already handles safe areas for many headers, tabs, and screen containers.

**Concrete work:**

- In the runtime shell helper, apply safe-area padding to plain UI roots:
  - `paddingTop = baseTopPadding + insets.top`;
  - `paddingBottom = baseBottomPadding + insets.bottom`;
  - `paddingLeft = baseHorizontalPadding + insets.left`;
  - `paddingRight = baseHorizontalPadding + insets.right`.
- For navigation roots:
  - keep the safe-area provider at the root;
  - avoid adding an extra all-screen padding layer around the navigator by default;
  - add a documented helper or option only if generated navigation screens need Tao-owned safe-area content padding later.
- Ensure web safe-area still works through `SafeAreaProvider` and hook/context values, but does not require CSS env variables in generated code.
- Keep top and bottom insets visible in debug/test output where shell debug output already exists or is added by the app-shell default work.

**Likely commit units:**

- UI-root safe-area padding behavior.
- Navigation-root no-double-padding behavior.
- Safe-area tests for mocked top, bottom, left, and right values.

**Validation:**

- `./agent expo-runtime test`
- `./agent headless-test-runtime test`
- `./agent compiler test "bootstrap"`

Manual smoke after implementation should include an iPhone-class simulator or device with notch/home indicator and one Android edge-to-edge device.

**Exit criteria:** Plain UI roots visibly avoid notches and the home indicator, while navigation roots keep provider coverage without obvious double insets.

**Suggested commit subject pattern:** `feat(runtime): apply safe area in app shell`

### 4. Decide Keyboard Strategy With An Import Boundary Gate

**Context:** `react-native-keyboard-controller` is the richer native path, but it adds a native dependency and must not leak into web or headless runtime resolution. This needs a quick implementation gate before the plan commits the rest of the project to it.

**Concrete work:**

- Verify the Expo SDK 54-compatible `react-native-keyboard-controller` version with the current Expo runtime dependency set.
- Add the package only behind a small proof commit or spike that verifies:
  - Expo dev-client native import works on iOS and Android;
  - Reanimated/worklets prerequisites are already satisfied by the runtime;
  - Jest can mock or map only external keyboard-controller modules;
  - `AppShell.web.tsx` and headless tests do not import or resolve keyboard-controller;
  - the shared type surface does not require native-only values on web.
- If the gate fails, keep this project scoped to safe-area plus a conservative `KeyboardAvoidingView`/`ScrollView` baseline and move keyboard-controller adoption to the deferrals.
- Record the chosen strategy in the plan implementation notes or final project docs before proceeding to keyboard-aware scroll work.

**Likely commit units:**

- Keyboard-controller compatibility proof and dependency update, if accepted.
- Web/headless import-boundary assertion.
- Deferral note if keyboard-controller is not accepted.

**Validation:**

- `./agent expo-runtime test`
- `./agent headless-test-runtime test`
- Native dev-client smoke on iOS and Android if keyboard-controller is accepted.

**Exit criteria:** The implementation path either proves keyboard-controller is safe for Tao's Expo runtime or explicitly narrows this project to the conservative React Native baseline.

**Suggested commit subject pattern:** `chore(runtime): verify keyboard shell strategy`

### 5. Add Keyboard-Aware Native Scroll Behavior

**Context:** A static bottom padding is not enough for forms. Expo's current guidance treats `KeyboardAvoidingView` as useful for simple cases but points larger scrollable forms toward `react-native-keyboard-controller` and `KeyboardAwareScrollView`.

**Concrete work:**

- If Step 4 accepted keyboard-controller, wrap native UI root content in `KeyboardProvider` and use `KeyboardAwareScrollView` for native UI roots with:
  - shell `contentContainerStyle` preserving current app frame padding;
  - `bottomOffset` derived from safe-area bottom plus shell spacing;
  - `keyboardShouldPersistTaps` behavior that keeps form actions usable;
  - `keyboardDismissMode` where supported and not harmful.
- If Step 4 rejected keyboard-controller for this slice, use `KeyboardAvoidingView` plus `RN.ScrollView` with the safest cross-platform props the runtime supports.
- Keep web on `RN.ScrollView` and use React Native `ScrollView` keyboard props that make sense for web/native parity.
- Add a conservative fallback path or test mock so headless/runtime tests do not require native keyboard-controller internals.
- Do not add `KeyboardToolbar` by default in this project. Leave toolbar and input navigation customization to Forms and Inputs.

**Likely commit units:**

- Dependency and lockfile update.
- Native app-shell keyboard provider and scroll replacement.
- Web/headless fallback and mocks.
- Runtime tests for selected shell component by platform.

**Validation:**

- `./agent expo-runtime test`
- `./agent headless-test-runtime test`
- `./agent compiler test "bootstrap"`

Full `./agent check` can wait until the step is complete because dependency, mocks, and codegen will likely move together.

**Exit criteria:** A simple Tao form on native scrolls the focused input above the keyboard without author-authored layout boilerplate, while web and headless tests remain deterministic.

**Suggested commit subject pattern:** `feat(runtime): make app shell keyboard aware`

### 6. Harden Android And Navigation Keyboard Edge Cases

**Context:** Android keyboard behavior and bottom tabs are the likely real-device failure points. Expo guidance calls out `softwareKeyboardLayoutMode` and bottom-tab keyboard handling explicitly.

**Concrete work:**

- Review `packages/expo-runtime/app.json` and generated runtime expectations for Android `softwareKeyboardLayoutMode`.
- Add `android.softwareKeyboardLayoutMode: "pan"` only if implementation testing confirms it is the correct Tao default with the keyboard-controller shell and current edge-to-edge setup.
- Review generated bottom-tab navigator options and decide whether Tao should set `tabBarHideOnKeyboard: true` by default for generated tabs.
- If `tabBarHideOnKeyboard` is added, cover it in navigation codegen tests and keep the option easy to revisit when Forms and Inputs owns richer keyboard policy.
- Document any remaining navigation-specific limitations in the plan review or a follow-up note before implementation starts.

**Likely commit units:**

- Android app config default, if adopted.
- Bottom-tab keyboard option, if adopted.
- Tests for generated navigation options or app config fixture.

**Validation:**

- `./agent compiler test "navigation"`
- `./agent expo-runtime test`
- Android dev-client smoke on a form screen with and without bottom tabs.

**Exit criteria:** Android keyboard behavior has an explicit repo-owned default or an explicit deferred decision, and bottom tabs do not cover or get awkwardly pushed above active form inputs in the primary smoke path.

**Suggested commit subject pattern:** `feat(runtime): harden android keyboard defaults`

### 7. Add A Focused Fixture And Device Smoke Checklist

**Context:** Safe-area and keyboard issues are easy to miss in Jest. This project needs a small fixture and a plain manual checklist that future agents can run on real devices or simulators.

**Concrete work:**

- Add or update an `Apps/Test Apps/` fixture with:
  - a long enough form to require scrolling;
  - at least one input near the bottom;
  - a primary action below the final input;
  - enough top content to show notch/status-bar safety;
  - navigation variant coverage if generated navigation roots are part of the final behavior.
- Add a short manual smoke checklist to the plan or an adjacent runtime README section:
  - iOS notch device: content starts below unsafe top area;
  - iOS home indicator: final action can scroll above bottom inset and keyboard;
  - Android edge-to-edge: top/bottom system UI does not cover content;
  - Android keyboard: focused bottom input remains visible;
  - web: content still scrolls and does not import native-only keyboard code.
- Keep screenshots optional unless the implementation pass already has an easy local capture path.

**Likely commit units:**

- Test app fixture.
- Runtime or compiler fixture test proving it compiles.
- README/checklist update.

**Validation:**

- `./agent compiler test`
- `./agent expo-runtime test`
- Manual iOS and Android smoke commands recorded in the implementation notes.

**Exit criteria:** The repo has a repeatable fixture and checklist that demonstrates the safe-area and keyboard behavior this project claims.

**Suggested commit subject pattern:** `test(runtime): add app shell device fixture`

### 8. Final Integration And Regression Pass

**Context:** This project touches generated code, runtime dependencies, mocks, and native behavior. It needs a final integration pass even if each step passed filtered tests.

**Concrete work:**

- Run the complete repo checks after all implementation steps.
- Confirm generated app output still compiles for existing Kitchen Sink, Data Schema, Layout, and navigation examples.
- Confirm `Beautiful App Defaults MVP` still has a clean path to add web max-width and visual tokens on top of the hardened shell.
- Update overlapping Beautiful App Defaults and Look Great By Default notes if this project has already handled their mechanical safe-area, scroll-padding, or keyboard bullets.
- Update roadmap status after implementation according to the project workflow.

**Likely commit units:**

- Final test/mocks cleanup.
- Documentation note for any deferred edge case.
- Roadmap status update when implementation moves beyond planning.

**Validation:**

- `./agent check`
- `./agent test`
- `./agent prep-commit` before any final commit or merge prep.

**Exit criteria:** Generated apps keep existing runtime behavior, real-device shell behavior is safer, and any remaining limitations are explicit.

**Suggested commit subject pattern:** `chore(runtime): validate app shell hardening`

## Validation Summary

Docs-only plan validation:

- `./agent dprint check --incremental=false`
- `./agent git diff --check`

Implementation validation:

- `./agent compiler test "bootstrap"`
- `./agent compiler test "navigation"`
- `./agent compiler test "codegen"`
- `./agent expo-runtime test`
- `./agent headless-test-runtime test`
- `./agent check`
- `./agent test`
- Manual iOS notch/home-indicator smoke.
- Manual Android edge-to-edge keyboard smoke.

## Implementation Notes

- 2026-05-20 Step 4: accepted `react-native-keyboard-controller` for the native UI shell path. Expo SDK 54 lists bundled version `1.18.5`, and the Tao Expo runtime already carries `react-native-reanimated` and `react-native-worklets`. The concrete package is installed only in the Expo runtime; `@tao/std-lib` keeps it as an optional peer/dev dependency so web and headless paths do not need native keyboard-controller resolution. Native iOS and Android dev-client smoke remains part of the device checklist/final validation.
- 2026-05-20 Step 6: adopted Expo's documented Android bottom-tab keyboard mitigation with `android.softwareKeyboardLayoutMode: "pan"` in the Expo runtime config, and set generated bottom-tab navigators to `tabBarHideOnKeyboard: true`. Jest coverage now verifies both defaults, but physical Android bottom-tab keyboard smoke remains pending.
- 2026-05-20 Step 7: added the `App Shell Safe Area and Keyboard` shared fixture with a long plain UI-root form, bottom text input, and bottom submit action. The Expo runtime README now records the real-device smoke checklist and local commands; manual iOS and Android device smoke remains pending and is not yet a validated real-device claim.
- 2026-05-20 Step 8: updated the roadmap status to `Implemented` and narrowed overlapping Beautiful App Defaults / Look Great By Default ownership so future visual-defaults work builds on this hardened shell instead of reimplementing mechanical safe-area and keyboard behavior.
- 2026-05-29 implementation review: added the `App Shell Safe Area and Keyboard Tabs` shared fixture so generated bottom-tab keyboard defaults have a tabbed smoke path. Generated navigation screen content remains unwrapped; this project owns bottom-tab hide-on-keyboard defaults, while navigation-screen keyboard-aware scrolling requires a future explicit screen/forms policy.
- 2026-05-29 implementation review: the branch also contains `6bef32b` (`docs(skills): review project plans with subagents`), an intentional companion workflow-skill change requested before implementation. It is not part of the app-shell runtime behavior.
- 2026-05-29 implementation review: the branch also contains `074688f` (`Update dprint deps`), a companion formatter-tooling refresh committed separately from the runtime implementation.

## Deferrals

- Source-level safe-area, keyboard, form, or scroll syntax.
- Keyboard toolbar customization and input next/previous navigation.
- Keyboard-controller adoption if the import-boundary gate fails.
- Modal, sheet, drawer, and overlay-specific keyboard policy.
- Full Forms and Inputs project ownership.
- Navigation screen keyboard-aware scrolling policy for form-heavy routes.
- Automated visual regression across a real-device matrix.
- Safe-area behavior for future non-Expo runtime targets.
