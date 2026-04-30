````markdown
# Spec: View-local parameter types + callee-local shorthand

## Current baseline

The implementation already supports pure type-driven argument binding:

```tao
view FancyButton Title, Action action { }

view Root {
  FancyButton Title "test", action { }
}
```
````

Arguments are expressions. Binding is by inferred expression type, not by argument labels.

This spec adds inline parameter-local type declarations and shorthand resolution for those types.

---

# Goal

Allow a view parameter to declare a new nominal type directly in the parameter list:

```tao
view FancyButton Title is text, Action is action {
  ...
}
```

This creates nested nominal types:

```tao
FancyButton.Title
FancyButton.Action
```

and parameters of those types.

Then all of these are valid:

```tao
FancyButton Title "Save", Action action { }
FancyButton .Title "Save", .Action action { }
FancyButton FancyButton.Title "Save", FancyButton.Action action { }
```

---

# Semantics

## 1. Inline parameter type declaration

```tao
view FancyButton Title is text
```

desugars conceptually to:

```tao
type FancyButton.Title is text

view FancyButton FancyButton.Title {
  ...
}
```

Inside the view body, the parameter value is available as:

```tao
Title
```

So:

```tao
view FancyButton Title is text {
  Text Title
}
```

means:

```tao
view FancyButton FancyButton.Title {
  Text Title
}
```

where value-position `Title` inside the body refers to the parameter value.

---

## 2. Canonical type identity

The canonical type name is qualified:

```tao
FancyButton.Title
```

Not plain:

```tao
Title
```

Plain `Title` is only a shorthand in specific positions.

---

## 3. Call-site shorthand

In a render/call argument position, if the callee has a local parameter type named `Title`, then this:

```tao
FancyButton Title "Save"
```

may resolve as:

```tao
FancyButton FancyButton.Title "Save"
```

This is allowed only in argument position for that specific callee.

Outside a call to `FancyButton`, plain `Title` does not mean `FancyButton.Title`.

---

## 4. Dot shorthand

Add explicit callee-local shorthand:

```tao
FancyButton .Title "Save"
```

This always means:

```tao
FancyButton FancyButton.Title "Save"
```

Likewise:

```tao
FancyButton .Action action { }
```

means:

```tao
FancyButton FancyButton.Action action { }
```

This is the preferred spelling whenever there is a name clash.

---

## 5. Fully qualified form

This must always work:

```tao
FancyButton FancyButton.Title "Save"
```

This is the canonical explicit form.

---

# Name resolution rules

When resolving a type constructor head inside an argument to a callee:

```tao
FancyButton Title "Save"
```

resolution order is:

1. Callee-local parameter type: `FancyButton.Title`
2. Lexical/global type: `Title`

If both exist, resolve to the callee-local type but emit a production-blocking warning.

Example:

```tao
type Title is text

view FancyButton Title is text { }

view Root {
  FancyButton Title "Save"
}
```

Resolves as:

```tao
FancyButton FancyButton.Title "Save"
```

but emits:

```text
Ambiguous type constructor 'Title' in argument to FancyButton.
Resolved to 'FancyButton.Title'. Use '.Title' or 'FancyButton.Title' to make this explicit.
```

Production builds must fail on this warning.

These are warning-free:

```tao
FancyButton .Title "Save"
FancyButton FancyButton.Title "Save"
```

---

# Grammar

Extend parameter declarations to support inline local type declarations.

Current shape is approximately:

```langium
ParameterDeclaration:
  nameOrType=ID type=TypeReference?;
```

New shape should support three cases:

```tao
view A Title { }          // shorthand: param Title of existing type Title
view A Label text { }     // explicit param name + type
view A Title is text { }  // inline local type declaration
```

Suggested grammar:

```langium
ParameterDeclaration:
  nameOrType=ID ('is' localSuperType=TypeReference | type=TypeReference)?;
```

Interpretation:

