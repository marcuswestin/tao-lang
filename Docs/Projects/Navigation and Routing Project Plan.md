# Navigation and Routing Project Plan

## Summary

Implement Tao navigation v1 as semantic app navigation compiled to React
Navigation 7 static config. The project replaces `app { ui RootView }` with
`app { navigation MainNavigation }`, adds top-level `navigator` declarations,
supports stacks and tabs, adds optional primitive paths/params, and exposes
simple navigation actions.

## Goals

- Add first-class Tao syntax for navigators, stacks, tabs, screens, and tab
  destinations.
- Keep pathless screens valid by default.
- Support optional `path` and primitive `param` metadata for addressable screens.
- Compile Tao navigation to React Navigation 7 static config.
- Remove Expo Router once direct React Navigation app entry works.
- Add parser, validation, formatter, codegen, runtime, and example coverage.

## Non-Goals

- No drawer implementation in v1.
- No route guards, auth flow syntax, route loading/error semantics, or protected
  routes in v1.
- No React Navigation 8 dependency in v1.
- No Liquid Glass or platform material syntax.
- No arbitrary object params.
- No native-only mobile backend or separate web router backend in v1.
- No generated public route documentation.

## Assumptions

- React Navigation 7 remains the v1 target while the repo is on Expo 54 and
  React Native 0.81.
- `navigator` grammar can live in `packages/parser/tao-navigation.langium` and
  be imported from `packages/parser/tao-grammar.langium`.
- The implementation can update existing test apps from app-level `ui` to
  app-level `navigation`.
- Existing view declarations remain the visual screen bodies.
- Navigation params are either passed into the target view as generated props or
  exposed through a small runtime helper; the implementation should choose the
  simpler path that keeps view type checking reliable.

## Implementation Steps

### 1. Add Navigation Grammar

Context: Tao needs parseable navigation declarations before compiler behavior can
be implemented.

Work:

- Add `packages/parser/tao-navigation.langium`.
- Import the navigation grammar from `packages/parser/tao-grammar.langium`.
- Add `NavigatorDeclaration` to top-level declarations.
- Add `AppNavigationStatement` to app statements.
- Add grammar for `stack`, `tabs`, `screen`, `tab`, `title`, `icon`, `role`,
  `path`, and `param`.
- Add action-body grammar for `navigation push`, `navigation pop`, and
  `navigation tab`.
- Preserve existing `ui` app syntax only as needed for a transition, or replace
  parser coverage if the implementation can migrate all current apps in the same
  branch.

Validation:

- Parser tests cover shorthand destinations, explicit targets, option bodies,
  params, paths, tabs, stacks, and navigation actions.
- Run `./agent gen` after grammar changes.

Exit criteria:

- Navigation examples parse into generated AST nodes.
- Existing non-navigation parser tests remain green.

Suggested commit: `feat(navigation): add parser syntax`

### 2. Add Validation And Scoping

Context: Navigation declarations need semantic checks before codegen can rely on
them.

Work:

- Add scoping support so app navigation references resolve to navigators.
- Validate exactly one app navigation statement.
- Validate each navigator has exactly one `stack` or `tabs` body.
- Validate destination names are unique within a navigator.
- Validate omitted targets resolve by destination name.
- Validate explicit targets reference a view-like declaration or another
  navigator.
- Validate destination options and reject unsupported placement.
- Validate params are `text`, `number`, or `boolean`.
- Validate path placeholders have matching params.
- Validate action targets and param payloads against declared destinations.

Validation:

- Compiler validation tests cover duplicate names, bad references, wrong option
  placement, invalid param types, missing params, extra params, path/param
  mismatch, and missing app navigation.

Exit criteria:

- Invalid navigation shapes produce clear diagnostics.
- Valid stack and tab examples validate cleanly.

Suggested commit: `feat(navigation): validate navigators`

### 3. Add Formatter Coverage

Context: Navigation syntax should format consistently before it appears in
canonical examples.

Work:

- Add formatter support for `navigator` declarations.
- Format destination option bodies as one option statement per line.
- Format navigation action payload blocks consistently with create/update-style
  blocks.

Validation:

- Formatter tests cover stack, tabs, options, params, paths, and action payloads.
- Formatting is idempotent.

Exit criteria:

- Navigation source remains stable after repeated formatting.

Suggested commit: `feat(navigation): format navigator syntax`

### 4. Build Navigation IR And Codegen

Context: Tao should lower to an internal navigation model before targeting React
Navigation.

Work:

- Collect the app root navigator from the entry Tao file.
- Build a serializable Tao navigation IR for stacks, tabs, destinations, options,
  paths, params, and target component names.
