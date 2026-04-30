# Phase 2: Dot shorthand for callee-local parameter types

This phase implements explicit callee-local shorthand:

```tao
Badge .Title "x"
```

as shorthand for:

```tao
Badge Badge.Title "x"
```

Phase 1 already supports:

```tao
view Badge Title is text { }

Badge Title "x"        // bare argument-context local type resolution
Badge Badge.Title "x"  // explicit qualified local type
```

Phase 2 adds only:

```tao
Badge .Title "x"
```

and the related validation/formatting/tests.

---

## 1. Goal

Allow a typed-literal constructor head to explicitly refer to the current callee's local parameter type without repeating the callee name.

```tao
view Badge Title is text {
  Text Title
}

view Root {
  Badge .Title "Hello"
}
```

This means:

```tao
view Root {
  Badge Badge.Title "Hello"
}
```

---

## 2. Normative resolution model

Dot shorthand is valid only in an argument context where the callee is known.

```tao
Badge .Title "x"
```

resolves by:

1. Resolving the callee expression `Badge` to the exact view declaration.
2. Looking for a local parameter type named `Title` owned by that exact view declaration.
3. Resolving `.Title` to that local type.

This is owner-identity based, not string-based.

Do not resolve `.Title` through lexical scope.

Do not resolve `.Title` by searching all views for a local type named `Title`.

Do not resolve `.Title` outside argument context.

---

## 3. Valid forms

Given:

```tao
view Badge Title is text, Subtitle is text {
  ...
}
```

These are valid:

```tao
Badge .Title "Hello"
Badge .Subtitle "World"
```

Equivalent to:

```tao
Badge Badge.Title "Hello"
Badge Badge.Subtitle "World"
```

Mixed forms are valid:

```tao
Badge .Title "Hello", Badge.Subtitle "World"
```

---

## 4. Invalid forms

Dot shorthand outside argument position is invalid:

```tao
alias X = .Title "Hello"
```

Error:

```text
'.Title' can only be used as shorthand for a callee-local type in an argument position.
```

Dot shorthand for a missing local type is invalid:

```tao
view Badge Title is text { }

view Root {
  Badge .Subtitle "Hello"
}
```

Error:

```text
View 'Badge' has no local parameter type '.Subtitle'.
```

Dot shorthand must not fall back to lexical/global types:

```tao
type Title is text

view Badge Subtitle is text { }

view Root {
  Badge .Title "Hello"
}
```

Error:

```text
View 'Badge' has no local parameter type '.Title'.
```

---

## 5. Relationship to ambiguity warning

Phase 1 warning case:

```tao
type Title is text

view Badge Title is text { }

view Root {
  Badge Title "Hello"
}
```

Still resolves to:

```tao
Badge Badge.Title "Hello"
```

and emits a production-blocking warning:

```text
Ambiguous type constructor 'Title' in argument to Badge.
Resolved to 'Badge.Title'. Use 'Badge.Title' or '.Title' to make this explicit.
```

Phase 2 updates the warning text to mention `.Title`.

These are warning-free:

```tao
Badge Badge.Title "Hello"
Badge .Title "Hello"
```

---

## 6. Grammar

Add support for dot-prefixed local type constructor heads in typed literals.

Existing typed literal examples:

```tao
Title "x"
Badge.Title "x"
```

New form:

```tao
.Title "x"
```

Suggested AST shape:

```ts
TypedLiteralExpression {
  type: NamedTypeRef | LocalTypeRef
  value: Expression
}
```

Where:

```ts
LocalTypeRef {
  name: string // "Title"
}
```

Alternative acceptable implementation:

```ts
NamedTypeRef {
  isCalleeLocal: boolean
  segments: ["Title"]
}
```

But avoid representing `.Title` as the same thing as bare `Title`; resolution semantics differ.

---

## 7. Parser requirements

The grammar must distinguish:

```tao
Title "x"   // bare constructor
.Title "x"  // callee-local constructor
```

Do not narrow legal typed-literal values when adding `.Title`. If current typed literals only support `StringTemplateExpression | NumberLiteral | ObjectLiteral`, preserve that restriction for `.Title` as well. If they already support broader `Expression` values, `.Title` must support the same set.

Tests should match current grammar capability, not aspirational capability.

---

## 8. Resolution algorithm

For `TypedLiteralExpression.type`:

### Case A: qualified type head

```tao
Badge.Title "x"
```

Use existing Phase 1 qualified local type resolution.

No dot-shorthand logic.

---

### Case B: dot-local type head

```tao
.Title "x"
```

Algorithm:

