# Control Syntax And Statements Project Plan

## Summary

Implement the smallest useful Tao control-statement slice for real app work: conditionals, empty states, optional branching, clear guard behavior, minimal local event/form handlers, value functions, and returns.

This is not a general-purpose language expansion. The point is a solid first Tao app experience: render different UI states, compute reusable values, branch action logic, handle optional/missing values, keep loading guards understandable, and wire basic button/input interactions without needing lower-level escape hatches.

The first implementation slice is tracked separately in [Control Syntax And Statements Mini Project Plan](./Control%20Syntax%20and%20Statements%20Mini%20Project%20Plan.md). This full plan remains the broader follow-up scope after the mini slice lands.

## Goals

- Add statement-form `if` / `else` with `else if` sugar.
- Add boolean and comparison expression support needed by conditions.
- Add a small list/query empty-state predicate so basic apps can express empty screens without new loop syntax.
- Add pure `func` declarations, function call expressions, and `return Value`.
- Add optional-only statement-form `when`.
- Preserve the separation between render statements, action statements, and function/value statements.
- Tighten bare `guard` semantics, placement, whole-view reactive-read hoisting, and diagnostics without expanding into a full boundary system.
- Add minimal render-local `on` handlers for `press`, `change`, and `submit`.
- Keep validation authoritative so codegen can assume a valid AST.
- Add parser, validation, formatter, codegen, and test-app coverage for the implemented slice.

## Non-Goals

- Expression-form `if`.
- Expression-form `when`.
- Type/variant `when` arms.
- Predicate arms, destructuring, and broad exhaustiveness for `when`.
- Broad generics or polymorphism work.
- Arbitrary `while`, `repeat`, `break`, or `continue`.
- Action early returns and action return values.
- Full exception systems, `try` / `catch`, `finally`, and `defer`.
- Transactions, resource scopes, task blocks, and general effect blocks.
- Custom event protocols with `does` / `emit`.
- `focus` / `blur` events unless they turn out to be trivial after the first event path lands.
- Implicit event bubbling.
- A complete universal invocation redesign for views, functions, and actions.
- Broad form validation syntax such as first-class `validate` blocks.

## Assumptions

- Grammar changes require regenerating parser artifacts with `./agent gen`.
- Formatter support should land with each syntax feature rather than as a final cleanup dump.
- Validation owns semantic restrictions: allowed statement contexts, return legality, branch condition types, narrowing scope, and event-handler placement.
- Codegen should stay lean and assume validation has already enforced the contract.
- Function call syntax for this slice should be explicit in expression position. This avoids forcing the project to solve all view/function/action invocation ergonomics at once.
- Minimal local event handlers are for known runtime/std-lib events only. Custom event declarations and propagation stay with the interactions project.
- View-like declarations compile in two phases: collect every reactive read used anywhere in the view body, then emit render/control code using the already-hoisted values.
- The reactive-read collection pass must traverse nested `if` / `else`, `when`, `for`, `guard`, and render-child blocks before render lowering.
- Render control statements may lower to inline functions/IIFEs to keep generated TSX linear with the Tao AST tree, but hook/read setup must not be emitted inside those inline render functions.
- Function calls have wider blast radius than their syntax suggests because they affect grammar, scoping, argument binding, type checking, formatter behavior, and codegen.
- A Codex-only research retry produced usable feedback and narrowed this plan: optional-only `when`, events before functions, hook-safety work for conditionals, `press` / `change` / `submit` only, and explicit empty-state predicates. The user then clarified the intended implementation approach: hook safety should come from whole-view reactive-read collection and hoisting, not from banning nested conditional control.

## Intended View Lowering Shape

Generated view code should keep this shape:

```tsx
function RoomsScreen() {
  const Rooms = useTaoQuery(RoomsQuery)
  const Session = useTaoState(SessionState)

  const roomsEmpty = Rooms.length === 0
  const signedIn = Session != null

  return (
    <Col>
      {(() => {
        if (!signedIn) {
          return <Text>{'Please sign in'}</Text>
        }

        return (() => {
          if (roomsEmpty) {
            return <Text>{'No rooms yet.'}</Text>
          }

          return <RoomList rooms={Rooms} />
        })()
      })()}
    </Col>
  )
}
```

The exact helper names and TSX formatting can differ, but the invariant is fixed: every reactive read used by the view is loaded before render/control code runs. Nested control affects rendered output, not reactive dependency collection.

## Intended Implementation Steps

### 1. Establish Control Foundations And Condition Expressions

