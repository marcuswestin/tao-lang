# Phase 4: Contextual typed-literal values

## Overview

Phases 1–3 established local parameter types and the three constructor forms:

```tao
Badge Title "x"
Badge Badge.Title "x"
Badge .Title "x"

do Bump Step 3
do Bump Bump.Step 3
do Bump .Step 3
```

But typed literals are still intentionally narrow:

```langium
TypedLiteralExpression:
  type=(NamedTypeRef | DotLocalTypeRef)
  value=(StringTemplateExpression | NumberLiteral | ObjectLiteral);
```

Phase 4 broadens typed-literal values so constructors can wrap ordinary expressions:

```tao
Title SomeText
Title (A + B)
Title action { ... }
Title when IsReady -> "Ready" otherwise -> "Loading"
```

The goal is to make `Type <value>` a general expression-level constructor, not only a literal wrapper.

---

# Phase 4 scope

Implement broader typed-literal value support for:

```tao
NamedTypeRef <Expression>
DotLocalTypeRef <Expression>
```

Examples:

```tao
Badge .Title SomeTitleAlias
Badge .Title ("Hello " + Name)
Badge .Action action { do Save }

do Bump .Step Amount
do Bump .Step (Count + 1)
```

Keep existing object literal support:

```tao
Profile .Person { Name "Ro", Age 40 }
```

---

# Non-goals

Do not implement:

1. Function declarations
2. Generic typed constructors
3. Most-specific-wins argument binding
4. Namespace splitting
5. Callable-local structural type declarations:

```tao
view Profile Person is { Name text } { }
```

6. Optional/default parameter syntax:

```tao
view Card Title? is text { }
```

7. New cast syntax:

```tao
Value as Type
```

---

# 1. Normative model

A typed literal constructor is an expression:

```tao
Type Value
```

It means:

```text
construct/tag Value as Type
```

The constructor type may be:

```tao
Title "x"          // bare NamedTypeRef
Badge.Title "x"    // qualified NamedTypeRef
.Title "x"         // DotLocalTypeRef in argument context
```

The value may be any expression form supported by the grammar, subject to parsing constraints.

---

# 2. Type rules

For:

```tao
Title Expr
```

where `Title is BaseType`, type-check:

```text
Expr <: BaseType
```

If valid, the resulting expression has type:

```text
Title
```

Example:

```tao
type Title is text

alias Raw = "Hello"
alias T = Title Raw
```

`Raw` has type `text`, `Title` expects `text`, result has type `Title`.

Invalid:

```tao
alias T = Title 123
```

Error:

```text
Cannot construct Title from number; expected text.
```

---

# 3. Grammar risk

The reason this was deferred is ambiguity.

This must not make the parser confuse:

```tao
Button Title
```

with:

```tao
Button (Title <missing-value>)
```

or confuse:

```tao
Button Title SomeAlias
```

between:

```tao
Button (Title SomeAlias)
```

and any older labeled-argument interpretation.

Since labeled arguments are already removed, the remaining risks are mostly expression-boundary risks:

```tao
Title A + B
```

Should this parse as:

```tao
(Title A) + B
```

or:

```tao
Title (A + B)
```

Recommended rule:

```text
Typed literal constructor binds tighter than binary operators.
```

So:

```tao
Title A + B
```

parses as:

```tao
(Title A) + B
```

To construct from a binary expression, require parentheses:

```tao
Title (A + B)
```

This mirrors function application in ML-family languages.

---

# 4. Grammar design

Do not make typed literals consume arbitrary full `Expression` without precedence control.

Preferred shape:

```langium
Expression:
  BinaryExpression;

BinaryExpression:
  ApplicationExpression ({BinaryExpression.left=current} op=('+'|'-'|...) right=ApplicationExpression)*;

ApplicationExpression:
  TypedLiteralExpression | PrimaryExpression;

TypedLiteralExpression:
  type=(NamedTypeRef | DotLocalTypeRef) value=ConstructorValue;

ConstructorValue:
    PrimaryExpression
  | ActionExpression
  | ObjectLiteral;
```

Where `PrimaryExpression` includes:

```tao
SomeVar
"string"
123
(...)
when ...
[...]
```

Adjust to match current grammar names.

Important:

```tao
Title SomeVar
Title (A + B)
Title action { ... }
Title { Name "Ro" }
```

must parse.

But:

```tao
Title A + B
```

should parse as:

```tao
(Title A) + B
```

---

# 5. Object literal support

If object literals are intentionally not freestanding expressions, keep special constructor support:

```langium
ConstructorValue:
    PrimaryExpression
  | ActionExpression
  | ObjectLiteral;
```

This preserves:

```tao
Person { Name "Ro" }
```

without making bare object literals legal everywhere.

---

# 6. Dot shorthand interaction

Dot shorthand keeps the same semantics:

```tao
Badge .Title SomeTitle
Badge .Title ("Hello " + Name)
```