```text
1. Find enclosing argument context with findEnclosingArgumentContext(node).
2. If no argument context, error.
3. Resolve host callee to exact view declaration.
4. Look up local parameter type by owner identity:
   getLocalParameterType(calleeView, "Title")
5. If found, return it.
6. If not found, error.
```

This must not call normal lexical/imported type lookup.

---

### Case C: bare type head

```tao
Title "x"
```

Use existing Phase 1 behavior:

```text
1. In argument context, try callee-local type first.
2. Also check normal lexical/imported type lookup.
3. If both exist and differ, resolve local and warn.
4. Outside argument context, use normal lexical/imported type lookup only.
```

No semantic change except updated warning text.

---

## 9. Scope/provider requirements

Do not inject `.Title` into general scope.

Do not make `.Title` a lexical symbol.

Dot shorthand is a syntactic reference that resolves through the argument context's already-resolved callee.

Required helper:

```ts
resolveDotLocalTypeRef(ref, contextNode): LocalParameterType | undefined
```

Implementation:

```ts
const argContext = findEnclosingArgumentContext(contextNode)
if (!argContext) {
  return undefined
}

const callee = resolveCallee(argContext.host)
if (!callee || !AST.isViewDeclaration(callee)) {
  return undefined
}

return getLocalParameterType(callee, ref.name)
```

---

## 10. Validator updates

Add diagnostics:

### Dot shorthand outside argument context

```tao
alias X = .Title "x"
```

Error:

```text
'.Title' can only be used as shorthand for a callee-local type in an argument position.
```

### Missing local parameter type

```tao
Badge .Subtitle "x"
```

Error:

```text
View 'Badge' has no local parameter type '.Subtitle'.
```

### Dot shorthand on non-view callee

Phase 2 supports dot shorthand for view render arguments only. Phase 1 local parameter types (`Title is text`) are grammar-legal on action declarations but untested and not guaranteed in that context.

If `.Title` appears in an action or function call:

```tao
do SomeAction .Title "x"
```

Emit:

```text
'.Title' shorthand is only supported for view render arguments in this phase.
```

---

## 11. Warning text update

Update Phase 1 warning from:

```text
Ambiguous type constructor 'Title' in argument to Badge.
Resolved to 'Badge.Title'. Use 'Badge.Title' to make this explicit.
```

to:

```text
Ambiguous type constructor 'Title' in argument to Badge.
Resolved to 'Badge.Title'. Use '.Title' or 'Badge.Title' to make this explicit.
```

Do not emit this warning for:

```tao
Badge .Title "x"
Badge Badge.Title "x"
```

---

## 12. Formatter

Preserve dot shorthand:

```tao
Badge .Title "x"
```

Do not rewrite to:

```tao
Badge Badge.Title "x"
```

Ensure spacing:

```tao
Badge .Title "x"
```

not:

```tao
Badge.Title "x"
Badge  .Title "x"
Badge . Title "x"
```

---

## 13. Codegen

No semantic codegen change expected.

Verify:

```tao
Badge .Title "x"
```

binds to the same parameter as:

```tao
Badge Badge.Title "x"
```

and emits the same prop key:

```text
Title
```

---

## 14. Tests

### Parser tests

```tao
Badge .Title "x"
```

parses as a typed literal with dot-local constructor head.

Typed-literal values for `.Title` must match current grammar capability (`StringTemplateExpression | NumberLiteral | ObjectLiteral`):

```tao
Badge .Title "x"
Badge .Count 42
Profile .Person { Name "Ro" }
```

---

### Validation tests

Given:

```tao
view Badge Title is text { }
```

This passes:

```tao
Badge .Title "x"
```

This errors:

```tao
alias X = .Title "x"
```

This errors:

```tao
Badge .Subtitle "x"
```

This errors even if global `Subtitle` exists:

```tao
type Subtitle is text
Badge .Subtitle "x"
```

because dot shorthand never falls back to lexical/global types.

---

### Ambiguity warning tests

Given:

```tao
type Title is text
view Badge Title is text { }
```

This warns:

```tao
Badge Title "x"
```

This does not warn:

```tao
Badge .Title "x"
Badge Badge.Title "x"
```

---

### Type-checking tests

```tao
view Badge Title is text { }

Badge .Title "x" // OK
```

Wrong value type:

```tao
Badge .Title 123
```

Error.

Subtype direction:

```tao
view X T text { }
view Badge Title is text { }

X Badge.Title "x" // OK
X Badge .Title "x" // invalid syntax / not meaningful
```

---

### Codegen binding tests

All three forms bind to the same param:

```tao
Badge Title "x"
Badge Badge.Title "x"
Badge .Title "x"
```

