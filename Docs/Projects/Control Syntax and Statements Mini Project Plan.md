# Control Syntax And Statements Mini Project Plan

## Summary

Implement the first narrow control-syntax slice: comparisons, a list/query `.Empty` predicate, statement-form `if` / `else`, and pure top-level `func` declarations with explicit calls and `return Value`.

This mini plan intentionally takes only the first useful pieces from the full Control Syntax And Statements plan. It should make basic Tao screens branch, show empty states, compute small reusable values, and compile that behavior end to end without pulling in events, `when`, richer guards, full error flow, or broad invocation redesign.

## Goals

- Add comparison expressions usable in normal Tao conditions.
- Add a small `.Empty` predicate for supported list/query values.
- Add statement-form `if` / `else` with `else if` sugar.
- Preserve context-specific statement validation inside `if` branches.
- Add pure top-level/module-level `func` declarations.
- Add explicit function call expressions.
- Add function-only `return Value`.
- Preserve whole-view reactive-read hoisting when nested `if` branches read state/query values.
- Update parser, validation, formatter, codegen, and test-app coverage for this implemented slice.

## Non-Goals

- Local `on` event handlers.
- `when`.
- Guard/check/boundary changes beyond whatever existing behavior must continue working.
- Boolean operator expansion beyond what this slice truly needs. Defer broad `and` / `or` / `not` support unless implementation shows it is a low-risk prerequisite.
- Expression-form `if`.
- Expression-bodied functions.
- Implicit final-expression returns.
- Bare `return` in actions.
- Action return values.
- Function effects, async functions, or functions that render UI.
- Local/nested function declarations inside views, actions, or other functions.
- Direct function access to reactive state/query values unless those values are passed as parameters.
- Type/variant pattern matching.
- Query or guard declarations inside nested `if` branch blocks.
- `try` / `catch`, `finally`, `defer`, transactions, task blocks, resource scopes, declarative effects, custom events, and arbitrary loops.
- Universal view/function/action invocation redesign.

## Assumptions

- The full plan remains the broader source for later phases. This mini plan is the first implementation target.
- Grammar changes require `./agent gen`.
- Validation owns semantic restrictions before codegen.
- Codegen may assume the AST has passed validation.
- General expression comparisons use `==`, `!=`, `<`, `<=`, `>`, and `>=`. Existing query-filter `=` remains query DSL syntax and is not reused as general expression equality.
- Function calls should use an explicit expression-position call form, `FunctionName(Arg1, Arg2)`, rather than Tao's render/action adjacency syntax.
- Function argument binding should extend the existing declaration-parameter and argument-binding machinery to `func` instead of inventing a parallel loose call path.
- Generated view code should keep the whole-view reactive-read model: collect reactive reads across the view body first, hoist them, then emit render/control code.
- Render `if` lowering may use inline functions/IIFEs so generated TSX stays close to the Tao AST tree, but those inline functions only branch over already-hoisted values.
- Render `if` without an `else` returns `null` for the skipped branch. Action and function `if` without `else` fall through normally.
- Intermediate commits inside a numbered step can be smaller than the full step and do not need full-suite validation until the step exit criteria.

## Mini-Slice Decisions

- `.Empty` is the shipped empty-state predicate for the mini slice.
- `QueryAlias.Empty` and `ListValue.Empty` are compiler-recognized pseudo-members, not ordinary selected fields.
- `.Empty` validates only on supported query/list handles and lowers to the runtime collection cardinality or length check.
- `.Empty` does not introduce new loading behavior. Existing `guard` or existing query runtime defaults still own loading state; validation should reject `.Empty` where the type cannot be treated as a current collection value.
- View `if` branch blocks allow render statements and nested control needed for render branching. They do not introduce support for declaring new `query` or `guard` statements inside branches in this mini slice.
- Functions are top-level/module-level only. Local helpers are deferred unless the existing declaration model makes them trivial without new scoping rules.
- Functions are pure value code. Their bodies may use parameters, pure expressions, `if`, and `return`; local aliases are allowed only if an existing function-safe binding path already exists. They may not use `state`, `query`, render statements, `set`, `do`, navigation, guards, event handlers, or effects.
- Every function must contain at least one explicit `return Value`. Full return-path analysis is deferred, but declared-return functions should reject obvious fallthrough paths that the simple syntactic checker can see.
- Return type inference is limited to expression-type propagation from explicit returns; broad inference and implicit final-expression returns are deferred.

## Compiler Integration Checklist

Implementation should account for these integration points before treating the slice as done:

