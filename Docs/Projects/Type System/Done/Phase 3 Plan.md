# Phase 3: Action-local parameter types

## Overview

Phase 1/2 support local parameter types for views.
Phase 3 extends the same model to action declarations and `do <Action>` invocations.
Functions do not exist yet and are explicitly out of scope.

Phase 1 added view-local parameter types:

```tao
view Badge Title is text { }
Badge Title "x"
Badge Badge.Title "x"
```

Phase 2 added explicit dot shorthand for view render arguments:

```tao
Badge .Title "x"
```

Phase 3 generalizes the same model from `view` to `action`:

```tao
action Bump Step is number {
  set Counter += Step
}

action Use {
  do Bump Step 1
  do Bump Bump.Step 2
  do Bump .Step 3
}
```

The goal is one unified callable-parameter model across views and actions:

```tao
<callable> <ParamName> is <SuperType> { ... }
```

creates a local nominal parameter type:

```tao
<CallableName>.<ParamName>
```

and argument expressions may use:

```tao
ParamName <value>                    // bare shorthand in argument context
<CallableName>.ParamName <value>     // fully qualified
.ParamName <value>                   // dot shorthand in argument context
```

---

## Phase 3 scope

Extend local parameter types from view-only to view/action.

This includes:

- grammar reuse (already supports `ParameterDeclaration` with `is` on actions)
- local type creation for action parameters
- qualified type resolution (`Bump.Step`)
- dot shorthand resolution (`.Step`)
- type-driven argument binding at `do` call sites
- Typir identity registration
- validation
- formatter
- codegen
- tests

---

## Non-goals

Do not implement:

1. Functions / func declarations
2. Local parameter types for funcs
3. Function-call argument support
4. Structural inline local types:

```tao
action Save Payload is { Name text } { }
```

5. Optional/default parameter semantics:

```tao
action Save Title? is text { }
```

6. Generic local parameter types:

```tao
action Map Item is T { }
```

7. Most-specific-wins argument binding
8. Namespace splitting
9. Broadening typed-literal value grammar beyond current supported forms

---

# 1. Normative model

## 1.1 Local parameter type declaration

For any view or action:

```tao
action Bump Step is number {
  set Counter += Step
}
```

defines:

```tao
Bump.Step is number
```

and the parameter value is available in the action body as:

```tao
Step
```

This is exactly the same model as views:

```tao
view Badge Title is text { }
```

defines:

```tao
Badge.Title is text
```

---

## 1.2 Canonical identity

The canonical type identity is:

```text
(owner callable declaration identity, local parameter name)
```

The display name is:

```text
Callable.Param
```

The Typir identity key is:

```text
Callable.Param
```

`Bump.Step` is owned by the exact `Bump` action declaration, just like `Badge.Title` is owned by the exact `Badge` view declaration.

Do not identify local parameter types by local name alone.

---

## 1.3 Qualified form

This must work anywhere typed literals are legal:

```tao
do Bump Bump.Step 3
alias StepValue = Bump.Step 3
```

Qualified resolution is by owner callable identity, not string-only matching.

---

## 1.4 Bare argument-context form

Inside an argument list for a callable, a bare constructor head may resolve to that callable's local parameter type:

```tao
do Bump Step 3
```

means:

```tao
do Bump Bump.Step 3
```

when `Bump` has a local parameter type named `Step`.

---

## 1.5 Dot shorthand

Dot shorthand works in argument position for all supported callable kinds:

```tao
do Bump .Step 3
```

means:

```tao
do Bump Bump.Step 3
```

No lexical/global fallback is allowed for dot shorthand.

---

# 2. Resolution rules

## 2.1 Qualified local type resolution

For:

```tao
Bump.Step
```

resolve `Bump` as a type-owner callable.

Valid owners in Phase 3:

```text
view
action
```

Then resolve `Step` as a local parameter type owned by that exact callable declaration.

Do not resolve `Bump.Step` by:

- resolving `Bump` as a normal type
- taking the first scope result named `Bump`
- string-concatenating names
- scanning all callables for `Step`

---

