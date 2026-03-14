# Alias Statements — Completion Summary

## Branch: `ft/let-statements`

16 commits, 49 files changed (+1296 / -733 lines).

## What was built

### Primary feature: Alias Statements

- `alias name = expr` syntax for immutable bindings, supported at top-level and inside view bodies
- `NamedReference` expression type for referencing aliases, parameters, views, and apps by name
- Scope registration in `TaoScopeComputation` for aliases and parameters
- Scope resolution in `TaoScopeProvider` via `getLocalScope` for `NamedReference`
- Duplicate identifier validation (same-scope aliases, parameter shadowing)
- Compilation: `alias x = 1` → `const x = 1;`, `NamedReference` → identifier text
- Formatter: `alias name = value` with proper spacing and indentation

### Supporting refactors

- Grammar: `VisibilityMarkedDeclaration` → `TopLevelDeclaration`; `Parameter` → `ParameterDeclaration`; `Argument.key` → `Argument.name`; `ViewBody` inlined into `ViewRenderStatement`; `MODULE_PATH` → `USE_MODULE_PATH`
- New grammar types: `ScopeRelevantNode`, `ImportableDeclaration`, `Referenceable`
- New `switchProperty_Exhaustive` utility for dispatching on property values
- Pre-commit workflow split into stash → fix → check → commit → unstash steps
- Oxlint config simplified to category-based rules
- New cursor skills: `check-for-improvements`, `ts-class-constructor-properties`
- Example Tao files moved from `Apps/Tao Design/` → `Docs/Example Tao/`
- Let Statements Spec renamed to Alias Statements Spec

## Test coverage

- **Parser tests**: top-level alias, view alias (number/string), multiple aliases, alias + render, nested alias, identifier refs in args
- **Scope resolution tests**: alias→alias, alias as view arg, parameter refs, multiple aliases
- **Validation tests**: duplicate aliases, different-scope OK, unresolved refs, parameter shadowing
- **Formatter tests**: alias number/string, spacing normalization, identifier refs, nested blocks, mixed with renders
- **Missing**: Runtime tests (expo-runtime) for alias compilation output

## Cleanup plan (to be done before merge)

### Code fixes

1. Fix incomplete comment in `TaoScopeProvider.ts:109` — `// Check for` is unfinished
2. Use TS parameter properties for `stdLibRoot` in `TaoScopeProvider` and `TaoDefinitionProvider`
3. Rename `filterUnique` → `allExcept` in `tao-lang-validator.ts` (name is misleading)
4. Add missing doc comment for `getSiblingStatements` in `tao-lang-validator.ts`
5. Fix stale "visibility-marked" wording in `isExportableVisibilityDeclaration` comment
6. Use `switchProperty_Exhaustive` in `compileAppStatement` (currently uses `if` + `assertNever`)

### Documentation updates

7. Update Alias Statements Spec — mark completed items (compiler, formatter, tests)
8. Update `TODO.md` — change `- [ ] Let` to `- [x] Alias`
9. Update `Docs/Tao Lang Roadmap.md` — mark alias items as complete

## Suggested next three feature branches

1. **ft/composite-expressions** — Arithmetic ops, string interpolation, boolean literals, comparison operators
2. **ft/basic-type-system** — Type annotations, type checking, type inference, type errors
3. **ft/runtime-tests** — Get kitchen sink app building and rendering, add runtime tests for alias compilation
