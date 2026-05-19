# App Routing and Navigation

This is the active design contract for Tao navigation v1. It captures the
approved language surface, runtime target, implementation boundaries, and
deferrals for the Navigation and routing project.

## Goal

Tao navigation should let app authors declare normal native-feeling app
navigation without first designing a URL routing system. The v1 surface is
semantic and pathless by default: screens and tabs are named destinations that
target Tao views or nested navigators, while URL paths and params are optional
metadata for external addressability.

V1 must work for Expo iOS, Android, web, and headless/runtime tests through a
single Tao-owned navigation model.

## Decisions

- App blocks use `navigation MainNavigation` instead of `ui RootView`.
- `navigator` is a top-level declaration and is the only app navigation entry.
- V1 supports `stack` and `tabs`; drawer is deferred.
- A screen is a navigation destination record, not a visual primitive.
- Screen and tab targets default to the destination name.
- Destination bodies use keyword option statements, not generic object config.
- URL paths are optional; stable URL routing is not required for every v1 screen.
- Params are primitive or ID-like values only, not arbitrary Tao objects.
- Navigation actions use `navigation push`, `navigation pop`, and `navigation tab`.
- React Navigation 7 static config is the v1 runtime target.
- Expo Router is removed from the Tao Expo runtime; the direct React Navigation
  app shell is the runtime entry path.

## Non-Goals

- No React Navigation 8 dependency in v1. Its docs still mark 8.x as
  pre-release, and it requires newer Expo and React Native versions than this
  repo currently uses.
- No drawer syntax in v1.
- No auth or route guard syntax in v1.
- No platform-specific glass, material, or native-tab config in Tao syntax.
- No guarantee that every active app view is shareable as a stable URL.
- No arbitrary object params or serialized Tao object params.
- No generated public route documentation in v1.

## Syntax

### App Entry

```tao
app Rooms {
   navigation MainNavigation
}
```

Canonical v1 apps must have exactly one `navigation` statement. The referenced
declaration must be a top-level `navigator`.

During the v1 implementation transition, legacy `app { ui RootView }` remains
valid so existing examples and tests can migrate in coherent steps. Canonical
new app examples should use `navigation`.

### Stack Navigator

```tao
navigator MainNavigation {
   stack {
      screen Home
      screen Room RoomScreen {
         title "Room"
         path "/rooms/:RoomId"
         param RoomId text
      }
   }
}
```

`screen Home` means:

- route name: `Home`;
- target: the `Home` view or navigator;
- title: defaulted from `Home`;
- no params;
- no URL path unless declared.

`screen Room RoomScreen` means the route name is `Room`, but the rendered target
is `RoomScreen`.

### Tab Navigator

```tao
navigator MainTabs {
   tabs {
      tab Home
      tab Search {
         title "Search"
         icon system search
      }
   }
}
```

`tab Home` means:

- tab route name: `Home`;
- target: the `Home` view or navigator;
- label/title: defaulted from `Home`;
- no params;
- no URL path unless declared.

Tabs are semantic in v1. They compile to stable React Navigation 7 bottom tabs,
not native-only tab APIs. A later backend may lower the same Tao `tabs` model to
native iOS/Android tab primitives.

### Destination Options

Destination option bodies are fixed keyword statements:

```tao
screen Room RoomScreen {
   title "Room"
   path "/rooms/:RoomId"
   param RoomId text
}

tab Search {
   title "Search"
   icon system search
}
```

Supported v1 option statements:

- `title "Text"` sets the screen title or tab label.
- `icon system name` declares a tab-only semantic system icon that lowers
  through a Tao runtime icon helper.
- `path "/path/:Param"` declares optional URL/deep-link metadata.
- `param Name text|number|boolean` declares a primitive navigation param.

Options are not comma-separated. They are not generic key/value records.

### Navigation Actions

Navigation actions are action-body statements:

```tao
action OpenHome {
   navigation push Home
}

action OpenRoom RoomId text {
   navigation push Room {
      RoomId RoomId
   }
}

action CloseScreen {
   navigation pop
}

action ShowSearch {
   navigation tab Search
}
```

