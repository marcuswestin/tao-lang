---
name: tao-react-data-hooks
description: Guides Tao std-lib data providers and compiler/runtime codegen that emits React hook usage for Tao view queries.
---

# Tao Data Layer And React Hooks

## When to use

- When editing `packages/tao-std-lib/tao/data/providers/**/*.ts`.
- When editing compiler/runtime codegen that emits React hook usage for Tao `query` in views.
- When adding a new `TaoDataClient` provider implementation.

## Rules

1. Any function or method that calls a React Hook (`useState`, `useEffect`, `useQuery`, etc.) must be named with a `use` prefix, such as `useLiveQuery` or `useTaoSomething`.
2. Generated view code calls `getTaoData(<schema>).useLiveQuery(<schema>, <collection>, opts)`. Keep the callee `use*`-named on `TaoDataClient` implementations.
3. File-level and non-React paths stay synchronous (`peekQuery`, `insert`, `isBusy`) and must not call hooks.
4. New provider implementations of `TaoDataClient` must implement `useLiveQuery` with the same contract as `MemoryTaoData` and `InstantTaoData`: return `{ data, isLoading, error }`.

## Why

`eslint-plugin-react-hooks` and team conventions treat the `use*` prefix as the signal that a function participates in React hook rules. Misnamed hook callers are easy to misuse from non-render code.