Context: `if`, `when`, events, and function returns need a shared expression base and statement-family validation. The current expression grammar already has arithmetic, literals, grouping, member access, and action expressions; query filters separately support `and` / `or`. Basic apps also need an empty-state predicate for lists and query results without adding `for empty` syntax yet.

Concrete work:

- Add general boolean logic expressions: `and`, `or`, and `not`.
- Add comparison expressions: `==`, `!=`, `<`, `<=`, `>`, and `>=`.
- Add or expose a small list/query empty predicate, for example `Tasks.Empty` or the chosen equivalent.
- Reuse existing comparison/operator conventions where they already exist for queries.
- Make condition expressions validate to boolean where type information is available.
- Add or adjust shared AST helpers so control statements can ask "which statement context am I in?" without duplicating logic in every feature.
- Add parser and validation tests for expression precedence and invalid condition values.

Likely commit units:

- Grammar and generated AST for boolean/comparison expressions.
- Empty predicate representation and validation for list/query values.
- Validation helpers for boolean conditions and statement-family checks.
- Parser/validation/formatter tests for the new expressions.

Validation:

- Run `./agent gen` after grammar edits.
- Run targeted compiler parser/validation tests while iterating.
- Step exit should pass `./agent compiler test`.

Exit criteria:

- Conditions can use real app expressions such as `RoomName != "" and not Saving`.
- Apps can express empty states with `if Tasks.Empty` or the chosen equivalent.
- Invalid non-boolean conditions produce clear diagnostics.
- Formatter output is stable for the new expression forms.

Suggested commit subject pattern: `control syntax: add condition expression foundations`

### 2. Implement Statement-Form `if` / `else`

Context: Conditional rendering and action branching are the most urgent missing control-flow feature. Tao should add statement-form branching first and defer expression-form conditionals.

Concrete work:

- Add `IfStatement` grammar with a condition expression, a then block, optional `else` block, and `else if` sugar.
- Allow `if` in view/render, action, and function contexts.
- Validate that branch bodies use the statement family of the enclosing context.
- Validate boolean conditions through the helper from step 1.
- Generate render branches as inline TSX functions/IIFEs or equivalent helpers that stay linear with the Tao AST while only referencing already-hoisted reactive values.
- Generate action/function branches as normal TypeScript control flow.
- Format multiline `if`, `else if`, and `else` blocks canonically.
- Add diagnostics for invalid render/action/function statements inside branches.

Likely commit units:

- Grammar/AST and parser tests for `if`.
- Validator and diagnostic tests for context legality.
- Codegen tests for render/action/function branches.
- Formatter tests.

Validation:

- Intermediate commits may use targeted parser and formatter tests.
- Step exit should pass `./agent compiler test` and `./agent formatter test`.

Exit criteria:

- View blocks can render loading/empty/content branches.
- Action blocks can branch before `set`, `do`, and navigation statements.
- Function blocks can branch before returning values.
- `else if` formats and emits equivalently to nested `if`.
- Nested `if` / `else` inside a view compiles without changing reactive-read ordering because dependencies were collected before render lowering.

Suggested commit subject pattern: `control syntax: implement if else statements`

### 3. Tighten Bare `guard` Semantics And Reactive-Read Hoisting

Context: Bare `guard { ... }` already exists. This project should make it trustworthy before adding richer `guard loading/missing/failed`, `check`, or `boundary` syntax. It should also lock in Tao's view compilation model: collect reactive reads across the whole view body first, hoist them to the top of the generated component, then emit render/control flow afterward.

Concrete work:

- Document and enforce bare `guard` as a view-only loading boundary.
- Validate where `guard` may appear inside view/render blocks and branches.
- Clarify whether it applies to all rendering below it or to an explicit syntactic scope, then encode that rule in validation/codegen.
- Add or audit the whole-view reactive-read collection pass for view-like declarations.
- Ensure the collector traverses nested `if` / `else`, optional-only `when`, `for`, `guard`, and render-child blocks.
- Ensure render lowering references already-hoisted reactive values and does not emit hook/read setup inside inline render-control functions.
- Improve diagnostics for `guard` inside actions/functions or unsupported positions.
- Ensure formatter behavior is stable when `guard` appears near `if`, `when`, and `for`.
- Add focused render/codegen tests covering current guard behavior, nested control, and reactive-read hoisting.

Likely commit units:

- Validation rules and diagnostics for guard placement.
- Reactive-read collector traversal updates and tests for nested control statements.
- Codegen cleanup if the current semantics are implicit or inconsistent.
- Formatter/tests/docs for guard usage.

