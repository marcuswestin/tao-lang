# Navigation and Routing Project Plan

## Summary

Implement Tao navigation v1 as semantic app navigation compiled to React
Navigation 7 static config. The project replaces `app { ui RootView }` with
`app { navigation MainNavigation }`, adds top-level `navigator` declarations,
supports stacks and tabs, adds optional primitive paths/params, and exposes
simple navigation actions.

Canonical apps should migrate to `app { navigation MainNavigation }` during this
project. Legacy `app { ui RootView }` remains accepted as a transition entry
until a later cleanup removes it from the language.

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
- No complete removal of legacy app-level `ui` syntax in this project.

## Assumptions

- React Navigation 7 remains the v1 target while the repo is on Expo 54 and
  React Native 0.81.
- `navigator` grammar can live in `packages/parser/tao-navigation.langium` and
  be imported from `packages/parser/tao-grammar.langium`.
- The implementation can update existing test apps from app-level `ui` to
  app-level `navigation`.
- Existing view declarations remain the visual screen bodies.
- Canonical v1 apps use app-level `navigation`; legacy app-level `ui` remains
  valid during the transition. Validation accepts exactly one app root entry:
  either `ui` or `navigation`, not both.
- Navigation action targets are parsed as destination-name identifiers rather
  than Langium cross-references. Validation resolves those names against the
  collected navigation tree.
- `navigation push` is stack-only and `navigation tab` is tab-only. Push should
  not silently fall back to tab selection or cross-boundary `navigate` behavior.
- Navigation params are passed into target views as generated props from the
  React Navigation route params. V1 does not add a `useParams`-style Tao runtime
  helper.
- `title "Text"` is valid on stack screens and tabs. `icon system Name` is
  tab-only and lowers to a Tao runtime tab-icon helper backed by the Expo runtime
  icon packages. V1 validates icon placement and syntax only; compile-time icon
  registry validation is deferred.
- Destination `role` metadata is deferred and should not be added to the v1
  grammar.
- When a screen declares `path`, every declared param for that screen must appear
  as a path placeholder. Pathless screens may still declare params for in-app
  navigation. Query-string encoding for non-path params is deferred.
- V1 validates action targets and params only for uniquely named reachable
  destinations that the compiler can lower directly. Rich nested navigator
  reachability is deferred.

## Implementation Steps

### 1. Add Navigation Grammar

Context: Tao needs parseable navigation declarations before compiler behavior can
be implemented.

Work:

- Keep legacy app-level `ui` grammar valid while adding app-level `navigation`.
  Parser tests should cover both entries; validation tests should reject app
  blocks that contain both.
- Add `packages/parser/tao-navigation.langium`.
- Import the navigation grammar from `packages/parser/tao-grammar.langium`.
- Verify the grammar import split with `./agent gen` before expanding the file.
  If the current Langium generator setup rejects sibling grammar imports, inline
  the navigation rules into `packages/parser/tao-grammar.langium` for v1 and
  record the split as follow-up cleanup.
- Add `NavigatorDeclaration` to top-level declarations.
- Add `AppNavigationStatement` to app statements.
- Add grammar for `stack`, `tabs`, `screen`, `tab`, `title`, tab-only
  `icon system Name`, `path`, and `param`.
- Add action-body grammar for `navigation push`, `navigation pop`, and
  `navigation tab`.
- Represent action targets as unresolved destination names in the AST; do not
  introduce Langium cross-references for action targets in v1.

Validation:

- Parser tests cover shorthand destinations, explicit targets, option bodies,
  params, paths, tabs, stacks, and navigation actions.
- Run `./agent gen` after grammar changes.

Exit criteria:

- Navigation examples parse into generated AST nodes.
- Existing non-navigation parser tests remain green.

Implementation note:

- 2026-05-19: `./agent gen` rejected a sibling navigation grammar that reused
  the main grammar's `StringTemplateExpression` rule. Navigation grammar is
  inline in `packages/parser/tao-grammar.langium` for v1; splitting it into a
  sibling grammar remains deferred cleanup.

Suggested commit: `feat(navigation): add parser syntax`

### 2. Add Validation And Scoping

Context: Navigation declarations need semantic checks before codegen can rely on
them.

Work:

- Add scoping support so app navigation references resolve to navigators.
- Register the `navigation` property on `AppNavigationStatement` in
  `packages/compiler/compiler-src/langium/TaoScopeProvider.ts`.
- Update the existing `AppUiStatement` validation in
  `packages/compiler/compiler-src/validation/tao-lang-validator.ts` so an app
  requires exactly one root entry: `ui` or `navigation`.
- Validate at most one app navigation statement.
- Validate each navigator has exactly one `stack` or `tabs` body.
- Validate destination names are unique within a navigator.
- Add a shared compiler navigation-tree helper, for example under
  `packages/compiler/compiler-src/navigation/`, that validation and codegen can
  both use. It should start from the app navigation statement, traverse
  referenced navigator declarations, record each destination's name, kind,
  target, params, path, parent navigator, and detect cycles.
