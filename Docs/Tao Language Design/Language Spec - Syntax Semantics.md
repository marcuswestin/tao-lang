### Table of Parts

1. Lexical Conventions
2. Naming & Casing Semantics
3. Core Value Model
4. Declarations
5. Types
6. Expressions
7. String Adjacency
8. Statements
9. View System
10. Function System
11. Action System
12. Property Access & Data Interop
13. Formatting Rules
14. Error Semantics
15. Misc Notes

### Relevant Remaining Questions:

1. What is the final syntax for passing arguments to views and functions?
2. Will view and function invocation share one syntax or use distinct forms?
3. What is the final property access syntax: `.` or `->` or another form?
4. What is the final syntax for external-data / JSON field mapping?
5. Are property names allowed in any case, or should Tao normalize or constrain them?
6. Should adjacency allow comma-separated mixed argument forms, or only a single text expression argument?
7. Should acronym-style names be merely formatter-normalized or also lint-restricted?
8. Should the language forbid especially confusing near-collisions such as `Color` in a scope containing type `color`?
9. How should imports/modules fit into the casing model?
10. How should future genericity / polymorphism fit the naming and type-position rules?

---

# 1. Lexical Conventions

Defines the basic token categories and surface syntax assumptions that the rest of the language relies on.

## Summary

Tao uses casing as a semantic signal and assumes strict formatting. Keywords and primitive/data types are lowercase. Referenceable identifiers are uppercase. String literals are first-class lexical anchors in adjacency expressions. Blocks are significant, especially for view rendering.

### Examples

#### Keywords, names, and types

```tao
alias Name text = "Joe"
view Header Title string {}
func Add A number, B number { A + B }
```

#### Mixed lexical categories

```tao
Text "Hello " Name {}
User->textColor
```

## Design Notes

- Lowercase is not one semantic category; it is a lexical space used for several categories:

  - keywords
  - primitive/data types
  - property names
  - external/raw data keys
- Uppercase is the strong signal:

  - a reference to a value
- This asymmetry is intentional.

## Gotchas and Insights

- Because lowercase covers multiple categories, the language relies on grammar position and IDE support to distinguish them cleanly.
- Because uppercase is semantically loaded, case-only mistakes become meaningful and require excellent diagnostics.

---

# 2. Naming & Casing Semantics

Casing is one of the core semantic tools in Tao.

## Summary

Uppercase means “name/reference to a value.” Lowercase is used for keywords, data types, and property/data-member space. This is intended as a human-facing semantic rule, not just a style convention.

### Examples

#### References vs types

```tao
alias Name text = "Joe"
alias Url url = ...
alias URL = ...
```

#### Valid and invalid names

```tao
alias UserId text = "..."
alias UserID text = "..."
alias URL text = "..."
alias url text = "..."   // invalid: lowercase may not name a reference
alias userID text = "..." // invalid: lowercase initial
```

## Settled Rules

- Uppercase identifiers:

  - always refer to values
  - include aliases, views, functions, parameters, and other bound names
- Lowercase identifiers:

  - are never bound references
  - are used for keywords, primitive/data types, properties, and raw/external data field names

## Design Rationale

The intended mental model is:

- **Uppercase = Name / Reference**
- **lowercase = keyword, data type, property, raw data field**

This simplifies the question “what can this token refer to?” even if it does not distinguish all value roles.

## Tradeoffs

### What this gains

- A strong, always-valid top-level semantic cue
- Cleaner visual separation than if both lowercase and uppercase were allowed for bound names
- Simpler autocomplete filtering in an IDE-aware language

### What this does not solve

- It does not visually distinguish:

  - a view reference
  - a function reference
  - a data alias
  - a parameter reference
- Readers still need grammar position and tooling to know the role of a capitalized name.

## Gotchas and Insights

- `Text`, `User`, `RenderUser`, and `Title` may all be references, but to different kinds of values.
- This is not a parser problem; it is a readability and tooling tradeoff.
- This is acceptable partly because Tao is explicitly UI-only and assumes first-rate editor support.

## Acronym Policy

Current direction:

- types remain lowercase: `url`, `rgba`
- names are uppercase-initial references: `Url`, `Rgba`, `URL`, `RGBA`, `UserId`, `UserID`

Potential formatter rule under consideration:

- never allow two consecutive capital letters if normalization is desired
- example normalization:

  - `RGBA` -> `Rgba`
  - `Rgba` -> `Rgba`
  - `RGbA` -> `RgbA`