## 2.2 Bare constructor resolution in argument context

For:

```tao
do Bump Step 3
```

resolve by:

1. Find enclosing argument context.
2. Resolve the callee to an exact callable declaration.
3. If callee has local parameter type `Step`, choose that local type.
4. Also perform normal lexical/imported type lookup for `Step`.
5. If both exist and differ, resolve to the local type and emit a production-blocking warning.
6. If only local exists, resolve local.
7. If only normal exists, resolve normal.
8. If neither exists, unresolved.

Warning:

```text
Ambiguous type constructor 'Step' in argument to Bump.
Resolved to 'Bump.Step'. Use '.Step' or 'Bump.Step' to make this explicit.
```

---

## 2.3 Dot shorthand resolution

For:

```tao
do Bump .Step 3
```

resolve by:

1. Find enclosing argument context.
2. Resolve callee to exact callable declaration.
3. Look up local parameter type `Step` on that exact callable.
4. If found, return it.
5. If missing, error.

No lexical fallback.

Error:

```text
Action 'Bump' has no local parameter type '.Step'.
```

---

# 3. Grammar

Parameter syntax already supports:

```langium
ParameterDeclaration:
  name=ID ('is' localSuperType=TypeReference | type=TypeReference)?;
```

This grammar applies uniformly to views and actions. No new grammar is needed.

Example:

```tao
action Bump Step is number {
  set Counter += Step
}
```

No new dot-shorthand grammar is needed — Phase 2 already added `DotLocalTypeRef`.

---

# 4. Shared callable abstraction

Update the callable abstraction to include actions:

```ts
type CallableDeclaration =
  | AST.ViewDeclaration
  | AST.ActionDeclaration
```

This already exists in the codebase (from Phase 1). The key change is removing the Phase 2 view-only restriction on dot shorthand validation.

Helpers (should already exist from Phase 1/2):

```ts
getLocalParameterTypes(callable): LocalParameterType[]
getLocalParameterType(callable, localName): LocalParameterType | undefined
typeIdentityKey(typeLike): string
```

All local-parameter-type logic must use callable identity, not just view identity.

---

# 5. Update Phase 2 view-only restrictions

Phase 2 added a view-only guard on dot shorthand:

```ts
if (!AST.isViewDeclaration(argCtx.callee)) {
  report.error(dotLocalOnNonViewCallee, ...)
}
```

Phase 3 replaces this with a callable check so `ActionDeclaration` callees are accepted alongside views:

```ts
if (!isCallableDeclaration(argCtx.callee)) {
  report.error(typeSystemValidationMessages.dotLocalOnNonCallableCallee(dotName), ...)
}
```

`dotLocalOnNonCallableCallee` remains for hosts that are not view/action (e.g. future callable kinds). `dotLocalMissingType` gains a callee-kind prefix (`View` / `Action`) for clearer diagnostics.

Concrete updates:

1. `validateDotLocalTypeRef` — use `isCallableDeclaration` instead of `AST.isViewDeclaration`
2. `resolveDotLocalType` — same
3. Rename message helper from `dotLocalOnNonViewCallee` to `dotLocalOnNonCallableCallee` and widen the guard accordingly

---

# 6. Scope provider updates

The scope provider must add action-owner synthetic TypeDeclarations alongside view-owner ones.

Update scope registration (e.g. `addCallableOwnerDescriptions`, formerly view-only) so `ActionDeclaration` nodes with local parameter types get owner synthetics alongside views.

Update `addCalleeLocalTypeDescriptions` — should already work for both views and actions since it takes `CalleeDeclaration`.

---

# 7. Typir updates

For local parameter type:

```tao
action Bump Step is number { }
```

register Typir identity:

```text
Bump.Step
```

Subtype:

```text
Bump.Step <: number
number !<: Bump.Step
```

`registerLocalParameterType` should already work for action parameters since it uses `owningCallableOf` which returns both views and actions.

Verify that `onNewAstNode` triggers for `ParameterDeclaration` nodes inside `ActionDeclaration`, not just `ViewDeclaration`.

Use:

