# `@tao/std-lib`

Tao standard library sources consumed at compile time.

## Layout

The `tao/` directory mirrors Tao's `use` import paths:

- **`tao/ui/Views.tao`** — standard UI views (`Box`, `Col`, `Row`, `Text`, `Number`, `Button`) exposed via `use tao/ui Text`
- **`tao/tao-runtime/`** — TypeScript runtime that compiled Tao apps import at execution time
  - `tao-runtime.ts` — `TR` namespace: scoping, expressions, state, views, actions
  - `runtime-utils.ts` — local `Assert` and `switch_Exhaustive` (duplicated from `@shared` since std-lib cannot take that dependency at runtime)
  - `Views.tsx` — React Native view components (`Text`, `Box`, `Col`, `Row`, `Button`)

## Why `tao/tao-runtime/`?

The nested `tao/` prefix maps to the `use tao/...` import namespace in Tao source. The compiler resolves `use tao/ui Text` by looking up `<std-lib-root>/tao/ui/Views.tao`. The runtime path `tao/tao-runtime/` is imported by compiled output via a resolved absolute path from the compiler's `tao-runtime-bootstrap-path.ts`.

## Testing

The standard library has no local tests. It is exercised through:

- `packages/headless-test-runtime/` — scenario tests that compile and render Tao apps
- `packages/expo-runtime/` — full Expo render tests
- `Apps/Test Apps/` — scenario JSON files that drive both runtimes