This is not yet finalized.

## Remaining Risk

Case-only confusion remains real:

```tao
Color   // reference
color   // type
```

Even with good errors and syntax highlighting, these will remain easy to mistype and sometimes easy to miss in review.

---

# 3. Core Value Model

Everything referenceable is a value.

## Summary

Views, functions, aliases, and parameters are all values. A view is not a separate syntactic ontology; it is a value of type `view`. A function is a value of a function type. This unifies the meaning of capitalized references.

### Examples

#### Values of different roles

```tao
alias Name text = "Joe"
view Header Title string {}
func Add A number, B number { A + B }
```

## Design Rationale

This supports the rule:

- uppercase means reference to a value

without needing separate naming systems for components, functions, and aliases.

## Tradeoffs

This loses the visual distinction some UI DSLs get from reserving uppercase for just views/components. Tao instead prefers conceptual uniformity.

## Gotchas and Insights

- `Text` may be a view.
- `Add` may be a function.
- `User` may be a data alias.
- Casing alone does not tell you which role a value plays.

---

# 4. Declarations

Declarations introduce values and types into scope.

## Summary

The language currently revolves around declarations such as `alias`, `view`, `func`, and possibly `action` and `type`. Declaration forms are grammar-specific, and types appear only in declaration positions.

### Examples

#### Alias

```tao
alias Name text = "Joe"
alias SomeTitle = "A Title"
```

#### View

```tao
view Header Title string, Subtitle string {}
```

#### Function

```tao
func Add A number, B number {
  A + B
}
```

#### Type

```tao
type User = { Name string, textColor string }
```

## Design Notes

- A declaration keyword is lowercase.
- The name being introduced is uppercase.
- Types, where spelled, are lowercase.

## Gotchas and Insights

- Parameters are references too, so they also begin uppercase:

  ```tao
  func Add A number, B number { A + B }
  ```
- This is coherent in Tao, but may feel unusual to users coming from languages where uppercase single-letter names imply generic type parameters.

---

# 5. Types

Types are intentionally syntactically constrained.

## Summary

Types only appear in specific grammatical locations, especially declarations. Because of that, Tao does not need casing to distinguish type positions from value positions.

### Examples

#### Alias with type

```tao
alias Name text = "Joe"
```

#### View parameters

```tao
view Header Title string, Color color {}
```

#### Function parameters

```tao
func Add A number, B number { A + B }
```

## Settled Direction

- primitive/data types are lowercase
- types are not expected to appear freely in expressions
- grammar position, not casing, distinguishes type usage

## Design Rationale

This frees the uppercase/lowercase distinction to serve value-reference readability rather than parsing disambiguation.

## Tradeoffs

Lowercase types can feel more keyword-like than type-like. Tao appears comfortable with that.

## Remaining Pressure

Future genericity or richer polymorphism may need more type syntax than the current model assumes.

---

# 6. Expressions

Expressions compute values.

## Summary

Expressions include references, literals, arithmetic, property access, calls/invocations, and adjacency-based string construction. Their exact final shape depends partly on unresolved invocation syntax.

### Examples

#### Basic expressions

```tao
Name
"Hello"
A + B
User->Name
```

#### Mixed string + computed value

```tao
"The year is " (BirthYear + Age) "."
```

## Design Notes

- `+` currently binds more tightly than string adjacency.
- Associativity is left-to-right.
- At least one side of an adjacency step must be a string literal.
- `value + "!"` is excluded for now.

## Gotchas and Insights

The language is trying to avoid overloading `+` into string concatenation semantics. That reduces confusion but increases the importance of adjacency and invocation design.

---

# 7. String Adjacency

One of the key Tao-specific features.

## Summary

Tao supports string concatenation by adjacency when a string literal is adjacent to another expression. This is designed to make UI text composition light and natural.

### Examples

#### Simple interpolation-like composition

```tao
"Hello " Name "!"
```

#### Computed subexpression

```tao
"Year is " BirthYear + Age "."
```

Given current precedence rules, this means:

```tao
"Year is " (BirthYear + Age) "."
```

#### Explicit grouping

```tao
"The year is " (BirthYear + Age) ". Weird ..."
```

## Settled Rules

- adjacency is valid only when at least one adjacent operand is a string literal
- adjacency always stringifies the non-literal adjacent operand
- `+` binds tighter than adjacency
- associativity is left-to-right
- `value + "!"` is excluded for now