Validation:

- Run targeted compiler validation and codegen tests.
- Step exit should pass `./agent compiler test` and `./agent formatter test`.

Exit criteria:

- The MVP loading-boundary behavior is explicit and tested.
- Unsupported richer guard/check forms are intentionally rejected.
- Guard behavior composes predictably with `if`, optional-only `when`, and `for`.
- Nested conditionals inside view bodies do not affect reactive-read ordering.
- Generated inline render functions/IIFEs only branch over already-hoisted values.

Suggested commit subject pattern: `control syntax: hoist reactive reads for control`

### 4. Add Minimal Local Event/Form Handlers

Context: Basic Tao apps need button and input interactions. This step should provide a narrow local event path without implementing the full interactions/event protocol. It comes before functions because a first Tao app needs buttons/forms sooner than reusable helper functions.

Concrete work:

- Add local `on Event { ... }` handler statements only where they are attached to render nodes that can expose known events.
- Support the first event set: `press`, `change`, and `submit`.
- Support typed payload binding for input-like events where needed, for example `on change Value text { ... }`.
- Treat handler bodies as action-statement bodies.
- Allow handlers to call actions with `do`, mutate state with `set`, and use `if` branching.
- Reject render statements inside event handlers.
- Map known events to React Native/Expo runtime props or Tao runtime helpers.
- Add headless/runtime behavior for deterministic event tests where available.
- Defer `focus`, `blur`, `does`, `emit`, action lifecycle events, query events, timers, app/platform events, bubbling, debounce/throttle, and custom event declarations.

Likely commit units:

- Grammar and validation for local `on`.
- Runtime/codegen mapping for `press`, `change`, and `submit`.
- Test app and headless scenario coverage for button and text-input flows.
- Formatter tests.

Validation:

- Intermediate commits may use targeted compiler/runtime tests for one event at a time.
- Step exit should pass `./agent compiler test`, `./agent headless-test-runtime test` if event scenarios touch headless runtime, and `./agent formatter test`.

Exit criteria:

- A small Tao form can update local state and submit via actions.
- Invalid event names or handler statement types produce clear diagnostics.
- Full custom event protocol remains explicitly deferred.

Suggested commit subject pattern: `control syntax: add minimal local event handlers`

### 5. Implement Optional-Only Statement-Form `when`

Context: `when` should solve optional present/absent branching first. Type and variant arms are useful, but they need runtime discriminant metadata and deeper type-system plumbing, so they should move to a later type-system-aligned phase.

Concrete work:

- Add `WhenStatement` grammar with a scrutinee expression and `is` arms.
- Support optional present and optional absent arms. The absent arm uses `is ?` unless implementation finds a stronger local convention.
- Allow `when` in view, action, and function contexts.
- Validate that each arm body uses the enclosing statement family.
- Narrow the scrutinee inside each arm where the optional type system can represent it.
- Reject `is ?` for non-optional values.
- Reject type/variant arms, predicate arms, destructuring, multiple scrutinees, and expression-form arms in this slice.
- Generate optional `when` as TypeScript branch logic using validation-provided narrowing assumptions.
- Format arms consistently.

Likely commit units:

- Grammar/AST and parser tests for `when`.
- Validation/narrowing tests for optional arms.
- Codegen tests for render/action/function contexts.
- Formatter tests.

Validation:

- Intermediate commits may validate with targeted `when` parser/validation tests.
- Step exit should pass `./agent compiler test` and `./agent formatter test`.

Exit criteria:

- Apps can branch on optional values without unsafe member access.
- `is ?` is rejected for non-optional values.
- Arm-local narrowing does not leak outside the arm.
- Deferred pattern features produce clear parse or validation errors.

Suggested commit subject pattern: `control syntax: add optional when statements`

### 6. Implement Pure Functions, Calls, And Returns

Context: Tao needs reusable value helpers without letting functions become hidden render/effect blocks. This step should keep functions pure and explicit. It comes after the app-flow basics because function calls have broad implementation reach across grammar, scoping, argument binding, type checking, formatter behavior, and codegen.

Concrete work:

- Add `func` declarations if they are not already represented in the live grammar.
- Support parameter lists using the existing declaration parameter conventions.
- Support optional declared return types using `-> TypeExpression`.
- Add `ReturnStatement` for function bodies.
- Add explicit function call expressions for expression position.
- Validate that function bodies allow expression/local binding/branch/return-oriented statements only.
- Reject render statements, action/effect statements, `set`, `do`, data mutations, navigation, and local event handlers inside functions.
- Infer return types where possible and validate declared return types where present.
- Keep full return-path analysis deferred unless a simple, local check is cheap. Prefer obvious missing-return diagnostics over whole-function control-flow analysis in this slice.
- Generate TypeScript functions with precise signatures where Tao type information is available.

