# Navigation and Routing Project Research

## Goal

Design Tao's first app navigation surface so the Buildable App MVP can express
normal native and web app navigation with a small, semantic, implementation-ready
language model.

The project should let Tao apps declare navigators, screens, tabs, optional URL
paths, primitive params, and simple navigation actions without requiring every
view state to be URL-addressable.

## Current Context

- `Docs/Tao Project Roadmap.md` lists **Navigation and routing** as priority 2.
- `Docs/Projects/Design WIP/App Routing and Navigation.md` is the active design
  contract for the chosen v1 surface.
- Existing Tao apps currently use `app { ui RootView }`; navigation v1 changes
  app entry to `app { navigation MainNavigation }`.
- The Expo runtime currently depends on Expo Router and React Navigation 7, with
  `main` set to `expo-router/entry`. The selected design uses React Navigation 7
  directly and removes Expo Router once the direct app shell is implemented.
- `CORE_TENETS.md` requires Tao UI/runtime behavior to map to React Native/Expo,
  a Tao runtime helper, or a clear validation/runtime error.

## Decisions

- Navigation is semantic, not file-system based.
- `navigator` is a top-level declaration referenced from the app block.
- `app { navigation MainNavigation }` replaces app-level `ui RootView`.
- V1 supports `stack` and `tabs`.
- Drawer, route guards, auth navigation, and platform-specific navigation
  styling are deferred.
- Screens and tabs are navigation destination records.
- Destination targets default to a view or navigator with the same name.
- Destination option bodies use fixed keyword statements, not generic object
  literals or comma-separated config.
- URL paths are optional metadata. Stable routing is not required for every v1
  screen.
- Params are primitive or ID-like values only: `text`, `number`, and `boolean`.
- Arbitrary Tao objects, provider objects, fetched records, views, actions, and
  nested structs are not valid navigation params in v1.
- V1 navigation actions are `navigation push`, `navigation pop`, and
  `navigation tab`.
- React Navigation 7 static config is the v1 runtime target.
- React Navigation 8 is deferred because its official docs still mark 8.x as
  pre-release and require newer Expo/React Native versions than this repo has.
- Liquid Glass is not Tao syntax. It may become a backend default when a future
  native-tab backend is adopted.

## User Interview Notes

- 2026-05-19: User wanted Tao navigation to consider web, iOS, Android, deep
  links, typed params, developer ergonomics, native navigation libraries, and a
  simpler v1 path.
- 2026-05-19: User preferred app-level `navigation` over app-level `ui`.
- 2026-05-19: User selected top-level `navigator` declarations.
- 2026-05-19: User agreed to pathless native-first screens with optional
  paths/params rather than requiring every active view to be URL-stable.
- 2026-05-19: User liked destination shorthand such as `tab Home` defaulting the
  target and label from the name.
- 2026-05-19: User asked to keep platform-specific backend choices viable in the
  long term while skipping platform glass config for v1.
- 2026-05-19: User confirmed navigation actions can start as `navigation push`,
  `navigation pop`, and `navigation tab`.
- 2026-05-19: User confirmed paths/params, guard deferral, and Expo Router
  removal if it is no longer used.

## Repo Findings

- `packages/parser/tao-grammar.langium` currently has `AppUiStatement`, but no
  `AppNavigationStatement`, `NavigatorDeclaration`, or navigation action syntax.
- The grammar already distinguishes statement blocks from expression object
  literals, so destination option bodies should use known option statements
  rather than object-like config.
- New grammar entities should live in a sibling `packages/parser/tao-navigation.langium`
  file imported from the main grammar, if Langium import support works cleanly
  in this repo.
- `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` currently finds
  the app's UI declaration and emits an `AppUIView` root; navigation will need to
  collect the root navigator instead.
- `packages/expo-runtime/package.json` currently uses `expo-router/entry`.
- `packages/expo-runtime/app/_layout.tsx` imports `Stack` from `expo-router`.
- `packages/expo-runtime/app/index.tsx` imports the compiled Tao bootstrap from
  `_gen/tao-app/app-bootstrap`.