- Grammar and generated AST unions for `IfStatement`, comparison expressions, `.Empty` pseudo-member representation if needed, `FunctionDeclaration`, `ReturnStatement`, and call expressions.
- Statement-family rules for `Statement`, `ViewStatement`, `ActionStatement`, and the new function statement context.
- Shared block-context helpers such as `getBlockStatementContext` so branch blocks inherit the enclosing render/action/function family.
- Validation for condition expressions, branch body legality, function body legality, return placement, return type compatibility, `.Empty` receiver types, and unsupported nested `query` / `guard` declarations inside `if`.
- Scoping, exported symbols, callee resolution, `CalleeDeclaration`, `ArgumentListHost`, and argument binding for function declarations and calls.
- Typir/type integration for function parameters, return expressions, comparison operands, call expressions, and `.Empty` booleans.
- Codegen dispatch for normal statements, render-fragment statements, action statements, and function statements.
- Render codegen that emits branch IIFEs only after whole-view state/query reads used in nested branch expressions have been collected and hoisted.
- Formatter dispatch and tests for each new syntax node.

## Intended Implementation Steps

### 1. Add Comparison And Empty-State Condition Foundations

Context: `if` needs useful conditions before it can make real app code better. This mini slice should add comparisons and one empty-state predicate, without expanding into the full expression roadmap.

Concrete work:

- Add comparison expressions: `==`, `!=`, `<`, `<=`, `>`, and `>=`.
- Implement `.Empty` for supported list/query values.
- Validate comparison operand compatibility where the type system can know it.
- Validate that `.Empty` is only used on supported collection/query values.
- Add condition validation helpers that accept boolean literals/references, comparison expressions, and the empty-state predicate.
- Keep broad boolean composition deferred unless it is needed to keep the grammar coherent.

Likely commit units:

- Grammar/AST changes for comparison expressions.
- `.Empty` predicate representation and validation.
- Condition validation helper and diagnostics.
- Parser and validation tests.

Validation:

- Run `./agent gen` after grammar edits.
- Use targeted compiler parser/validation tests while iterating.
- Step exit should pass the relevant compiler parser/validation test filters.

Exit criteria:

- Tao can parse and validate conditions such as `Room.Name == ""`, `Count > 0`, and `Rooms.Empty`.
- Unsupported `.Empty` receivers produce clear diagnostics.
- The formatter can preserve/print comparison expressions.

Suggested commit subject pattern: `control syntax: add comparison conditions`

### 2. Implement Statement-Form `if` / `else`

Context: Conditional rendering and action branching are the highest-value control feature. This step should support statement-form `if` without expression-form conditionals.

Concrete work:

- Add `IfStatement` grammar with a condition expression, then block, optional `else` block, and `else if` sugar.
- Allow `if` in view/render and action contexts.
- Allow `if` in function contexts once step 3 introduces function bodies.
- Validate that each branch body uses the enclosing statement family.
- Reject nested `query` and `guard` declarations inside `if` branches for this mini slice.
- Validate conditions through the helper from step 1.
- Render `if` without `else` as `null` for the skipped branch.
- Lower render `if` branches to AST-linear TSX, using inline functions/IIFEs or equivalent helpers that reference already-hoisted values.
- Lower action and function `if` branches to normal TypeScript control flow.
- Preserve whole-view reactive-read collection before render lowering, including state/query reads used by expressions inside nested `if` / `else` branches.
- Add diagnostics for invalid render/action/function statements inside branches.
- Add formatter coverage for `if`, `else if`, and `else`.

Likely commit units:

- Grammar/AST and parser tests.
- Validation tests for branch context legality.
- Render/action codegen tests.
- Formatter tests.

Validation:

- Use targeted parser, validation, formatter, and codegen tests while iterating.
- Step exit should pass relevant compiler and formatter test filters.

Exit criteria:

- View blocks can render empty/content branches.
- Action blocks can branch before state updates, `do`, or navigation statements.
- Nested `if` / `else` inside a view compiles without changing reactive-read ordering.
- Query/guard declarations inside nested `if` branches are clearly rejected until the later guard/hoisting slice expands their placement.
- `else if` formats and emits equivalently to nested `if`.

Suggested commit subject pattern: `control syntax: implement if else statements`

### 3. Implement Pure Functions, Calls, And Returns

Context: Pure value helpers are the only callable-body feature in this mini slice. They must not render UI or run effects.

Concrete work:

- Add top-level/module-level `func` declarations if they are not already represented in the live grammar.
- Support parameter lists using the existing declaration parameter conventions.
- Support explicit return type annotations with `-> TypeExpression` if this fits the local grammar cleanly.
- Add `ReturnStatement` for function bodies.
- Add explicit function call expressions as the second function substep after declarations/returns are represented.
- Extend scoping, callee resolution, `CalleeDeclaration`, `ArgumentListHost`, type checking, Typir integration, and argument binding for functions and calls.
- Validate that `return Value` is legal only inside functions in this mini slice.
- Validate that function bodies allow only function-safe statements: parameters, pure expressions, `if`, return-oriented flow, and local aliases only if they already have a function-safe implementation path.
- Reject render statements, action/effect statements, `set`, `do`, data mutations, navigation, event handlers, and guards inside functions.
- Reject direct reactive state/query access inside functions unless the value is passed as a parameter.
- Validate declared return types where possible.
- Require every function to contain at least one explicit `return Value`.
- Defer full return-path analysis, but reject obvious declared-return fallthrough cases when a small syntactic checker can see them.
- Generate TypeScript functions and call expressions.
- Add formatter coverage for `func`, call expressions, and `return`.