The only difference is that the value side can now be broader.

Invalid outside argument context remains invalid:

```tao
alias X = .Title SomeTitle
```

Same error:

```text
'.Title' can only be used as shorthand for a callee-local type in an argument position.
```

---

# 7. Argument binding

No change to argument binding.

Once:

```tao
Badge .Title SomeTitle
```

infers type:

```text
Badge.Title
```

it binds to parameter:

```text
Title
```

The value expression `SomeTitle` is only checked against `Badge.Title`’s supertype.

---

# 8. Typir updates

Update typed-literal inference to:

1. Resolve constructor type with `typedLiteralType(node)`
2. Resolve constructor base/supertype
3. Infer value expression type
4. Check value type is assignable to constructor base type
5. Result type is constructor type

Use:

```ts
typeIdentityKey(typedLiteralType(node))
```

for the result identity.

Do not use raw `decl.name`.

---

# 9. Validator updates

Update typed-literal validation to use the broader value expression.

Diagnostics:

```tao
type Title is text
alias T = Title 123
```

Error:

```text
Cannot construct Title from number; expected text.
```

For local types:

```tao
view Badge Title is text { }

Badge .Title 123
```

Error:

```text
Cannot construct Badge.Title from number; expected text.
```

For expressions:

```tao
type Count is number
alias C = Count ("x" + "y")
```

Error:

```text
Cannot construct Count from text; expected number.
```

---

# 10. Formatter

Formatter must preserve spacing:

```tao
Title SomeVar
Title (A + B)
.Title SomeVar
.Title (A + B)
```

Do not remove required parentheses:

```tao
Title (A + B)
```

Do not rewrite as:

```tao
Title A + B
```

because that changes parse meaning.

---

# 11. Codegen

Typed literal codegen should continue to emit only the value expression.

Examples:

```tao
Title SomeVar
```

emits equivalent to:

```ts
SomeVar
```

```tao
Title (A + B)
```

emits equivalent to:

```ts
A + B
```

```tao
.Action action { ... }
```

emits the action value as before.

No runtime tag emission is required in this phase unless runtime nominal tags already exist.

---

# 12. Tests

## Parser tests

Should parse:

```tao
type Title is text
alias Raw = "Hello"
alias T = Title Raw
```

```tao
alias T = Title ("Hello " + Name)
```

```tao
view Badge Title is text {
}

view Root {
  Badge .Title Raw
  Badge .Title ("Hello " + Raw)
}
```

```tao
view Button Action is action {
}

view Root {
  Button .Action action { }
}
```

Object literal remains:

```tao
type Person is { Name text }
alias P = Person { Name "Ro" }
```

Precedence test:

```tao
alias X = Title A + B
```

must parse as:

```text
(Title A) + B
```

or, if parser tests do not expose tree shape, add a type-checking test proving that `B` participates in `+` after construction.

---

## Type-checking tests

Valid:

```tao
type Title is text
alias Raw = "Hello"
alias T = Title Raw
```

Valid:

```tao
type Count is number
alias N = 1
alias C = Count N
```

Invalid:

```tao
type Title is text
alias T = Title 123
```

Invalid:

```tao
type Count is number
alias C = Count "hello"
```

Local valid:

```tao
view Badge Title is text { }

view Root {
  alias Raw = "Hello"
  Badge .Title Raw
}
```

Local invalid:

```tao
view Badge Title is text { }

view Root {
  Badge .Title 123
}
```

Action local valid:

```tao
action Bump Step is number {
}

action Use {
  alias Amount = 3
  do Bump .Step Amount
}
```

---

## Formatter tests

```tao
alias T = Title Raw
alias T = Title (A + B)
Badge .Title Raw
Badge .Title (A + B)
```

Ensure `Title (A + B)` keeps parentheses.

---

## Codegen tests

All should emit only the value expression:

```tao
Title Raw
Title (A + B)
Badge .Title Raw
do Bump .Step Amount
```

---

# 13. Test app

Extend Local Param Types test app:

```tao
type Title is text

alias RawTitle = "Dynamic title"

view Badge Title is text {
  Text Title
}

view Root {
  Badge .Title RawTitle
  Badge .Title ("Hello " + RawTitle)
}

state Counter = 0
alias Amount = 3

action Bump Step is number {
  set Counter += Step
}

action UseBump {
  do Bump .Step Amount
  do Bump .Step (Amount + 1)
}
```

---

# 14. Implementation guardrails

Any implementation is incorrect if it:

- makes typed literals consume full binary expressions without precedence control
- changes `Title A + B` to mean `Title (A + B)` silently
- drops object literal typed constructors
- lets `.Title` work outside argument context
- lets `.Title` fall back to lexical/global types
- uses raw `decl.name` instead of `typeIdentityKey`
- changes codegen to emit the constructor type at runtime
- rewrites `Title (A + B)` to `Title A + B`