Likely commit units:

- Grammar/AST for `func`, call expressions, and returns.
- Validation rules for function statement legality and return placement.
- Return type inference/annotation checks.
- Codegen and formatter coverage.

Validation:

- Run `./agent gen` after grammar edits.
- Run targeted compiler tests for parsing, validation, and codegen.
- Step exit should pass `./agent compiler test` and `./agent formatter test`.

Exit criteria:

- Tao code can declare a pure helper, call it from render/property expressions, and return a typed value.
- `return` outside a function produces a clear diagnostic.
- Bare action `return` remains invalid in this slice.
- Functions cannot render UI or run effects.

Suggested commit subject pattern: `control syntax: add pure functions and returns`

### 7. Add The Control Syntax Test App And Documentation

Context: The final behavior should be visible in a real Tao app, not only isolated parser tests.

Concrete work:

- Add a focused app under `Apps/Test Apps/Control Syntax and Statements/`.
- Demonstrate `if` / `else`, nested `if` / `else`, `else if`, empty-state predicates, optional-only `when`, guard behavior, minimal event/form flow, and function calls/returns.
- Include a scenario where reactive reads appear in separate nested branches and generated/runtime behavior proves those reads are hoisted before render control executes.
- Add or update a scenario file that proves the user-visible states.
- Add Kitchen Sink language examples only if they fit existing organization.
- Update language/design docs that need to reflect the accepted first-slice syntax.
- Keep broad brainstorm material in the research doc, but make the implementation plan the source of truth for this sprint.

Likely commit units:

- Test app and scenario.
- Compiler/runtime test wiring.
- Documentation updates.

Validation:

- Run targeted app/scenario tests while iterating.
- Step exit should pass `./agent test "Control Syntax"` if a filter exists, or the nearest targeted compiler/runtime test filters.

Exit criteria:

- The new app demonstrates a coherent first Tao control-syntax experience.
- Docs distinguish implemented MVP syntax from deferred inventory.

Suggested commit subject pattern: `control syntax: add test app and docs`

### 8. Final Integration And Merge Readiness

Context: Grammar, validation, formatter, codegen, runtime, and docs will all move in this project. The final step should remove drift before review.

Concrete work:

- Re-run generated parser artifacts and formatting.
- Review diagnostics for common mistakes and improve wording where needed.
- Remove temporary compatibility shims or duplicate helpers introduced during implementation.
- Update `Docs/Tao Project Roadmap.md` when implementation status changes.
- Confirm no deferred syntax is accidentally accepted.

Likely commit units:

- Final diagnostics cleanup.
- Final docs/roadmap update.
- Any small formatter or fixture normalization left by the implementation.

Validation:

- Run `./agent fix`.
- Run `./agent check`.
- Run `./agent test` if the implementation touched runtime behavior broadly.
- Run `./agent prep-commit` before any commit workflow.

Exit criteria:

- Full repo checks pass or any remaining failure is documented as unrelated and accepted by the user.
- Roadmap and docs match the implemented behavior.
- The project is ready for `project-6-review-implementation`.

Suggested commit subject pattern: `control syntax: finalize integration`

## Validation

Planning validation:

- `./agent dprint check --incremental=false`
- `./agent git diff --check`

Implementation validation should scale by step:

- Grammar edits: `./agent gen`
- Parser/validation/codegen work: targeted `./agent compiler test` filters, then full `./agent compiler test`
- Formatter work: `./agent formatter test`
- Runtime/event work: relevant runtime package tests and scenario tests
- Final readiness: `./agent fix`, `./agent check`, and `./agent prep-commit`

## Deferrals

- Expression-form `if` and `when`.
- Type/variant `when`, rich `when` patterns, predicates, destructuring, and full exhaustiveness.
- Full `check`, `boundary`, and typed `guard loading/missing/failed` syntax.
- Action early returns, action return values, and full action lifecycle result handling.
- `try` / `catch`, `finally`, `defer`, and typed exception systems.
- Transactions, resource scopes, task blocks, and declarative effects.
- General-purpose loops and loop control statements.
- `focus`, `blur`, `does` / `emit`, implicit event bubbling, timers, app/platform events, and custom event protocols.
- Universal invocation redesign.
- Control-specific test syntax.