```ts
typeIdentityKey(typeLike)
```

for all Typir lookup/registration.

---

# 8. Argument binding

The type-driven binding algorithm is unchanged.

Once:

```tao
do Bump .Step 3
```

infers argument type:

```text
Bump.Step
```

it should bind to parameter:

```text
Step
```

because the parameter declared type is also:

```text
Bump.Step
```

Verify all forms bind identically:

```tao
do Bump Step 3
do Bump Bump.Step 3
do Bump .Step 3
```

---

# 9. Validation

## 9.1 Local parameter type declaration validation

For actions, same as views:

```tao
action Bump Step is number { }
```

must not trigger "parameter shorthand not a type."

---

## 9.2 Dot shorthand outside argument context

Still invalid:

```tao
alias S = .Step 3
```

Error:

```text
'.Step' can only be used as shorthand for a callee-local type in an argument position.
```

---

## 9.3 Missing local type

```tao
do Bump .Amount 3
```

when `Bump` has no local parameter type `Amount`:

```text
Action 'Bump' has no local parameter type '.Amount'.
```

---

## 9.4 Ambiguous bare constructor

```tao
type Step is number

action Bump Step is number { }

action Use {
  do Bump Step 3
}
```

resolves to:

```text
Bump.Step
```

and warns:

```text
Ambiguous type constructor 'Step' in argument to Bump.
Resolved to 'Bump.Step'. Use '.Step' or 'Bump.Step' to make this explicit.
```

Warning-free:

```tao
do Bump .Step 3
do Bump Bump.Step 3
```

---

# 10. Formatter

Ensure these format correctly:

```tao
action Bump Step is number {
  set Counter += Step
}

do Bump .Step 3
```

Do not rewrite:

```tao
.Step
```

to:

```tao
Bump.Step
```

---

# 11. Codegen

No semantic codegen change should be needed if argument binding is updated through shared helpers.

Verify:

```tao
action Bump Step is number {
  set Counter += Step
}

action Use {
  do Bump .Step 3
}
```

emits the same action props as:

```tao
do Bump Bump.Step 3
```

---

# 12. Tests

## 12.1 Parser tests

```tao
action Bump Step is number { }
```

Dot shorthand in action call args:

```tao
do Bump .Step 3
```

---

## 12.2 Validation tests

No shorthand-type error:

```tao
action Bump Step is number { }
```

Missing local type:

```tao
do Bump .Amount 3
```

Dot shorthand outside argument context:

```tao
alias X = .Step 3
```

Ambiguity warning:

```tao
type Step is number
action Bump Step is number { }
action Use { do Bump Step 3 }
```

No warning:

```tao
action Use {
  do Bump .Step 3
  do Bump Bump.Step 3
}
```

---

## 12.3 Type-checking tests

All should pass:

```tao
action Bump Step is number { }

action Use {
  do Bump Step 3
  do Bump Bump.Step 3
  do Bump .Step 3
}
```

Wrong value type:

```tao
do Bump .Step "x"
```

should error.

---

## 12.4 Codegen tests

Ensure equivalent output for:

```tao
do Bump Step 3
do Bump Bump.Step 3
do Bump .Step 3
```

---

## 12.5 Formatter tests

```tao
action Bump Step is number { }
```

```tao
do Bump .Step 3
```

---

# 13. Test apps

Extend:

```text
Apps/Test Apps/Local Param Types/Local Param Types.tao
```

Add action examples:

```tao
state Counter = 0

action Bump Step is number {
  set Counter += Step
}

action UseBump {
  do Bump Step 1
  do Bump Bump.Step 2
  do Bump .Step 3
}
```

---

# 14. Implementation guardrails

Any implementation is incorrect if it:

- assumes local parameter types are view-only
- uses owner name strings instead of callable declaration identity
- resolves `.Step` through lexical/global lookup
- searches all callables for a local type named `Step`
- lets action local types share the same identity key as view local types with the same name
- uses raw `param.name` or raw `decl.name` as Typir key
- emits ambiguity warning for explicit `.Step`
- rewrites `.Step` to `Bump.Step` in formatter
