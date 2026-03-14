# 2026-03-08 Alias Statements

Add `alias` statement support to Tao Lang so that views (and eventually handlers/functions) can declare local bindings, e.g. `alias age = 1`, and reference them in expressions, e.g. `Text age`.

## Scope

Tao currently has no way to declare or reference variables. Expressions are limited to string and number literals. This project introduces:

- An `alias` keyword for declaring named bindings with expressions
- Identifier references in expressions, so declared names can be used as arguments
- Scope registration so the language server resolves references correctly
- Validation to catch undefined references and duplicate names
- Compilation of alias statements to TypeScript `const` declarations
- Formatter support for alias statements

This is intentionally scoped to **immutable bindings with literal initializers inside views**. Mutable state (`var`), complex expressions (arithmetic, function calls), and alias statements outside views are out of scope for now.

### Steps

- [x] **Grammar: add `AliasStatement` and identifier expressions**
  - [x] Add `alias` keyword to `tao-grammar.langium`
  - [x] Add `AliasStatement` rule: `'alias' name=ID '=' value=Expression`
  - [x] Add `AliasStatement` as a `ViewStatement` alternative (alongside `ViewRenderStatement` and `Injection`)
  - [x] Add `IdentifierReference` to `Expression` alternatives (alongside `StringLiteral` and `NumberLiteral`) so identifiers can reference alias-bound names
  - [x] Regenerate the Langium parser (`just build` or the langium generate step)
- [x] **Scope: register alias bindings**
  - [x] In `TaoScopeComputation.ts`, register `AliasStatement` names as local symbols within their containing view scope
  - [x] Ensure `IdentifierReference` resolves against view parameters and alias-bound names
- [x] **Validation**
  - [x] Error on duplicate `alias` names within the same scope
  - [x] Error on `IdentifierReference` that doesn't resolve to a known name (alias binding or view parameter)
  - [x] Error if an alias binding shadows a view parameter name
- [x] **Compiler: emit TypeScript for alias statements**
  - [x] Compile `alias name = <expr>` → `const name = <compiled-expr>;` before the JSX return
  - [x] Compile `IdentifierReference` → emit the JavaScript identifier (e.g. `props.paramName` for view params, `name` for alias-bound names)
  - [x] Ensure alias bindings used as view arguments compile correctly (e.g. `Text value age` → `<Text value={age} />`)
  - [ ] Add runtime tests
- [x] **Formatter: format alias statements**
  - [x] Format `alias` statements with proper indentation inside view bodies
  - [x] Ensure consistent spacing: `alias name = value`
- [x] **Tests**
  - [x] Parser tests: `alias age = 1`, `alias name = "hello"`, alias inside view body
  - [x] Validation tests: duplicate alias names, unresolved references, shadowing warnings
  - [ ] Compiler tests: alias with number, alias with string, alias used as view argument, multiple aliases in a view
  - [x] Formatter tests: alias statement indentation and spacing