| Syntax          | Meaning                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| `Title`         | parameter named `Title`, type `Title`                                           |
| `Label text`    | parameter named `Label`, type `text`                                            |
| `Title is text` | define `ViewName.Title is text`; parameter named `Title`, type `ViewName.Title` |

---

# AST / helper behavior

Update parameter helpers.

```ts
parameterName(p)
```

Returns:

```text
p.nameOrType
```

for all three forms.

```ts
parameterType(p)
```

Returns:

1. `p.type` for explicit form:

```tao
Label text
```

2. resolved existing type for shorthand form:

```tao
Title
```

3. synthetic nested type for inline local type form:

```tao
Title is text
```

---

# Synthetic nested type creation

For each view:

```tao
view FancyButton Title is text, Action is action {
  ...
}
```

create synthetic type declarations equivalent to:

```tao
type FancyButton.Title is text
type FancyButton.Action is action
```

These types must be available to:

1. Type checking
2. Argument binding
3. Formatter/type display
4. IDE hover/go-to-definition if possible
5. Fully qualified references:

```tao
FancyButton.Title "Save"
```

---

# Dot shorthand parsing

Add syntax for callee-local type shorthand in expression position:

```tao
.Title "Save"
```

This should only be valid in a call/render/action argument position where the callee is known.

It resolves to:

```tao
<Callee>.Title "Save"
```

Example:

```tao
FancyButton .Title "Save"
```

resolves to:

```tao
FancyButton FancyButton.Title "Save"
```

Outside callee argument position:

```tao
alias X = .Title "Save"
```

should be a validation error:

```text
'.Title' can only be used as shorthand for a callee-local type in an argument position.
```

---

# Argument binding

The existing type-driven argument binding algorithm remains the same.

The only change is that argument expression inference must be able to infer:

```tao
Title "Save"
```

as:

```tao
FancyButton.Title
```

when it appears as an argument to `FancyButton`.

And:

```tao
.Title "Save"
```

as:

```tao
FancyButton.Title
```

always.

Once the argument has type `FancyButton.Title`, existing type-driven binding should bind it to the `Title` parameter.

---

# Diagnostics

## Missing local type

```tao
FancyButton .Subtitle "x"
```

when `FancyButton` has no local type `Subtitle`:

```text
FancyButton has no parameter-local type '.Subtitle'.
```

## Dot shorthand outside argument position

```tao
alias X = .Title "x"
```

Error:

```text
'.Title' can only be used in an argument position where the callee defines a matching local type.
```

## Bare local type with global clash

```tao
type Title is text
view FancyButton Title is text { }

FancyButton Title "x"
```

Warning:

```text
Ambiguous type constructor 'Title' in argument to FancyButton.
Resolved to 'FancyButton.Title'. Use '.Title' or 'FancyButton.Title' to make this explicit.
```

Production builds fail on this warning.

## Explicit dot shorthand suppresses warning

```tao
FancyButton .Title "x"
```

No warning.

## Fully qualified form suppresses warning

```tao
FancyButton FancyButton.Title "x"
```

No warning.

---

# Examples

## Basic

```tao
view Badge Title is text {
  Text Title
}

view Root {
  Badge Title "Hello"
}
```

Equivalent to:

```tao
view Root {
  Badge Badge.Title "Hello"
}
```

---

## Dot shorthand

```tao
view Badge Title is text {
  Text Title
}

view Root {
  Badge .Title "Hello"
}
```

Equivalent to:

```tao
view Root {
  Badge Badge.Title "Hello"
}
```

---

## With clash

```tao
type Title is text

view Badge Title is text {
  Text Title
}

view Root {
  Badge Title "Hello" // warning, resolves to Badge.Title
}
```

Fix:

```tao
view Root {
  Badge .Title "Hello"
}
```

or:

```tao
view Root {
  Badge Badge.Title "Hello"
}
```

---

## Multiple local types

```tao
view Button Title is text, Action is action {
  ...
}

view Root {
  Button .Title "Save", .Action action {
    do Save
  }
}
```