## Why It Exists

- reduces visual noise for UI text
- keeps common cases such as `"Hello " Name "!"` concise
- avoids mandatory interpolation syntax

## Gotchas and Insights

### Important restriction

This is valid:

```tao
"Hello " Name "!"
```

This is not:

```tao
FirstName LastName
```

This means adjacency is not a general binary operator. It is a literal-anchored concatenation form.

### Refactor sensitivity

Replacing a literal with an alias can change whether adjacency remains valid, depending on surrounding shape. That is a real cost of this design.

### Statement-boundary interaction

Adjacency must not accidentally consume across statement boundaries. This matters especially in view bodies.

### Why `+`-for-strings was rejected

Allowing `+` to concatenate strings or stringify values would recreate known confusion from languages like JavaScript, and would undermine the clarity gained by literal-anchored adjacency.

---

# 8. Statements

Statements are grammar-category-specific and differ by block kind.

## Summary

Tao is not aiming for one universal “statement soup.” Different block kinds allow different categories of statements. This is important for parsing clarity and UI correctness.

### Examples

#### Alias then render

```tao
alias Text = "foo"
Text "hi " Name {} // type error if Text is not a view
```

This parses as:

- alias statement
- render statement

not as one merged expression.

## Design Rationale

Tao uses grammar shape, not just token classification, to determine what can appear where. For example:

- view blocks allow render statements and state declarations
- function blocks do not allow render statements
- actions may allow mutation statements
- functions may allow returns

## Gotchas and Insights

- A capitalized token at the start of a line is not automatically a valid render.
- It must refer to a value of type `view` in a context that allows render statements.
- This is why:

  ```tao
  alias Text = "foo"
  Text "hi" {}
  ```

  should be a type error, not a parse ambiguity.

---

# 9. View System

Views define UI structure and render other views.

## Summary

View bodies are special blocks. They allow render statements, and render statements are terminated structurally by `{}` rather than necessarily by newline.

### Examples

#### Empty-body render

```tao
Text "hi " Name {}
Button Title "click me" {}
```

#### Multi-line render expression

```tao
Text "hi "
Name
{}
Button Title "click me" {}
```

## Settled Direction

A render statement is structurally incomplete until its block `{}` is encountered.

This means a sequence like:

```tao
Text "hi "
Name
{}
Button Title "click me" {}
```

can be unambiguous if render syntax requires `{}` as the terminator.

## Design Rationale

This avoids needing newline termination alone to keep adjacency from spilling across statements.

## Gotchas and Insights

- If render statements could omit `{}`, ambiguity would return.
- Structural termination via `{}` is a strong parsing simplifier.
- This makes view syntax closer in spirit to trailing-block UI DSLs.

## Block-Specific Semantics

Current direction:

- `view` blocks:

  - render statements
  - state declarations
- `func` blocks:

  - expressions / returns
  - no render statements
- `action` blocks:

  - state mutation statements
  - likely no returns
  - likely no render statements

---

# 10. Function System

Functions compute values and are not render-capable blocks.

## Summary

A `func` is a value, but its body is a function body, not a view body. This affects what statements it may contain and how references are interpreted.

### Examples

#### Function declaration

```tao
func Add A number, B number {
  A + B
}
```

#### Invalid render in function body

```tao
func RenderUser User user {
  Text "Hi " User {}
}
```

This should be invalid because render statements belong in a `view`, not a `func`.

## Settled Direction

- `func` bodies do not allow render statements
- a render-capable construct would need to be declared as `view`

## Gotchas and Insights

This is one reason `RenderUser` and `Text` being both uppercase references is still acceptable: block kind and type determine behavior.

---

# 11. Action System

Still less defined than views and functions, but already constrained conceptually.

## Summary

Actions appear intended as another block category with its own permissible statements, likely focused on mutation or transitions.

### Examples

No canonical examples yet.

## Current Direction

- actions likely allow state mutation statements
- actions likely do not allow render statements
- actions probably do not allow return statements, though this remains tentative

## Why It Matters

Tao is shaping itself around block-kind-specific grammars rather than a single universal expression language. Actions are part of that design.

## Remaining Question

The exact syntax and allowed statement set for `action` remain to be specified.

---

# 12. Property Access & Data Interop

One of the most important unresolved areas.

## Summary

Properties are not names/references in the same sense as capitalized identifiers. They belong to data shape. Tao likely wants property access to be more explicit than ordinary reference usage.

