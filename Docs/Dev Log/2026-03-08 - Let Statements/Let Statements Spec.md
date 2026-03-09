# 2026-03-08 Let Statements

Add `let` statement support to Tao Lang so that views (and eventually handlers/functions) can declare local bindings, e.g. `let age = 1`, and reference them in expressions, e.g. `Text age`.

## Scope

Tao currently has no way to declare or reference variables. Expressions are limited to string and number literals. This project introduces:

- A `let` keyword and grammar rule for declaring named bindings with literal values
- Identifier references in expressions, so declared names can be used as arguments
- Scope registration so the language server resolves references correctly
- Validation to catch undefined references and duplicate names
- Compilation of let statements to TypeScript `const` declarations
- Formatter support for let statements

This is intentionally scoped to **immutable bindings with literal initializers inside views**. Mutable state (`var`), complex expressions (arithmetic, function calls), and let statements outside views are out of scope for now.

### Steps

- [ ] **Grammar: add `LetStatement` and identifier expressions**
  - [ ] Add `let` keyword to `tao-grammar.langium`
  - [ ] Add `LetStatement` rule: `'let' name=ID '=' value=Expression`
  - [ ] Add `LetStatement` as a `ViewStatement` alternative (alongside `ViewRenderStatement` and `Injection`)
  - [ ] Add `IdentifierReference` to `Expression` alternatives (alongside `StringLiteral` and `NumberLiteral`) so identifiers can reference let-bound names
  - [ ] Regenerate the Langium parser (`just build` or the langium generate step)
- [ ] **Scope: register let bindings**
  - [ ] In `TaoScopeComputation.ts`, register `LetStatement` names as local symbols within their containing view scope
  - [ ] Ensure `IdentifierReference` resolves against view parameters and let-bound names
- [ ] **Validation**
  - [ ] Error on duplicate `let` names within the same view
  - [ ] Error on `IdentifierReference` that doesn't resolve to a known name (let binding or view parameter)
  - [ ] Warning if a let binding shadows a view parameter name
- [ ] **Compiler: emit TypeScript for let statements**
  - [ ] Compile `let name = <expr>` → `const name = <compiled-expr>;` before the JSX return
  - [ ] Compile `IdentifierReference` → emit the JavaScript identifier (e.g. `props.paramName` for view params, `name` for let-bound names)
  - [ ] Ensure let bindings used as view arguments compile correctly (e.g. `Text value age` → `<Text value={age} />`)
- [ ] **Formatter: format let statements**
  - [ ] Format `let` statements with proper indentation inside view bodies
  - [ ] Ensure consistent spacing: `let name = value`
- [ ] **Tests**
  - [ ] Parser tests: `let age = 1`, `let name = "hello"`, let inside view body
  - [ ] Validation tests: duplicate let names, unresolved references, shadowing warnings
  - [ ] Compiler tests: let with number, let with string, let used as view argument, multiple lets in a view
  - [ ] Formatter tests: let statement indentation and spacing