Likely commit units:

- Grammar/AST for `func` declarations and returns.
- Function call expressions and argument binding.
- Validation rules and diagnostics for function bodies and return placement.
- Codegen tests for functions and calls.
- Formatter tests.

Validation:

- Run `./agent gen` after grammar edits.
- Use targeted parser/validation/codegen/formatter tests while iterating.
- Step exit should pass relevant compiler and formatter test filters.

Exit criteria:

- Tao can declare a pure helper, call it from render/property expressions, and return a typed value.
- `return` outside a function is rejected.
- Functions cannot render UI or run effects.
- Functions cannot read reactive state/query values except through parameters.
- Function calls do not require a universal invocation redesign.

Suggested commit subject pattern: `control syntax: add pure functions and returns`

### 4. Add Focused Test-App And Docs Coverage

Context: The mini slice should be visible in a real Tao app and not only in isolated parser tests.

Concrete work:

- Create one new focused app under `Apps/Test Apps/Control Syntax Mini/`.
- Make the app a small Rooms-style screen, not a syntax sampler.
- Use that one new app to demonstrate all new mini-slice functionality: render `if`, action `if`, function `if`, comparisons, `.Empty`, `else if`, nested `if` / `else`, pure function calls, and `return Value`.
- Include row/list rendering through existing `for` support, an empty-state branch, a non-empty/content branch, a status/count-style comparison branch using supported values, an action branch, and a pure function used from render.
- Include a codegen fixture or scenario where reactive reads appear in separate nested branches and generated output proves those reads are hoisted before the IIFE render tree.
- Add parser tests for accepted and rejected syntax.
- Add validation tests for invalid branch statements, invalid conditions, invalid empty predicates, invalid function body statements, and invalid `return` placement.
- Add formatter tests for all new syntax.
- Add codegen tests for render branches, action branches, functions, calls, `.Empty`, and nested branch read hoisting.
- Update the full plan or research doc only if implementation decisions diverge from this mini plan.

Likely commit units:

- Test app and scenario.
- Parser/validation/formatter tests.
- Codegen tests.
- Small docs update if needed.

Validation:

- Use targeted compiler/formatter/runtime filters while iterating.
- Step exit should pass the targeted test-app/scenario checks and relevant compiler/formatter test filters.

Exit criteria:

- The mini slice is demonstrated in a real app.
- Parser, validation, formatter, codegen, and test-app coverage all exist for the implemented syntax.
- Generated render output hoists branch-local state/query reads before inline render branch functions.
- Deferred features remain rejected or unimplemented.

Suggested commit subject pattern: `control syntax: add mini test app`

### 5. Final Mini-Slice Readiness

Context: This step closes the mini project without implementing the deferred full-plan items.

Concrete work:

- Re-run generated parser artifacts and formatting.
- Review diagnostics for common first-use mistakes.
- Confirm no deferred syntax accidentally parses or validates.
- Update `Docs/Tao Project Roadmap.md` after implementation status changes.

Likely commit units:

- Final diagnostics/docs cleanup if needed.
- Final generated or formatting cleanup if needed.

Validation:

- Run `./agent fix`.
- Run `./agent check`.
- Run targeted runtime/compiler tests for the mini app.
- Run `./agent prep-commit` before any commit workflow.

Exit criteria:

- The mini implementation is ready for implementation review.
- The full Control Syntax And Statements plan remains available for the next slice.

Suggested commit subject pattern: `control syntax: finalize mini slice`

## Validation

Planning validation:

- `./agent dprint check --incremental=false`
- `./agent git diff --check`

Implementation validation:

- Grammar edits: `./agent gen`
- Parser, validation, and codegen work: targeted `./agent compiler test` filters, then broader `./agent compiler test` at step boundaries
- Formatter work: `./agent formatter test`
- Test app/runtime work: the nearest targeted test-app or scenario filters
- Final readiness: `./agent fix`, `./agent check`, and `./agent prep-commit`

## Deferrals

Everything not listed in the goals is deferred to the full plan or later project work, especially:

- optional-only `when`
- local `on` event handlers
- guard/check/boundary expansion
- broad boolean logic beyond comparisons
- expression-form `if`
- expression-bodied functions and implicit returns
- action early returns and action return values
- type/variant matching
- transactions, tasks, resources, declarative effects, full exception flow, custom events, and arbitrary loops
