# Typir and Langium — Implementation guide

> **Tao context:** preferred type direction in [Type Design - Preferred](./Type%20Design%20-%20Preferred.md); staged execution plan in [Type Implementation - Execution plan](./Type%20Implementation%20-%20Execution%20plan.md).

## Prep Research (moved from Type System Research)

How type systems are implemented in Langium using [Typir](https://github.com/TypeFox/typir) and the [`typir-langium`](https://github.com/TypeFox/typir/tree/main/packages/typir-langium) binding. The sections below expand on the same themes; see also the official [Announcing Typir](https://www.typefox.io/blog/typir-introduction/) post.

### Langium + Typir principles

- **Responsibility split:** Langium owns the document, parsing, generated AST, cross-references, validation hooks, and the document build lifecycle. [Typir](https://github.com/TypeFox/typir) owns the _semantic_ type graph: assignability, equality, conversion, inference, subtyping, and type-related validation, with a separate graph from the AST. `typir-langium` is the integration layer. ([Document lifecycle](https://langium.org/docs/reference/document-lifecycle/))

- **Five layers in practice (for a Langium+Typir project):** (1) shape the AST in the grammar, (2) scoping and reference resolution, (3) the Typir type model and rules, (4) inference from AST nodes to Typir types, (5) diagnostics reported back through Langium. Scoping answers “which declaration does this name mean?”; typing answers “what type is this, and is it valid here?”. (Same model as the general-purpose write-up, grounded in [Langium lifecycle](https://langium.org/docs/reference/document-lifecycle/) and the [Typir repo](https://github.com/TypeFox/typir).)

- **Type checking is _not_ built into Langium.** Langium expects type analysis as an _additional_ step, typically _after_ scope is computed, using `DocumentBuilder.onBuildPhase(...)` in the [document lifecycle](https://langium.org/docs/reference/document-lifecycle/): **parse → index/scope (resolve refs) → run the type system → report validation**. If type checking runs before links resolve, you get spurious or duplicate type errors. ([Document lifecycle](https://langium.org/docs/reference/document-lifecycle/))

- **Centralized type system definition (Typir+Langium pattern).** The usual pattern is a class that implements `LangiumTypeSystemDefinition` from `typir-langium`: `onInitialize(typir)` registers built-in primitives, operators, inference/validation that are stable; `onNewAstNode(node, typir)` updates things derived from the current document (e.g. user functions/classes) as the AST changes. Avoid scattering ad-hoc type rules across unrelated validator files. ([`lox-type-checking.ts` in typir’s LOX example](https://github.com/TypeFox/typir/blob/main/examples/lox/src/language/lox-type-checking.ts), [Typir introduction](https://www.typefox.io/blog/typir-introduction/))

- **Primitives (Typir).** `typir.factory.Primitives.create({ primitiveName: '...' })`, attach `.inferenceRule(...)` (e.g. “this AST node’s type is _number_”), then `.finish()`. ([Typir introduction](https://www.typefox.io/blog/typir-introduction/))

- **Operators (Typir).** `typir.factory.Operators.createBinary` / `createUnary` with one or more **signatures**; overloads are multiple signatures. Inference Rule objects (operand extractors, operator token match) are shared across many operators, as in LOX. ([`lox-type-checking.ts`](https://github.com/TypeFox/typir/blob/main/examples/lox/src/language/lox-type-checking.ts), [Typir introduction](https://www.typefox.io/blog/typir-introduction/))

- **More inference (Typir).** `typir.Inference.addInferenceRulesForAstNodes` maps each relevant AST type to a rule; when a rule does not apply (e.g. **unresolved reference**), return `InferenceRuleNotApplicable` so the editor does not flood the user with secondary type errors. ([`lox-type-checking.ts`](https://github.com/TypeFox/typir/blob/main/examples/lox/src/language/lox-type-checking.ts), [Document lifecycle](https://langium.org/docs/reference/document-lifecycle/))

- **Validation (Typir).** `typir.validation.Collector.addValidationRulesForAstNodes` and helpers such as `typir.validation.Constraints.ensureNodeIsAssignable`, `ensureNodeIsEquals`, `ensureNodeHasNotType` express common checks without re-implementing comparisons everywhere. ([`lox-type-checking.ts`](https://github.com/TypeFox/typir/blob/main/examples/lox/src/language/lox-type-checking.ts), [Typir introduction](https://www.typefox.io/blog/typir-introduction/))

- **Langium for mature languages:** for stable tooling, [declared semantic model types](https://langium.org/docs/reference/semantic-model/) in the AST are often preferable to inferring the Langium _AST TypeScript_ types from the grammar alone, so your typing code does not break on grammar refactors. Relevant as Tao grows. ([Semantic model](https://langium.org/docs/reference/semantic-model/))

- **Version / packaging note for Tao:** `@tao/parser` currently depends on Langium `^4.1.2` (see `packages/parser/package.json` in this repo). `typir-langium` **0.3.3** is published as a Langium 4.2.x–compatible line ([npm: typir-langium@0.3.3](https://www.npmjs.com/package/typir-langium/v/0.3.3); see [typir#102](https://github.com/TypeFox/typir/issues/102)). **Pin/verify** `typir` / `typir-langium` and Langium together when we add the dependency.

### Langium + Typir examples

- **Primary Langium+Typir reference implementation:** the LOX example’s [`examples/lox/src/language/lox-type-checking.ts`](https://github.com/TypeFox/typir/blob/main/examples/lox/src/language/lox-type-checking.ts) in the [Typir monorepo](https://github.com/TypeFox/typir) shows end-to-end wiring. README overview of packages and examples: [typir `README.md`](https://raw.githubusercontent.com/TypeFox/typir/main/README.md) (NPM: [`typir`](https://www.npmjs.com/package/typir), [`typir-langium`](https://www.npmjs.com/package/typir-langium)).

- **From that file, patterns to mirror (at a high level):** register primitives with inference from literals (and, in LOX, from `TypeReference`); share **binary** / **unary** `InferOperatorWithMultipleOperands` / `InferOperatorWithSingleOperand` config across operators; overload `+` for number and string; register validation on assignment-like operators with `ensureNodeIsAssignable`; add per-node validation for `if`/`while`/… conditions (`ensureNodeIsAssignable` to boolean); for references, if the ref is `undefined` **do not** infer—wait until linking is fixed. Register user-declared function types in `onNewAstNode` and wire call inference to `MemberCall` / declarations as LOX does for its grammar.

- **Smaller core-only example:** the “Tiny Typir” walkthrough in the [Typir `README.md`](https://raw.githubusercontent.com/TypeFox/typir/main/README.md) (also summarized in [Announcing Typir](https://www.typefox.io/blog/typir-introduction/)) uses `createTypirServices` without Langium, useful for learning primitives, `Operators`, `Conversion`, and `validation.Collector` in isolation.

---

Here is a practical architecture for implementing type checking in a Langium language using Typir.

At a high level, Langium and Typir fit together cleanly:

- **Langium** gives you parsing, AST types, cross-references, validation hooks, and the document build lifecycle.
- **Typir** gives you a configurable type system engine: predefined primitive/function/class/operator types, type inference, assignability, equality, subtyping, conversions, validation helpers, caching, and customizable error messages.
- **typir-langium** is the glue layer that makes Typir work naturally against Langium AST nodes and services. ([GitHub][1])

The key Langium design point is that **type computation is not built in**. Langium’s docs explicitly recommend implementing it as an additional preprocessing/build step, typically after scoping, via the document builder lifecycle. ([Langium][2])

## 1. Start with the right mental model

For a Langium language, type checking usually has five layers:

1. **AST design** in the grammar
2. **Name resolution / scoping** in Langium
3. **Type model** in Typir
4. **Type inference rules** from AST nodes to Typir types
5. **Diagnostics/validation** surfaced through Langium

That separation matters. Scoping answers **“what declaration does this reference point to?”**; type checking answers **“what type does this expression/declaration have, and is it valid here?”**

A good implementation treats Typir as the semantic type engine, while Langium remains the host for documents, ASTs, references, and editor feedback. ([Langium][2])

## 2. Design your Langium AST for type checking

Before writing Typir code, shape the grammar so typing is straightforward.

### Prefer explicit AST nodes for semantic concepts

Make sure expressions that differ semantically also differ structurally:

- `BinaryExpression`
- `UnaryExpression`
- `CallExpression`
- `MemberAccess`
- `VariableDeclaration`
- `FunctionDeclaration`
- `Parameter`
- `TypeReference`

That is exactly the kind of structure used in Typir’s Langium LOX example, where separate node kinds are given specific inference and validation behavior. ([GitHub][3])

### Prefer declared semantic model types in mature languages

Langium recommends **declared semantic model types** over inference for mature languages, because inferred types can change when the grammar changes. That is important for type checking code, which otherwise becomes brittle. ([Langium][4])

### Include explicit type-reference syntax if your language has user-visible types

If users can write types, give them an AST node like `TypeReference`. In the LOX Typir example, primitive types are inferred both from literal nodes and from `TypeReference` nodes. ([GitHub][3])

## 3. Register Typir as part of your Langium services

Langium services are configured through modules. Its docs point to the generated `...-module.ts` file as the entry point for registering or overriding language services. ([Langium][5])

In practice, your architecture should include a **type-checking service** or **type system definition service** that is available from your language services container. The Typir Langium example imports and implements a `LangiumTypeSystemDefinition` together with `TypirLangiumServices` / `TypirLangiumSpecifics`, which is the main pattern to copy. ([GitHub][3])

Conceptually:

```ts
export type MyLangAddedServices = {
  typing: {
    TypeSystem: MyTypeSystemDefinition
  }
}
```

and then bind that in your Langium module.

The important idea is: **do not scatter type rules across random validators**. Centralize them in one type-system definition class/service.

## 4. Define your Typir “specifics” for the language

Typir is generic over “language specifics”, meaning you tell it what the language node universe looks like. In the Langium binding, that means your AST node types become the language nodes on which inference and validation operate. The LOX example defines a language-specific type parameterization using `TypirLangiumSpecifics` and a generated Langium AST union type. ([GitHub][3])

That gives you strongly typed callbacks such as:

- “infer the type of this `BinaryExpression`”
- “validate this `VariableDeclaration`”
- “create a function type from this `FunctionDeclaration`”

## 5. Build the static part of the type universe first

A clean first milestone is to define the **fixed types** of your language before touching user declarations.

Typir already supports predefined kinds such as:

- primitives
- functions with overloading
- classes
- top / bottom types
- operators with overloading

It also provides assignability, equality, conversion, inference, subtyping, validation, caching, and customizable messages. ([GitHub][1])

### Typical static setup

Create once per type-system initialization:

- `boolean`
- `number`
- `string`
- `void`
- `nil` / `null` if your language has one
- top type / “any” if you need a permissive supertype

The LOX example does exactly this with primitive factories and a top type. ([GitHub][3])

### Attach inference rules to these static types

For example:

- `NumberLiteral` → `number`
- `StringLiteral` → `string`
- `BooleanLiteral` → `boolean`
- `TypeReference("number")` → `number`

The LOX example shows that pattern directly using `.inferenceRule(...)` on primitive type definitions. It also notes that using `languageKey: SomeAstType.$type` is the more performant style. ([GitHub][3])

## 6. Then add operator typing

For expression languages, operators are where Typir starts paying off quickly.

In the LOX example, Typir defines reusable inference-rule objects for unary and binary expressions:

- which AST node kind they apply to
- how to match the operator token
- how to extract operands
- whether argument validation should run

Then specific operators are registered with one or more signatures, for example:

- `-`, `*`, `/` : `number × number -> number`
- `+` : overloaded for number/number and string/string and mixed number/string cases
- `<`, `<=`, `>`, `>=` : `number × number -> boolean`
- `and`, `or` : `boolean × boolean -> boolean` ([GitHub][3])

That suggests a general recipe:

### For each operator family

Define:

- the AST matcher
- the operand extractor
- the signatures
- optional custom validation

For example, a DSL might use:

- arithmetic operators
- logical operators
- comparison operators
- path-composition operators
- query/filter operators

Typir’s overloaded operators are a strong fit for DSLs whose syntax is compact but semantics vary by operand type.

## 7. Model user-declared types separately from built-ins

This is the point many implementations get wrong.

There are really **two sources of types**:

1. **language built-ins** you create at startup
2. **user-declared types** you discover by walking the current workspace/document AST

In the LOX example, the type-system definition has an `onNewAstNode(...)` hook that reacts to encountered AST nodes and constructs:

- function types from `FunctionDeclaration`
- class types from `Class`
- fields/methods from class members
- superclass links from class references ([GitHub][3])

That is the right architecture for most Langium languages.

### Use this split

- **Initialization phase**: register built-ins and fixed typing rules.
- **AST-driven phase**: register the user-defined declarations currently present in documents.

This avoids hard-coding semantic declarations into validators.

## 8. Create function and method types from declarations

For any language with callable declarations, you want a deterministic mapping:

- AST declaration node → Typir function type

The LOX example uses Typir’s function machinery and also registers uniqueness validation for functions. ([GitHub][3])

### Recommended mapping

For each function-like declaration, derive:

- name
- parameter list
- parameter types
- return type
- maybe receiver / `this` type
- maybe overload identity
- maybe generic parameters if your DSL eventually supports them

Then store/register that with Typir.

### Practical rule

Do not infer function declarations from call sites first.
Instead:

- create callable types from declarations
- let calls resolve references to declarations
- let Typir infer the call expression type from the resolved callable type

That gives you better diagnostics and cleaner incremental updates.

## 9. Create class/entity types from declarations

If your DSL has entities, records, components, views, states, schemas, etc., they usually map best to Typir class-like or nominal types.

The LOX example constructs class types by reading the AST:

- class name
- superclass
- fields
- methods

and turns those into Typir class definitions. It also adds validations for uniqueness and superclass cycles. ([GitHub][3])

For a DSL, the same pattern works for things like:

- `component`
- `model`
- `screen`
- `resource`
- `service`
- `enum-like structured types`

Even if your language is not “OO”, the underlying idea still applies: some declarations define reusable nominal or structured types.

## 10. Define node-to-type inference centrally

A robust system has **one canonical inference route** from AST nodes to Typir types.

In the LOX example, this is done through Typir inference rules and AST-node validations collected in one place, instead of ad hoc type computations spread everywhere. ([GitHub][3])

Your inference map should cover at least:

- literals
- type references
- variable declarations
- variable references
- function declarations
- parameters
- call expressions
- member access
- binary/unary expressions
- return statements if needed
- language-specific constructs

### A good discipline

For every AST node kind that can appear in an expression position, answer:

> “If I hand this node to the type system, what Typir type should come back?”

If you cannot answer that cleanly, your AST or typing architecture still needs work.

## 11. Distinguish declaration typing from expression typing

This is a subtle but important design split.

### Declaration typing

“What type does this declaration denote?”
Examples:

- variable declaration type
- function declaration type
- class declaration type
- parameter type

### Expression typing

“What is the type of evaluating this expression?”
Examples:

- literal expression
- arithmetic expression
- call expression
- member access expression

Langium DSLs often blur these. Do not. Keep them separate in your type-system design even if some AST nodes participate in both.

The LOX example shows this distinction in practice: declarations such as variables and parameters point to types differently than expressions/operators do. ([GitHub][3])

## 12. Hook the type system into Langium’s document lifecycle

This is the Langium-specific operational piece.

Langium’s document lifecycle docs say type computation is typically an **additional preprocessing step after scope computation**, registered through `DocumentBuilder.onBuildPhase(...)`. ([Langium][2])

That means the normal order should be:

1. parse document
2. compute indexes/scopes/link references
3. build or refresh the Typir view of the AST
4. run type-related validations
5. surface diagnostics

This ordering matters because most type systems rely on resolved cross-references.

### Why this is important

If you type-check too early:

- references may still be unresolved
- symbol tables may be incomplete
- you get noisy or duplicated diagnostics

The LOX example explicitly treats unresolved references as a reason a typing inference rule is not applicable yet. ([GitHub][3])

## 13. Use Typir’s validation collector instead of ad hoc validators where possible

One of the nicest patterns in the LOX example is this:

- Typir inference defines types
- Typir validation rules define type constraints
- those rules are registered centrally using the validation collector

Examples in the LOX code include validation rules for:

- `if` / `while` / `for` conditions
- `return` statements
- variable declarations
- uniqueness of function declarations
- uniqueness of class declarations
- uniqueness of method declarations
- superclass cycle detection ([GitHub][3])

That gives a strong blueprint.

### Prefer these categories of validation

1. **Local type constraints**

   - condition must be boolean
   - assigned value must be assignable
   - return expression must match return type

2. **Declaration consistency**

   - duplicate names / overload clashes
   - illegal inheritance
   - invalid declared types

3. **Semantic warnings**

   - always-false comparison
   - pointless cast
   - unreachable type branch

The LOX example even shows an operator validation that emits a warning when equality is used between obviously incompatible types, and includes Langium diagnostic data for code actions. ([GitHub][3])

## 14. Use Typir constraint helpers for common checks

Typir’s validation helpers are worth leaning on heavily.

The example uses helpers like:

- `ensureNodeIsEquals(...)`
- `ensureNodeIsAssignable(...)`
- `ensureNodeHasNotType(...)` ([GitHub][3])

In a Langium language, these map naturally to the bulk of semantic typing checks.

### Typical uses

- assignment compatibility
- parameter argument compatibility
- return type compatibility
- condition type enforcement
- forbidden types in certain places (`void`, `never`, etc.)

This is usually preferable to manually computing two types and comparing them in every validator.

## 15. Keep syntax diagnostics and typing diagnostics separate

A good user experience depends on not mixing layers.

### Langium should own:

- parse errors
- unresolved references
- grammar/structure problems

### Typir should own:

- inferred types
- assignability
- operator applicability
- overload resolution
- semantic typing constraints

The LOX example explicitly treats unresolved references as a reason not to proceed with type inference for that node yet. ([GitHub][3])

That is the correct principle for editor UX: **don’t flood the user with secondary type errors caused by primary syntax/linking failures**.

## 16. Decide early whether your language is nominal, structural, or hybrid

Typir supports classes and subtyping machinery, but your DSL still needs a semantic stance.

Questions to settle early:

- Are two declarations compatible because their names match, or because their shapes match?
- Are components/views nominal, structural, or both?
- Are records open or closed?
- Do function parameters use exact match, assignability, variance, or coercion?
- Are implicit conversions allowed?

Typir supports assignability, equality, conversion, and subtyping as distinct services, which is exactly why this decision matters. ([GitHub][1])

A practical recommendation:

- use **nominal typing** for declarations that represent user-defined named concepts
- use **structural-ish rules** only where the language strongly benefits
- keep implicit conversions minimal at first

## 17. Plan for incremental rebuilds

Langium is editor-first, so type checking must tolerate frequent rebuilds.

Typir advertises caching, and the LOX example’s `onNewAstNode(...)` approach reflects a model where user-defined types are reconstructed/updated from the AST after each document change. ([GitHub][1])

### Good incremental strategy

- Recreate the **dynamic** type layer from current documents.
- Reuse the **static** built-in layer.
- Avoid storing stale AST node references longer than needed.
- Ensure document rebuild order preserves “scope first, types second”.

### Especially important in Langium workspaces

If cross-file references matter, type information may depend on declarations outside the current document. Your type pass therefore has to be workspace-aware, not purely single-file, when your language semantics require it.

## 18. A recommended implementation structure

A maintainable Langium + Typir codebase usually looks like this:

### `my-lang-module.ts`

Registers the custom type-system service in Langium’s DI module. ([Langium][5])

### `my-lang-type-system.ts`

The main Typir integration class. Responsibilities:

- initialize built-in types
- register inference rules
- register operator signatures
- register validators
- react to discovered AST declarations
- expose helper APIs like `getType(node)`

### `my-lang-type-rules.ts`

Optional split-out files for:

- literals
- operators
- function declarations
- class/entity declarations
- conversions/subtyping

### `my-lang-validator.ts`

Thin Langium-facing validator that delegates type-related checks to Typir rather than reimplementing logic.

### `my-lang-build-phase.ts`

Optional document-builder integration that ensures types are computed at the right phase. Langium recommends an additional preprocessing step after scope computation. ([Langium][2])

## 19. A good staged rollout plan

Trying to type-check everything at once usually fails. Better sequence:

### Stage 1: literals and basic primitives

Support:

- number
- string
- boolean
- simple declared types

### Stage 2: references and variable declarations

Support:

- declared variable types
- inferred variable types
- reference expressions

### Stage 3: unary/binary operators

Support:

- arithmetic
- logic
- comparisons
- string concatenation if present

### Stage 4: functions and calls

Support:

- parameter typing
- return typing
- call resolution
- overloads if needed

### Stage 5: structured declarations

Support:

- classes/entities/components
- member access
- inheritance/subtyping

### Stage 6: richer semantics

Support:

- conversions/coercions
- contextual typing
- generics or polymorphism if the language needs them

This sequence aligns well with the capabilities Typir already exposes. ([GitHub][1])

## 20. Common pitfalls

### Pitfall 1: typing before scoping

This causes phantom type errors. Langium says type computation should usually run after scope computation. ([Langium][2])

### Pitfall 2: duplicating type logic in validators

If validators manually inspect AST shapes instead of asking Typir, the system drifts.

### Pitfall 3: mixing reference resolution with type inference

References should resolve through Langium scoping/linking. Typir should consume that result.

### Pitfall 4: not separating built-in and user-defined types

This makes incremental rebuilds messy.

### Pitfall 5: unclear AST nodes for semantically distinct constructs

If your grammar collapses too much into generic nodes, typing becomes brittle.

### Pitfall 6: over-eager inference after syntax errors

The LOX example explicitly bails from some inference paths when cross-references are unresolved. ([GitHub][3])

## 21. Version-compatibility caution

One current practical caveat: Typir-Langium compatibility can lag Langium releases. There is a January 31, 2026 issue asking for a `typir-langium` release supporting Langium 4.2.x, and an earlier 2025 issue notes users getting Langium 3.5 working via overrides before official package support caught up. ([GitHub][6])

So if you are wiring this into a current Langium project, verify the exact versions first.

## 22. Minimal blueprint in prose

If I were implementing this in a fresh Langium language, I would do it in this order:

1. **Shape the grammar** so that all semantically meaningful expressions/declarations have their own AST node types.
2. **Use declared semantic model types** in Langium for stability. ([Langium][4])
3. **Register a Typir-based service** in the language module. ([Langium][5])
4. **Define built-in Typir types**: primitives, top type, maybe special null/void types. ([GitHub][1])
5. **Attach inference rules** from literals and type-reference nodes to those types. ([GitHub][3])
6. **Register operator signatures** for unary/binary expressions, using reusable operand extractors. ([GitHub][3])
7. **Walk AST declarations** and register user-defined function/class/entity types dynamically. ([GitHub][3])
8. **Hook type computation into the Langium build pipeline after scoping.** ([Langium][2])
9. **Register Typir validation rules** for assignability, conditions, return types, uniqueness, inheritance constraints, and semantic warnings. ([GitHub][3])
10. **Expose helper methods** like `inferType(node)` or `isAssignable(a, b)` so other editor features can use the same truth source.

## 23. The main architectural principle

The cleanest summary is this:

- **Langium owns documents, ASTs, references, and editor plumbing.**
- **Typir owns semantic typing rules and type relations.**
- **typir-langium bridges them through AST-aware inference and validation.** ([GitHub][1])

If you keep that separation strict, the system stays understandable and scales from a tiny expression DSL up to a language with user-defined entities, functions, operators, and rich editor diagnostics.

If you want, I can turn this into a concrete **Langium project skeleton** with the actual files/classes to create and code stubs for each one.

[1]: https://github.com/typefox/typir "GitHub - TypeFox/typir: Typir is an open source library for type checking in the web · GitHub"
[2]: https://langium.org/docs/reference/document-lifecycle/ "Document Lifecycle | Langium"
[3]: https://github.com/TypeFox/typir/blob/main/examples/lox/src/language/lox-type-checking.ts "typir/examples/lox/src/language/lox-type-checking.ts at main · TypeFox/typir · GitHub"
[4]: https://langium.org/docs/reference/semantic-model/ "Semantic Model Inference | Langium"
[5]: https://langium.org/docs/reference/configuration-services/ "Configuration via Services | Langium"
[6]: https://github.com/TypeFox/typir/issues/102 "Langium 4.2 support · Issue #102 · TypeFox/typir · GitHub"