### Examples

#### Property access candidates

```tao
User.Name
User.name
```

#### More explicit candidate

```tao
User->Name
User->name
```

#### Type declaration with mixed-case fields

```tao
type User = { Title string, textColor string }
```

#### Tagged mapping candidate

```tao
type User = {
  Name string `json: name`,
  Age string
}
```

## Settled Direction So Far

- properties are not references
- properties may be lowercase
- properties may potentially be uppercase too, depending on declared shape
- `User.Name` and `User.name` could both be valid if the type says so

## Why This Is Still Open

If ordinary dot syntax is used, casing no longer helps distinguish:

- property/member access
- capitalized reference names

An explicit property access operator such as `->` may improve clarity.

## Design Tensions

The language wants all of these:

- natural external-data / JSON interop
- clean Tao syntax
- strong name/reference semantics
- no unnecessary shorthand such as destructuring

These goals pull in different directions.

## Gotchas and Insights

### Properties are not names

A property named `Title` is not the same kind of thing as a reference `Title`. This distinction should be syntactic or semantic, not just conceptual.

### Destructuring is probably not desired

This simplifies the language, but it means mapping/extraction should remain explicit.

### JSON mapping is unresolved

Options considered:

- quoted raw field names
- lowercase property names directly
- explicit serialization tags

None is settled yet.

---

# 13. Formatting Rules

Formatting is part of the language design, not just tooling.

## Summary

Tao is intended to have exactly one canonical formatting form. This includes layout, punctuation, and possibly identifier normalization.

### Examples

#### Parameter commas

```tao
func Add A number, B number { ... }
```

not:

```tao
func Add A number B number { ... }
```

## Settled Direction

- exactly one formatting output for any Tao program
- no exceptions
- formatter is authoritative
- IDE support is assumed
- syntax visibility may use color, font weight, and style

## Design Notes

The editor may visually distinguish:

- keywords
- types
- names

potentially via bold / italic / regular or other visual layers.

## Gotchas and Insights

- Because the language relies heavily on semantic visibility, non-IDE contexts such as diffs and plain text reviews lose helpful information.
- Formatter-enforced casing conventions at the language level are unusual, but Tao may intentionally embrace that.

## Possible Future Formatter Role

The formatter could normalize acronym-style names deterministically. This remains open.

---

# 14. Error Semantics

Errors should be precise and prioritized.

## Summary

Since casing is semantically meaningful, diagnostics must not stop at “unknown identifier.” They should explain category mismatches and expected forms.

### Examples

#### Invalid lowercase reference use

```tao
Text name {}
```

Potential error progression:

1. `name` is not a reference to anything
2. `'name' is lowercase and therefore cannot be a reference to a value`
3. expected a value reference / uppercase name in this position

#### Invalid statement form

```tao
Text name "hi" {}
```

Likely error:

- not a valid render statement shape
- perhaps suggest:

  - `Text name "hi" {}`
  - or `Text "hi", name {}`
    depending on final invocation syntax

## Design Rationale

Good diagnostics are especially important because:

- case-only mistakes are meaningful
- Tao relies on syntax category and block kind
- tooling is assumed to be first-rate

## Gotchas and Insights

- Some errors should be phrased in semantic terms, not just syntax terms.
- Example distinction:

  - unknown name
  - lowercase token in reference position
  - known name of wrong type
  - invalid statement form

---

# 15. Misc Notes

This section collects cross-cutting points that do not belong to just one subsystem.

## A. On the “all uppercase references look the same” concern

A concern was raised that if uppercase is used for all references, Tao loses visual distinction between things like views, functions, and values.

Current response:

- yes, but only if you compare it to a design that reserves uppercase for one special category such as views
- compared to a design allowing both lowercase and uppercase for bound names, Tao gains specificity, not loses it
- grammar position and IDE support are expected to carry much of the remaining distinction

This is a deliberate tradeoff.

## B. On shadowing

Shadowing was discussed as a potential issue:

```tao
alias Title = "Hello"

view Card Title string {
  Text Title {}
}
```

The observation is that shadowing exists regardless of case policy. Still, with Tao’s convention, visual detection of shadowing depends more on tooling because both outer and inner references are capitalized.

## C. On lowercase overloading

A criticism was that lowercase covers many categories:

- keyword
- type
- property
- external key

Current Tao position:

- this is acceptable
- adding casing specificity does not make the system less typed or less semantically precise
- uppercase has the stronger semantic meaning, while lowercase is the non-reference space

