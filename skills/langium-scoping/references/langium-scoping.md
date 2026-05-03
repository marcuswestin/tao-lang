# Langium Scoping Reference

Langium scoping has two phases:

1. `ScopeComputation` indexes exported symbols and local symbols after parsing.
2. `ScopeProvider` resolves references during linking.

Do not resolve references inside `ScopeComputation`; reading `.ref` there triggers linking too early and can create cycles.

## Tao Locations

- Scope computation/provider live under `packages/compiler/compiler-src/langium/`.
- Module resolution lives under `packages/compiler/compiler-src/resolution/`.
- Workspace loading, including stdlib, is handled by `TaoWorkspaceManager`.

## Common Tasks

- Export symbols to other files from `collectExportedSymbols()`.
- Add local block or parameter symbols from `collectLocalSymbols()`.
- Resolve references in `getScope()`.
- Use document builds in tests so indexing and linking run.

## Scope Precedence

Prefer an explicit chain:

1. Closest local symbols.
2. Outer local symbols.
3. Imported symbols from `use` statements.
4. Same-module or global symbols allowed by visibility.

Closer scopes should shadow outer scopes through nested `createScope` calls.