- Validate omitted targets resolve by destination name.
- Validate explicit targets reference a view-like declaration or another
  navigator.
- Validate destination options and reject unsupported placement, including
  `icon` on stack screens and any `role` statement in v1. Do not validate
  concrete icon names in v1.
- Validate params are `text`, `number`, or `boolean`.
- Validate each destination's declared params against its target view's
  navigation-injected parameters by name and primitive type; missing, extra, or
  mismatched required target params are errors.
- Validate every path placeholder has a matching param and every param on a
  path-bearing screen appears in the path.
- Validate `navigation push` targets stack destinations, `navigation tab` targets
  tab destinations, and param payloads match declared destination params.
- Reject ambiguous action targets. V1 rejects `navigation pop` only when the app
  navigation tree has no stack destination; precise action-context reachability
  for nested tab-only views is deferred.

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
- Format navigator bodies with a blank line between destinations so stack and tab
  entries stay scannable in larger apps.

Validation:

- Formatter tests cover stack, tabs, options, params, paths, and action payloads.
- Formatting is idempotent.

Exit criteria:

- Navigation source remains stable after repeated formatting.

Suggested commit: `feat(navigation): format navigator syntax`

### 4. Establish Direct Expo Entry Shell

Context: Generated navigation cannot be smoke-tested while the runtime still
boots through Expo Router. Add the direct Expo entry before navigation codegen so
later steps can test real app startup incrementally.

Work:

- Replace `main: "expo-router/entry"` with a direct Expo entry file.
- Register the compiled Tao app through Expo's `registerRootComponent`.
- Keep the existing legacy `AppUIView` path working through the new entry so
  current `app { ui RootView }` apps still boot before navigation codegen lands.
- Leave Expo Router files and dependency in place until the cleanup step unless
  they can be removed without blocking the current UI smoke path.

Validation:

- Expo runtime tests pass with the direct entry path.
- Manual smoke command can launch the current UI-rooted runtime when a target
  platform is available.

Exit criteria:

- The Expo runtime can boot without using `expo-router/entry`.

Suggested commit: `feat(expo-runtime): add direct app entry`

### 5. Build Navigation IR And Codegen

Context: Tao should lower to an internal navigation model before targeting React
Navigation.

Work:

- Reuse the shared navigation-tree helper from validation as the source for a
  serializable Tao navigation IR. Codegen should not depend on validator state,
  but it should not duplicate traversal rules.
- Collect the app root navigator from the entry Tao file when the app uses
  `navigation`.
- Branch codegen on app root entry type so the legacy `ui` path in
  `app-gen-main.ts` and `runtime-gen.ts` remains functional and covered while
  navigation support is added.
- Build a serializable Tao navigation IR for stacks, tabs, destinations, options,
  paths, params, and target component names.
- Add `@react-navigation/native-stack` as a direct Expo runtime dependency and
  update the lockfile before generated code imports it.
- Update `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` to carry
  app-level `navigation` through entry codegen configuration.
- Update `packages/compiler/compiler-src/codegen/app/runtime-gen.ts` so the app
  component generation emits either the legacy UI root or the navigation root.
- Update `packages/compiler/compiler-src/design/design-analysis.ts` so design
  requirement collection starts from screen target views in the navigator tree.
- Generate React Navigation 7 static config from the IR.
- Lower `stack` to `createNativeStackNavigator`.
- Lower `tabs` to `createBottomTabNavigator`.
- Lower the root navigator through `createStaticNavigation`.
- Lower optional paths and params to screen-level linking metadata.
- Lower tab icons to a Tao runtime helper instead of embedding icon-rendering
  logic directly into generated config.
- Emit imports only from direct Expo runtime dependencies. `@react-navigation/native`
  and `@react-navigation/bottom-tabs` are already direct dependencies;
  `@react-navigation/native-stack` is added in this step.
- Keep generated screen components wrapping the target Tao view or nested
  navigator.
- Generate screen wrappers that read React Navigation route params and pass them
  to the target Tao view as props according to the validation contract from step
  2.

Validation:

- Codegen tests assert generated static config shape for stack and tabs.
- Codegen tests assert linking metadata for `path` and `param`.
- Codegen tests cover nested navigator targets.
- Codegen tests keep the legacy `ui` entry path green during the transition.
- Design inference tests cover a navigation-rooted app so screen views still
  receive design requirements.
- Expo smoke covers a minimal navigation-rooted app through the direct entry when
  a target platform is available.

Exit criteria:

- A compiled Tao app can generate and smoke-test a React Navigation root from a
  Tao navigator.

Suggested commit: `feat(navigation): generate react navigation config`

### 6. Add Runtime Navigation Actions

Context: Tao actions need a backend-neutral way to drive navigation.

Work:

- Add Tao runtime navigation helpers for push, pop, and tab selection.
- Use a Tao-owned module-level root navigation ref created with React Navigation
  and attached to the generated static navigation component. Runtime helpers
  dispatch through that ref and fail if it is not ready.
- Lower `navigation push`, `navigation pop`, and `navigation tab` statements to
  helper calls.