## D. On view/function arguments

This remains one of the biggest unresolved areas.

Questions surfaced:

- named-only arguments were attractive, but now feel less straightforward
- if parameter names and passed references share the same capitalized form, syntax such as:

  ```tao
  Header Title, Subtitle {}
  ```

  can become ambiguous as to whether `Title` and `Subtitle` are keys, values, or both

Alternative ideas considered:

- always named parameters
- type-matched arguments when parameter types are unique
- requiring explicit parameter names only for repeated types
- using type aliases to distinguish same-base-type parameters

Example considered:

```tao
type alias left = number
type alias right = number

func Add Left left, Right right { ... }

Text "Added: " Add(1 right, 2 left)
```

This area needs a dedicated design pass.

## E. On type aliases for semantic parameters

Using distinct type aliases for same-base-type parameters can encode semantic roles. This may become relevant if Tao wants non-positional or type-directed invocation.

## F. On destructuring

Current inclination is to avoid destructuring entirely. Tao does not appear to need this shorthand, and avoiding it helps keep property/data extraction explicit.

## G. On statement termination and ambiguity

A significant parsing insight from the discussion:

- newline-delimited statements help, but are not the only answer
- if render statements are structurally terminated by `{}`, ambiguity can remain low even across newlines
- the key is statement-boundary clarity, not newline sensitivity alone

## H. On exclusion of string-right `+`

For now, expressions like:

```tao
Value + "!"
```

are excluded. This helps keep `+` from drifting into string-coercion semantics.

## I. On “type safety / autocomplete will solve it”

Tao explicitly assumes:

- deep IDE knowledge
- type-aware completion
- context-filtered suggestions

For example, inside a view body on a blank render line, typing `B` may only validly autocomplete to views. This is considered a legitimate part of the language’s usability strategy, not merely an editor enhancement.

---

# Specification: Lexical Conventions

## Token Categories

- **Name**: uppercase-initial alphanumeric identifier
- **Keyword**: reserved lowercase word
- **Type Identifier**: lowercase identifier in type position
- **Property Identifier**: identifier used in member/data-field position
- **String Literal**: quoted text literal
- **Operators / Punctuation**:

  - `=`
  - `+`
  - `,`
  - `{`
  - `}`
  - potentially `->`
  - potentially `.`
- **Newline**: layout boundary, but not necessarily the sole statement terminator

## Initial Grammar Intent

```ebnf
Name              := /[A-Z][A-Za-z0-9]*/
LowerIdentifier   := /[a-z][A-Za-z0-9]*/
StringLiteral     := /"([^"\\]|\\.)*"/
```

---

# Specification: Naming & Casing Semantics

## Rules

1. Every bound referenceable identifier must begin with an uppercase letter.
2. Lowercase identifiers may not bind references.
3. Lowercase identifiers are used for:

   - keywords
   - primitive/data types
   - property names
   - external/raw data field names
4. Property identifiers are not references and are exempt from the uppercase-reference rule.
5. Type identifiers are lowercase and valid only in type positions.

## Non-Goals

- Casing does not by itself distinguish view/function/alias/parameter roles.
- Casing is not intended to encode type-vs-value in general expression space, because types do not generally appear there.

---

# Specification: Core Value Model

## Rules

1. All referenceable entities denote values.
2. Views are values of type `view`.
3. Functions are callable values.
4. Aliases bind values to names.
5. Parameters bind values to names.

---

# Specification: Declarations

## Alias

```ebnf
AliasDeclaration :=
  "alias" Name TypeAnnotation? "=" Expression
```

## View

```ebnf
ViewDeclaration :=
  "view" Name ParameterList Block
```

## Function

```ebnf
FunctionDeclaration :=
  "func" Name ParameterList Block
```

## Type

```ebnf
TypeDeclaration :=
  "type" Name? "=" TypeExpression
```

Note: exact `type` syntax is not finalized.

---

# Specification: Types

## Rules

1. Types occur only in type positions.
2. Primitive/data types are lowercase.
3. Type spelling does not determine referenceability.
4. A lowercase token in a type position is interpreted as a type, not a value.

---

# Specification: Expressions

## Preliminary Categories

```ebnf
Expression :=
    Literal
  | NameReference
  | ArithmeticExpression
  | AdjacencyExpression
  | PropertyAccessExpression
  | InvocationExpression
  | GroupedExpression
```