- Generate React Navigation 7 static config from the IR.
- Lower `stack` to `createNativeStackNavigator`.
- Lower `tabs` to `createBottomTabNavigator`.
- Lower the root navigator through `createStaticNavigation`.
- Lower optional paths and params to screen-level linking metadata.
- Keep generated screen components wrapping the target Tao view or nested
  navigator.

Validation:

- Codegen tests assert generated static config shape for stack and tabs.
- Codegen tests assert linking metadata for `path` and `param`.
- Codegen tests cover nested navigator targets.

Exit criteria:

- A compiled Tao app can generate a React Navigation root from a Tao navigator.

Suggested commit: `feat(navigation): generate react navigation config`

### 5. Add Runtime Navigation Actions

Context: Tao actions need a backend-neutral way to drive navigation.

Work:

- Add Tao runtime navigation helpers for push, pop, and tab selection.
- Wire helpers to a React Navigation root navigation ref or equivalent runtime
  context.
- Lower `navigation push`, `navigation pop`, and `navigation tab` statements to
  helper calls.
- Convert declared param payloads into React Navigation params.
- Fail clearly if navigation actions run before navigation is ready.

Validation:

- Runtime/headless tests cover push, pop, tab selection, and primitive param
  delivery.
- Codegen tests assert action statements lower to navigation helper calls.

Exit criteria:

- Buttons/actions can move between declared stack screens and tabs.

Suggested commit: `feat(navigation): add navigation actions`

### 6. Replace Expo Router Shell

Context: Tao navigation no longer uses Expo Router as its semantic runtime.

Work:

- Replace `main: "expo-router/entry"` with a direct Expo entry file.
- Register the compiled Tao app through Expo's `registerRootComponent`.
- Remove `packages/expo-runtime/app/_layout.tsx`.
- Remove the `expo-router` app config plugin.
- Remove the `expo-router` dependency if no other runtime path uses it.
- Update runtime comments that mention Expo Router stubs or file-based routes.

Validation:

- Expo runtime tests pass with the direct entry path.
- Manual smoke command can launch the runtime without Expo Router.
- `./agent expo-runtime test` passes or any native-only limitation is documented.

Exit criteria:

- Expo Router is no longer required to run compiled Tao apps.

Suggested commit: `feat(expo-runtime): remove expo router shell`

### 7. Migrate Example Apps And Docs

Context: Canonical apps should exercise the new navigation entry shape.

Work:

- Update current test apps from `app { ui RootView }` to
  `app { navigation MainNavigation }`.
- Add minimal navigators around existing root views.
- Add a stack example with primitive params.
- Add a tabs example with semantic `tab Home` shorthand.
- Update the Rooms project plan if its navigation references need the new syntax.
- Keep app examples small and focused.

Validation:

- `./agent test "parser"` or narrower equivalent parser/compiler tests.
- Shared app scenario coverage compiles with navigation entry.

Exit criteria:

- Canonical Tao apps demonstrate the v1 navigation syntax.

Suggested commit: `feat(navigation): migrate example apps`

### 8. Final Validation And Plan Closure

Context: Navigation touches parser, compiler, formatter, runtime, and examples.

Work:

- Run `./agent fix`.
- Run `./agent prep-commit`.
- Update roadmap status to `Implemented` only after implementation and tests are
  complete.
- Record follow-up items for drawer, guards, React Navigation 8, and native-tab
  backends.

Validation:

- `./agent check`
- `./agent test`
- Manual Expo smoke on available platform when runtime shell changes.

Exit criteria:

- Navigation v1 is implemented, validated, and ready for implementation review.

Suggested commit: `feat(navigation): validate navigation v1`

## Deferrals

- Drawer navigation.
- Route guards and auth flows.
- Route loading/error behavior.
- React Navigation 8 upgrade.
- Native iOS/Android tab backend and Liquid Glass defaults.
- Separate web routing backend.
- Universal links and public URL policy.
- Generated route documentation.

## References

- [React Navigation static configuration](https://reactnavigation.org/docs/static-configuration/)
- [React Navigation params guidance](https://reactnavigation.org/docs/params/)
- [React Navigation bottom tabs](https://reactnavigation.org/docs/bottom-tab-navigator/)
- [React Navigation web support](https://reactnavigation.org/docs/web-support/)
- [React Navigation 8 status](https://reactnavigation.org/docs/8.x/upgrading-from-7.x/)
- [Expo registerRootComponent](https://docs.expo.dev/versions/latest/sdk/expo/)
- [Langium grammar imports](https://langium.org/docs/reference/grammar-language/#import-of-other-grammar-languages)