Each emits prop key:

```text
Title
```

---

### Formatter tests

Input:

```tao
Badge .Title "x"
```

Formatted:

```tao
Badge .Title "x"
```

Input:

```tao
Badge .Title "x", .Subtitle "y"
```

Formatted:

```tao
Badge .Title "x", .Subtitle "y"
```

---

## 15. Test app

Extend:

```text
Apps/Test Apps/Local Param Types/Local Param Types.tao
```

Add examples:

```tao
Badge .Title "Hello"
Badge .Subtitle "World"
```

Include:

```tao
Badge Title "Hello"
Badge Badge.Title "Hello"
Badge .Title "Hello"
```

to demonstrate the three equivalent forms.

---

## 16. Non-goals

Do not implement:

1. New local parameter type declaration forms
2. Local parameter types for action/func unless already generalized
3. Dot shorthand outside argument context
4. Dot shorthand fallback to lexical/global types
5. Formatter rewrite from `.Title` to `Badge.Title`
6. Most-specific-wins argument binding
7. Namespace splitting

---

## 17. Implementation guardrails

Any implementation is incorrect if it:

- resolves `.Title` by lexical/global lookup
- searches all views for a local type named `Title`
- resolves `.Title` without an enclosing argument context
- resolves `.Title` by string owner name instead of exact callee declaration identity
- emits ambiguity warning for explicit `.Title`
- rewrites `.Title` to `Badge.Title` in the formatter

---

## 18. Phase 1 gap: fully-qualified argument binding

Phase 1 infrastructure for `Badge Badge.Title "x"` is built (grammar, scope, type inference) but argument fingerprinting in `argumentValueFingerprint` does not account for `NamedTypeRef` segments on `TypedLiteralExpression`. The fingerprint uses `expr.type.ref?.ref` (the view-owner synthetic) instead of resolving through segments to the actual local parameter type target.

This must be fixed as the first step of Phase 2 implementation by introducing `typedLiteralType()` (see section 19).

---

## 19. Implementation checklist

### Step 0 (Phase 1 fix): Central typed-literal type resolution helper

Add a shared helper:

```ts
typedLiteralType(node: AST.TypedLiteralExpression): TypeLike | undefined
```

This helper is the **only approved way** to resolve a typed literal constructor type. It must handle:

- bare `Title`
- qualified `Badge.Title`
- dot-local `.Title` (after grammar support lands)

Replace all direct typed-literal constructor reads:

```ts
node.type.ref?.ref
```

with:

```ts
typedLiteralType(node)
```

at least in:

- `argumentValueFingerprint`
- Typir inference (`TypedLiteralExpression` rule)
- Typir validation (`TypedLiteralExpression` rule)
- `structShapeOfTypedLiteral`
- typed struct field validation
- typed literal value shape validation

This fixes the Phase 1 gap (qualified `Badge.Title` argument binding) and provides the extension point for dot-local resolution.

### Step 1: `DotLocalTypeRef` AST support

Add grammar node for `.Title` in typed-literal constructor position. Ensure it is syntactically distinct from bare `Title`.

### Step 2: Identity helper

Add:

```ts
typeIdentityKey(typeLike: TypeLike): string
```

Examples:

```text
Title       -> "Title"
Badge.Title -> "Badge.Title"
```

Use for Typir lookup and fingerprinting. Do not spread synthetic-node assumptions; all consumers should go through `typedLiteralType()` and `typeIdentityKey()`.

### Step 3: `DotLocalTypeRef` resolution

Must use:

```ts
findEnclosingArgumentContext(node)
getCalleeDeclaration(context.host)
getLocalParameterType(calleeView, ref.name)
```

No lexical fallback.

### Step 4: Qualified `Badge.Title` resolution fix

Qualified resolution must resolve the full path to the final type target, not stop at `Badge`. This is handled by `typedLiteralType()` from Step 0.

### Step 5: Update ambiguity warning text

Update Phase 1 warning to include `.Title`:

```text
Use '.Title' or 'Badge.Title' to make this explicit.
```

### Step 6: Validation for `.Title` errors

- Outside argument context
- Missing local type on callee
- Non-view callee

### Step 7: Formatter for `.Title`

Preserve `.Title` form. No space between `.` and `Title`. One space before `.Title` in argument list.

### Step 8: Tests

Prove all three forms bind to the same parameter:

```tao
Badge Title "x"
Badge Badge.Title "x"
Badge .Title "x"
```

Each emits prop key `Title`.

### Step 9: Update test app

Add `.Title` examples to `Apps/Test Apps/Local Param Types/Local Param Types.tao`.