## Grouping

```ebnf
GroupedExpression :=
  "(" Expression ")"
```

## Arithmetic Precedence

- `+` binds tighter than string adjacency.
- associativity is left-to-right.

---

# Specification: String Adjacency

## Rules

1. String adjacency is a concatenation form.
2. An adjacency step is valid only when at least one side is a string literal.
3. The non-literal adjacent operand is stringified.
4. Adjacency is left-associative.
5. `+` has higher precedence than adjacency.
6. String concatenation via `+` is excluded for now.

## Examples

```tao
"Hello " Name "!"
"Year is " BirthYear + Age "."
```

## Invalid Examples

```tao
FirstName LastName
Value + "!"
```

---

# Specification: Statements

## Statement Families

```ebnf
Statement :=
    AliasDeclaration
  | TypeDeclaration
  | RenderStatement
  | FunctionLocalStatement
  | ActionLocalStatement
  | ViewLocalStatement
```

## Block-Dependent Validity

- valid statement kinds depend on enclosing declaration/block kind

---

# Specification: View System

## Render Statement

Preliminary intent:

```ebnf
RenderStatement :=
  RenderHead RenderArguments? Block
```

where `RenderHead` must resolve to a value of type `view`.

## Rules

1. A render statement is incomplete until its block is parsed.
2. Render statements are valid only in view-capable contexts.
3. Adjacency may continue across lines while a render statement remains incomplete.
4. A render statement whose head is not of type `view` is a type error.

## Example

```tao
Text "hi "
Name
{}
Button Title "click me" {}
```

---

# Specification: Function System

## Rules

1. A function body is not a view body.
2. Render statements are invalid inside function bodies.
3. Functions may contain expression and return-oriented statements, subject to later finalization.

---

# Specification: Action System

## Current Direction

1. Actions are a distinct block kind.
2. Actions are expected to permit state mutation.
3. Actions are expected not to permit render statements.
4. Return behavior is not yet finalized.

---

# Specification: Property Access & Data Interop

## Property Access

Not yet finalized. Candidate forms include:

```tao
User.Name
User.name
User->Name
User->name
```

## Current Rules

1. Property names are not references.
2. Property names may be lowercase.
3. Property names may potentially be uppercase if declared that way.
4. Validity depends on the declared type of the receiver.

## External Data Mapping

Not finalized. Candidate directions include:

- direct property declaration with natural-case field names
- quoted raw field names
- explicit mapping / serialization tags

---

# Specification: Formatting Rules

## Rules

1. Tao has exactly one canonical formatting form.
2. Formatting is not style-only; it is part of the language experience.
3. Parameter separators are explicit and formatter-enforced.
4. Casing conventions may be formatter-enforced.
5. IDE presentation may visually distinguish:

   - keywords
   - types
   - names

---

# Specification: Error Semantics

## Error Priority

Candidate priority order:

1. unknown reference
2. invalid lowercase token in reference position
3. known identifier of wrong category/type
4. invalid statement form
5. other type errors

## Example Diagnostic Intent

Given:

```tao
Text name {}
```

Possible messaging progression:

- `name` is not a reference to anything
- `name` is lowercase and cannot denote a value reference
- expected a value reference in this position

---

# Specification: Misc Notes

## Scope of the Language

Tao is not intended to become general-purpose. It is UI-only. This justifies decisions that would be riskier in a general-purpose language.

## Tooling Assumption

Tao assumes first-rate IDE support and is designed with that assumption in mind.

## Non-Destructuring Bias

Tao currently leans against destructuring as unnecessary shorthand.

## Uniform Formatting Bias

The language prefers determinism over stylistic freedom.

---

# Remaining Questions

1. What is the final syntax for passing arguments to views and functions?
2. Will view and function invocation share one syntax or use distinct forms?
3. What is the final property access syntax: `.` or `->` or another form?
4. What is the final syntax for external-data / JSON field mapping?
5. Are property names allowed in any case, or should Tao normalize or constrain them?
6. Should adjacency allow comma-separated mixed argument forms, or only a single text expression argument?
7. Should acronym-style names be merely formatter-normalized or also lint-restricted?
8. Should the language forbid especially confusing near-collisions such as `Color` in a scope containing type `color`?
9. How should imports/modules fit into the casing model?
10. How should future genericity / polymorphism fit the naming and type-position rules?

Reminder: we have not yet explored the genericity / polymorphism pressure question in depth.