- `packages/expo-runtime/README.md` currently describes `app/` as an Expo Router
  app shell.

## External Research

- React Navigation 7 static configuration supports `createXNavigator`,
  `screens`, nested navigators, `groups`, screen-level `linking`, and
  `createStaticNavigation`.
- React Navigation 7 native stack maps to the native stack navigator and is the
  v1 stack target.
- React Navigation 7 bottom tabs are stable and support React Native/web, making
  them the v1 tab target.
- React Navigation params guidance recommends JSON-serializable params and says
  params should contain identifiers and small screen state, not fetched data
  objects.
- React Navigation web support exists, but the docs recommend configuration when
  building web apps and show that web behavior is a navigation concern rather
  than a separate language surface.
- React Navigation 8 is not a v1 target: its docs say 8.x is pre-release, API
  may change, and the dependency floor is React Native 0.83 and Expo 55.
- Expo custom entry points should use `registerRootComponent`, which is the
  planned replacement path once Expo Router is removed.
- Langium supports importing grammar rules from sibling grammar files, which
  supports the desired `tao-navigation.langium` split.

## Alternatives Considered

- **Require every active view to be URL-addressable:** rejected for v1 because
  native navigation does not require paths, and it makes simple native apps too
  heavy.
- **Use Expo Router as the semantic runtime:** rejected because Tao wants
  declarative `navigator` declarations as the source of truth, not file-system
  routes.
- **Generate Expo Router files from Tao:** rejected for v1 because direct React
  Navigation static config is a cleaner compiler target and keeps the runtime
  model closer to the Tao source.
- **Use React Navigation 8 now:** rejected because it is pre-release and needs a
  newer Expo/React Native stack than the repo currently has.
- **Use a native-only mobile library plus a separate web router now:** deferred.
  The navigation IR should make this viable later, but v1 should keep one stable
  backend.
- **Make screen/tab bodies generic objects:** rejected because keyword option
  statements give better grammar clarity and validation.
- **Add Liquid Glass syntax:** rejected for v1. Platform materials should be
  backend defaults, not Tao-authored styling knobs.

## Unresolved Questions

- Exact formatter layout for `navigator`, destination option bodies, and
  navigation action param payloads.
- Whether `navigation push` should use stack-specific push behavior everywhere
  or fall back to navigate behavior when targeting a tab or nested navigator.
- How much nested navigator reachability validation is required in the first
  implementation.
- Whether route params are exposed to Tao views as normal view parameters,
  generated route props, or a small runtime helper.
- Whether optional non-path params become query-string values when a path exists.

## Planning Inputs

- Implement navigation as a language/compiler/runtime project, not only an Expo
  runtime refactor.
- Add parser, validation, formatter, codegen, runtime helper, and example app
  coverage in coherent chunks.
- Keep the first implementation small: stack, tabs, pathless destinations,
  optional primitive params/paths, and push/pop/tab actions.
- Remove Expo Router as part of the implementation once the direct React
  Navigation shell works.
- Leave drawer, guards/auth, platform glass config, native-only mobile backend,
  and React Navigation 8 upgrade as explicit follow-up projects.

## References

- [React Navigation static configuration](https://reactnavigation.org/docs/static-configuration/)
- [React Navigation params guidance](https://reactnavigation.org/docs/params/)
- [React Navigation bottom tabs](https://reactnavigation.org/docs/bottom-tab-navigator/)
- [React Navigation web support](https://reactnavigation.org/docs/web-support/)
- [React Navigation 8 status](https://reactnavigation.org/docs/8.x/upgrading-from-7.x/)
- [Expo registerRootComponent](https://docs.expo.dev/versions/latest/sdk/expo/)
- [Langium grammar imports](https://langium.org/docs/reference/grammar-language/#import-of-other-grammar-languages)