`navigation push Target` pushes or navigates to a stack destination. `navigation
pop` goes back in the active stack. `navigation tab Target` switches to a tab in
the active tab navigator.

## Params And Paths

Params exist only when a destination declares them. V1 param types are:

- `text`;
- `number`;
- `boolean`.

Params should identify what to display, such as IDs, filters, sort modes, and
small screen state. They must not carry fetched records, Tao objects, provider
objects, actions, views, or nested structs.

Paths are optional external-address metadata. A screen without a `path` is still
a valid native destination. When a path contains `:Name`, that name must have a
matching `param Name ...` declaration. Declared params that are not in the path
remain navigation params and may later map to query-string values.

## Runtime Target

The v1 backend lowers Tao navigation to React Navigation 7 static config:

- `stack` lowers to `createNativeStackNavigator`.
- `tabs` lowers to `createBottomTabNavigator`.
- The root navigator lowers through `createStaticNavigation`.
- `path` and `param` lower to React Navigation linking config.
- Navigation actions lower to Tao runtime helpers that dispatch React Navigation
  actions through a root navigation ref.

React Navigation 7 is the current stable target because it matches the repo's
Expo 54 and React Native 0.81 runtime stack. React Navigation 8 is a future
upgrade gate, not a v1 dependency.

The implementation should first collect a Tao navigation IR and then lower that
IR to the React Navigation backend. This preserves the option to add platform
specific backends later, such as native tabs or another web routing backend,
without changing Tao syntax.

## Expo Runtime Entry

Tao navigation v1 does not use Expo file-based routing as the semantic model.
The Expo runtime registers the compiled Tao app through Expo's
`registerRootComponent` path and renders the React Navigation root created from
the Tao navigation IR.

## Validation Rules

- An app must have exactly one `navigation` statement.
- `navigation` must reference a `navigator`.
- A `navigator` must contain exactly one `stack` or `tabs` body.
- Screen and tab names must be unique within their navigator.
- Screen and tab targets must resolve to a view-like declaration or another
  navigator.
- If target is omitted, the destination name is used as the target reference.
- Option statements must be valid for their destination kind.
- Param names must be unique within the destination.
- Param types must be primitive navigation-safe types.
- Path placeholders must match declared params.
- Navigation actions must target a declared destination reachable from the app
  navigation tree.
- Param payloads in `navigation push` and `navigation tab` must match the
  destination param declarations.

## Testing Requirements

- Parser tests for app `navigation`, `navigator`, `stack`, `tabs`, `screen`,
  `tab`, option bodies, params, paths, and navigation actions.
- Validation tests for bad references, duplicate destination names, wrong option
  placement, invalid param types, path/param mismatch, missing app navigation,
  and bad action payloads.
- Formatter tests for navigator declarations and navigation actions.
- Codegen tests for emitted React Navigation static config and linking metadata.
- Runtime helper unit tests for ready-state failure and dispatch payloads with a
  fake navigation ref.
- Expo runtime smoke coverage for the direct non-Expo-Router app entry.

## Deferrals

- Drawer navigation.
- Route guards, auth flows, and route-level loading/error semantics.
- Destination roles such as `role search`.
- Compile-time icon name validation against a platform-aware registry.
- React Navigation 8 and native tabs.
- Liquid Glass or other platform material syntax.
- Universal-link policy and app-link/domain ownership.
- Complex nested-router reconstruction from URLs.
- Multi-window or deep platform routing policy.
- Generated route documentation.

## References

- [React Navigation static configuration](https://reactnavigation.org/docs/static-configuration/)
- [React Navigation params guidance](https://reactnavigation.org/docs/params/)
- [React Navigation bottom tabs](https://reactnavigation.org/docs/bottom-tab-navigator/)
- [React Navigation web support](https://reactnavigation.org/docs/web-support/)
- [React Navigation 8 status](https://reactnavigation.org/docs/8.x/upgrading-from-7.x/)
- [Expo registerRootComponent](https://docs.expo.dev/versions/latest/sdk/expo/)
- [Langium grammar imports](https://langium.org/docs/reference/grammar-language/#import-of-other-grammar-languages)