---

## Existing reusable global types still work

```tao
type Title is text
type Action is action

view Button Title, Action {
  ...
}

view Root {
  Button Title "Save", Action action {
    do Save
  }
}
```

No view-local types are created here.

---

# Stdlib implication

The stdlib may choose between reusable global types:

```tao
share type Title is text
share type Action is action

share view Button Title, Action { ... }
```

or view-local types:

```tao
share view Button Title is text, Action is action { ... }
```

If using view-local types, app code should prefer:

```tao
Button .Title "Save", .Action action { }
```

or:

```tao
Button Button.Title "Save", Button.Action action { }
```

If using reusable global types, app code remains:

```tao
Button Title "Save", Action action { }
```

---

# Implementation steps

## 1. Grammar

Update `ParameterDeclaration`:

```langium
ParameterDeclaration:
  nameOrType=ID ('is' localSuperType=TypeReference | type=TypeReference)?;
```

Add expression support for dot shorthand:

```tao
.Title "x"
```

This may be a new AST node such as:

```ts
LocalTypeConstructorExpression {
  localTypeName: string
  value: Expression
}
```

or a special case of typed-literal/type-constructor expression.

---

## 2. Synthetic nested types

During type collection / indexing:

For each view parameter with `localSuperType`:

```tao
view V T is S
```

register:

```tao
V.T is S
```

The synthetic type should have a stable qualified name:

```text
V.T
```

---

## 3. Scope provider

Add support for resolving:

```tao
V.T
```

as a type reference.

Also support call-context resolution:

```tao
V T "x"
```

where `T` resolves to `V.T` in argument position.

---

## 4. Type inference

Update typed-literal/type-constructor inference so:

```tao
T "x"
```

inside argument position can resolve to callee-local type `V.T`.

Update dot shorthand so:

```tao
.T "x"
```

directly resolves to `V.T`.

---

## 5. Validator

Add diagnostics for:

1. Missing local type for `.T`
2. `.T` outside argument position
3. Bare `T` shadowed by both local `V.T` and lexical/global `T`

Mark the shadow warning as production-blocking.

---

## 6. Argument binding

No conceptual change.

Verify that after inference:

```tao
V .T "x"
```

has type:

```tao
V.T
```

and binds to the parameter whose declared type is `V.T`.

---

## 7. Formatter

Format inline parameter local types as:

```tao
view V Title is text, Action is action {
  ...
}
```

Format dot shorthand as:

```tao
V .Title "x"
```

Do not rewrite `.Title` to `V.Title`.

---

# Tests

## Parser

```tao
view Badge Title is text { }
```

parses with:

```text
parameterName = Title
localSuperType = text
```

```tao
Badge .Title "x"
```

parses as local type shorthand.

---

## Type checking

```tao
view Badge Title is text { Text Title }

view Root {
  Badge Title "x"
}
```

passes.

```tao
view Badge Title is text { }

view Root {
  Badge .Title "x"
}
```

passes.

```tao
view Badge Title is text { }

view Root {
  Badge Badge.Title "x"
}
```

passes.

---

## Shadow warning

```tao
type Title is text
view Badge Title is text { }

view Root {
  Badge Title "x"
}
```

emits production-blocking warning.

---

## No shadow warning

```tao
type Title is text
view Badge Title is text { }

view Root {
  Badge .Title "x"
  Badge Badge.Title "x"
}
```

emits no warning.

---

## Wrong local shorthand

```tao
view Badge Title is text { }

view Root {
  Badge .Subtitle "x"
}
```

errors.

---

## Outside argument position

```tao
alias X = .Title "x"
```

errors.

---

# Out of scope

Do not implement yet:

1. Inline local parameter types for `action` or `func`
2. Structural local parameter types:

```tao
view V Person is { Name text } { }
```

3. Generic local parameter types
4. Most-specific-wins argument binding
5. Splitting type/value namespaces
6. Auto-promotion changes

```
```
