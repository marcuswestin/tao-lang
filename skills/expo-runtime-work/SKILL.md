---
name: expo-runtime-work
description: Guides Tao Expo runtime, React Native tests, and compile-to-runtime adapter changes.
---

# Expo Runtime Work

## When to use

- When editing `packages/expo-runtime/**/*.ts` or `packages/expo-runtime/**/*.tsx`.
- When changing compile-to-runtime adapters, runtime test scenarios, Expo config, or React Native behavior.
- When reviewing generated Tao app behavior in the Expo runtime.

## Steps

1. Prefer existing `packages/expo-runtime/` scenario, test-runtime, and Jest patterns over new harnesses.
2. For component and scenario tests, follow the package's React Native Testing Library usage.
3. Put platform branching in the Expo/runtime layer or a clearly named runtime helper, not inline throughout generated Tao app code.
4. When changing compile-to-run paths, environment, or spawn behavior, compare with `packages/headless-test-runtime/` so the runtimes do not drift silently.
5. Keep generated Tao output portable unless the runtime layer explicitly owns a platform split.

## Validation

- Run the relevant Expo runtime test, or `./agent expo-runtime test` for broader runtime changes.
- Run `./agent headless-test-runtime test` when adapter changes should stay aligned with the headless runtime.