- Convert declared param payloads into React Navigation params.
- Fail clearly if navigation actions run before navigation is ready.

Validation:

- Codegen tests assert action statements lower to navigation helper calls.
- Runtime helper unit tests use a fake module-level navigation ref to cover
  ready-state failure and dispatched helper payloads. Do not claim headless
  runtime behavior without a React Navigation stack.
- Expo smoke covers push, pop, tab selection, and primitive param delivery when
  a target platform is available.

Exit criteria:

- Buttons/actions can move between declared stack screens and tabs.

Suggested commit: `feat(navigation): add navigation actions`

### 7. Remove Expo Router Shell

Context: Tao navigation no longer uses Expo Router as its semantic runtime. Once
the direct entry and navigation root are working, remove the remaining Expo
Router shell pieces.

Work:

- Remove `packages/expo-runtime/app/_layout.tsx`.
- Remove `packages/expo-runtime/app/index.tsx` if the direct entry fully
  replaces it.
- Remove the `expo-router` app config plugin.
- Remove the `expo-router` dependency if no other runtime path uses it.
- Update runtime comments that mention Expo Router stubs or file-based routes.

Validation:

- Expo runtime tests pass with the direct entry path.
- Manual smoke command can launch the runtime without Expo Router when a target
  platform is available.
- `./agent expo-runtime test` passes or any native-only limitation is documented.

Exit criteria:

- Expo Router is no longer required to run compiled Tao apps.

Suggested commit: `feat(expo-runtime): remove expo router shell`

### 8. Migrate Example Apps And Docs

Context: Canonical apps should exercise the new navigation entry shape.

Work:

- Update current test apps from `app { ui RootView }` to
  `app { navigation MainNavigation }`.
- Add minimal navigators around existing root views.
- Add a stack example with primitive params.
- Add a tabs example with semantic `tab Home` shorthand.
- Audit the Rooms project plan and update any navigation references to the new
  `navigator` syntax.
- Keep app examples small and focused.

Validation:

- `./agent test "parser"` or narrower equivalent parser/compiler tests.
- Shared app scenario coverage compiles with navigation entry.
- Rooms plan either uses the new navigation syntax or records why it does not
  need an update yet.

Exit criteria:

- Canonical Tao apps demonstrate the v1 navigation syntax.

Suggested commit: `feat(navigation): migrate example apps`

### 9. Final Validation And Plan Closure

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

## Implementation Closure

- 2026-05-19: Navigation v1 implementation is complete on the feature branch
  and is ready for `project-6-review-implementation`.
- Completed scope includes grammar, semantic validation, formatter support,
  React Navigation 7 static config codegen, runtime navigation actions, direct
  Expo app entry without Expo Router, migrated canonical test apps, headless
  scenario support, and Expo shared-scenario smoke coverage.
- Follow-up work remains deferred below: drawer navigation, guards/auth,
  React Navigation 8, native tab backends, and broader URL/link policy.
- 2026-05-19 implementation review follow-up tightened navigation validation
  for duplicate options/params, primitive-only route params, duplicate child
  navigator targets, imported app navigators, and root-navigator-only v1 action
  targets; generated route params are now strictly decoded before Tao view
  invocation, destination paths activate React Navigation static linking, and
  navigation bootstraps are wrapped in `SafeAreaProvider`.

## Deferrals

- Drawer navigation.
- Route guards and auth flows.
- Route loading/error behavior.
- React Navigation 8 upgrade.
- Native iOS/Android tab backend and Liquid Glass defaults.
- Separate web routing backend.
- Universal links and public URL policy.
- Generated route documentation.
- Complete removal of legacy app-level `ui` syntax.
- Destination `role` metadata and screen presentation roles.
- Compile-time icon name validation against a platform-aware registry.
- Nested navigator action dispatch beyond root navigator destinations.
- Query-string encoding for params not represented by path placeholders.
- Push/navigate fallback semantics across stack, tab, and nested navigator
  boundaries.
- Grammar redesign for unambiguous multi-param shorthand navigation payloads.
- Full mounted React Navigation state-machine tests for compiled Tao navigation
  actions.
- Multi-file navigator-local destination scoping beyond the module/app tree
  needed for v1.
- Multi-file navigation action runtime access. In v1, navigation actions require
  app-level navigation in the same source file because the generated navigation
  runtime reference is file-scoped.

## References

- [React Navigation static configuration](https://reactnavigation.org/docs/static-configuration/)
- [React Navigation params guidance](https://reactnavigation.org/docs/params/)
- [React Navigation bottom tabs](https://reactnavigation.org/docs/bottom-tab-navigator/)
- [React Navigation web support](https://reactnavigation.org/docs/web-support/)
- [React Navigation 8 status](https://reactnavigation.org/docs/8.x/upgrading-from-7.x/)
- [Expo registerRootComponent](https://docs.expo.dev/versions/latest/sdk/expo/)
- [Langium grammar imports](https://langium.org/docs/reference/grammar-language/#import-of-other-grammar-languages)
