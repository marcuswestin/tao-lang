# Type Implementation — Execution plan

> Stages 0–11, language surface, open questions, and deferred sections (split from the former `WIP Research/Type System Research.md`). **Direction:** [Type Design - Preferred](./Type%20Design%20-%20Preferred.md). **Forks / defer:** [Type Design - Alternatives](./Type%20Design%20-%20Alternatives.md). **Typir prep + architecture:** [Typir and Langium - Implementation guide](./Typir%20and%20Langium%20-%20Implementation%20guide.md).

## Tao Type System

Brief overview and high level checklist of the required changes for basic type checking in Tao, followed by the **target language surface** (syntax + semantics) we are typing toward, open questions, and explicitly-deferred features.

### Overview & Checklist

- **Tao today (relevant to typing)**
  - **Expressions in the grammar** ([`packages/parser/tao-grammar.langium`](../../../packages/parser/tao-grammar.langium)):** `StringLiteral`, `NumberLiteral`, `BinaryExpression` (`+`, `-`, `*`, `/`), `UnaryExpression` (`-`), `NamedReference`, `ActionExpression`, and parenthesized `Expression`.
  - **Bindings:** `AssignmentDeclaration` for `alias` and `state` with `= Expression`; `ViewDeclaration` / `ActionDeclaration` with optional `ParameterList`; parameters use `ParameterType`: **`string` | `number` | `any`**.
  - **State updates:** `set` with `=`, `+=`, `-=`, `*=`, `/=`.
  - **There is no semantic type checker yet:** parameter `type` tokens are **parsed and formatted** but not checked against values; the compiler [`tao-lang-validator.ts`](../../../packages/compiler/compiler-src/validation/tao-lang-validator.ts) focuses on structure (allowed statements per block, duplicate names, `app` shape), not **assignability** of expressions. **Codegen** uses broad `any` / `Record<string, any>` in places (e.g. view parameters), not Tao-inferred static types.
  - **Tao is not LOX:** we do not have `Class` / `FunctionDeclaration` like LOX until Tao grows (roadmap: functions, objects, events). The first Typir pass should follow **Tao’s** surface: arithmetic, `alias`/`state` typing from initializers, `ParameterDeclaration` as the only explicit type syntax for now, `set` and view `Argument` checking. The richer surface in [Language Surface — Examples](#language-surface--examples) below lands in later stages / milestones.

- **Direction:** introduce a `LangiumTypeSystemDefinition` implementation (e.g. `TaoTypeSystem` under `packages/compiler/.../typing/`) registered from the [Langium services / module](https://langium.org/docs/reference/configuration-services/) entry (see [`tao-services` / language module in this repo](../../../packages/compiler/compiler-src/langium/tao-services.ts)), keep non-type validation in the existing `ValidationRegistry` checks, and add Typir-backed rules for types so there is a **single** place for assignability and inference, consistent with the principles above.

- **Staged plan** — see [Execution Plan](#execution-plan) below. Previous draft was a 7-step sketch (primitives → operators → declarations → validation → action type → codegen); it's been replaced by a fuller plan that accounts for nominal types, structs, subtyping, typed-argument matching, pattern matching, functions, interfaces, cross-module types, and the elevated action type.

- **See also (internal & roadmap)**
  - Deeper end-to-end Typir+Langium architecture: [Typir and Langium - Implementation guide](./Typir%20and%20Langium%20-%20Implementation%20guide.md) (in-repo, cites Langium, Typir LOX, GitHub issues).
  - [Tao Lang Roadmap](../../Tao%20Lang%20Roadmap.md) for product expectations around types, functions, and IDE.

### Execution Plan

Twelve stages, numbered **0–11**, in dependency order. Each stage lists what it adds, the grammar/AST work (if any), the typing rules, the validation rules, and the test surface. Stages are **not** a 1:1 PR map — a single PR may span grammar + typing + tests for one stage, or split one large stage (e.g. 3 Structs) across multiple PRs. Everything in [Deferred / out-of-scope](#deferred--out-of-scope-for-now) stays deferred.

All stages share two invariants:

1. **No typing when a reference is `undefined`** — return `InferenceRuleNotApplicable` so Langium link errors aren't compounded by type noise (per the LOX pattern).
2. **One source of truth** — all assignability / inference lives in `TaoTypeSystem` (`LangiumTypeSystemDefinition`); non-type structural checks stay in the existing `ValidationRegistry`.

---

**Stage 0 — Typir + Langium wiring**

- **Deps:** add `typir` and `typir-langium` to `packages/compiler`. Verify version alignment with Langium `^4.1.2` (pin `typir-langium@0.3.3` or successor compatible with our Langium).
- **New:** `packages/compiler/compiler-src/typing/tao-type-system.ts` — `TaoTypeSystem implements LangiumTypeSystemDefinition`, with empty `onInitialize(typir)` and no-op `onNewAstNode`.
- **Modify:** `packages/compiler/compiler-src/langium/tao-services.ts` (or the generated module) to register the Typir services via `createTypirLangiumServices`.
- **Exit criteria:** compiler still builds, all existing tests green, a trivial doc type-checks with zero rules without crashing.
- **Tests:** smoke test that Typir services are reachable from a parsed document; no typing assertions yet.

**Stage 1 — Primitives, operators, and the existing parameter surface**

- **Types:** primitives `number`, `string`. Keep `any` as a permissive top for legacy `ParameterType: any` (reject nothing; infer `any`).
- **Inference:** `NumberLiteral` → `number`, `StringLiteral` → `string`.
- **Operators:** shared extractor + per-operator signatures (LOX pattern). `-`, `*`, `/` as `number × number → number`; `+` as `number × number → number` (string `+` deferred until we actually want it); unary `-` as `number → number`.
- **Validation added (via Typir):**
  - `ViewRender`/`ActionRender` **positional** arguments: each argument assignable to the corresponding parameter's declared `ParameterType` (`string` / `number` / `any`).
  - `StateUpdate` compound ops (`+=`, `-=`, `*=`, `/=`): both sides must be `number`; `=` requires RHS assignable to the state's inferred type (which is still just `number` / `string` at this stage because struct types don't exist yet).
  - `AssignmentDeclaration` (`alias`/`state`): the binding's type is the inferred type of the RHS expression.
  - `NamedReference`: type is the resolved `Referenceable`'s type (parameter / alias / state / …).
- **Tests:** `packages/compiler/compiler-tests/5-test-type-checking.test.ts`, plus a minimal test app `Tests/test-apps/type-basics/` exercising numeric arithmetic, string literals, parameter passing, and a handful of well-typed / ill-typed snippets.
- **Notes:** this stage is roughly equal to the **entire** previous 0–4 plan; everything past here is new scope.

**Stage 2 — Nominal scalar `type` declarations**

- **Grammar:** new `TypeDeclaration` rule — `type <Name> is <Name>` where the RHS is either a primitive keyword (`string` / `number`) or another type name. Regenerate AST, update formatter.
- **Types:** each `type X is Y` becomes a distinct Typir type that is assignable **to** `Y` but not from it (nominal subtype, no structural collapse).
- **Inference:** `NamedReference` resolves through the type name → Typir type.
- **Auto-promotion rule:** `alias X = <literal>` / `alias X <literal>` with no `type X` in scope auto-declares a fresh `type X is <primitive-of-literal>` at the enclosing scope, then binds. If `type X` already exists, bind at it (and check RHS assignability).
- **Validation added:**
  - `alias`/`state` with a binding-name shorthand (`alias FirstName "John"`): the RHS's primitive type must be assignable to `FirstName`'s underlying primitive.
  - `set Person.Field = ...`: wait, still no struct fields — stage applies to bare `set` of named state bindings against their auto-promoted or explicit nominal type.
- **Tests:** test app `type-nominal-scalars/` — `type FirstName is string`, aliases, cross-type assignment errors, auto-promotion behavior.

**Stage 3 — Struct types, struct literals, and member access**

- **Grammar:** extend `TypeDeclaration` to support struct bodies — `type <Name> is { <Field>, ... }` with `<Field> ::= (<TypeRef>)? <Name> ('?')? (<TypeRef>)?` allowing `Type Name`, `Name` (shorthand when a type of that name exists), and `Name? Type` (optional). Anonymous struct types `{ ... }` inline in a field position. Struct literal expressions `<Type>? { <Arg>, ... }` as an expression form; add member access (`<Expr> . <Name>`).
- **Types:** structural record types behind nominal names. Typir needs either a built-in class type or a custom kind — prefer the Typir class factory once Langium version supports it; otherwise a custom `Kind`.
- **Inference:** struct literal → the expected nominal struct type (from context or LHS binding name shorthand); member access `<Expr>.<Name>` → the field's declared type.
- **Validation added:**
  - Struct literal: every **non-optional** field covered exactly once; no unknown fields; each value assignable to the declared field type. Field order is irrelevant.
  - Per-field shorthand (`FirstName` instead of `FirstName FirstName`): resolves to an in-scope value/type of that name, and the value's type must be assignable to the field's type.
  - Optional fields (`Role?`): literal may omit them; **reads** of `x.Role` are typed as optional and must be narrowed before use (narrowing lands in Stage 7; for now, reading an optional field is a warning/error per agreement).
  - Property-accessed subtypes (`Person.Job`): inline struct field types can be referenced as types at `Owner.FieldType` syntax; bare-literal `alias` shorthand against property-accessed types is a type error (must use explicit `alias Job = Person.Job { ... }`).
  - `set Owner.Field = RHS`: RHS assignable to the field's declared type; compound ops require `number`.
- **Tests:** test app `type-structs/` covering literal validation, member access, optional field reads, property-accessed subtypes, `set` on fields.
- **Risk callout:** this is the **largest** stage. Consider splitting into 3a (declarations + literals), 3b (member access + `set`), 3c (optionals + property-accessed subtypes).

**Stage 4 — Nominal subtyping with extension**

- **Grammar:** `type Sub is Super { <extra fields> }` (reusing the Stage 3 field grammar; extra-fields block optional).
- **Types:** `Sub <: Super`, with `Sub`'s field set = `Super`'s fields ∪ extras. Typir handles subtyping via assignability rules / conversion relations.
- **Validation added:**
  - Down-typing: a `Sub` value is assignable anywhere `Super` is expected; reverse is an error.
  - Struct literal typed at `Sub` must cover `Super`'s non-optional fields **plus** the non-optional extras.
  - Parameter passing, `set`, arguments — all respect subtyping.
- **Tests:** test app `type-subtyping/` — the `Person` → `Employee` → `Manager` hierarchy from the examples, including the `Hire Person {}` error case.

**Stage 5 — Typed-argument matching at call sites**

- **Grammar:** nothing new structurally; possibly add a **named-argument** syntax (`Name: value`) to arguments if not already present, gated behind this stage.
- **Resolution algorithm:** at each call site (`ViewRender`, `ActionRender`, later `FunctionCall`):
  1. If every parameter type is distinct, match arguments to parameters by **type** (each argument's inferred type must be assignable to exactly one parameter's type, with subtyping).
  2. If any parameter types collide, **every** argument targeting a colliding parameter must be a **named** argument; unambiguous non-colliding arguments may still be by-type.
  3. Bare-name argument `Name` (no explicit value) resolves to an in-scope value named `Name` whose type matches some parameter (per the `ProfileLink OnPress, Person { }` example).
  4. Missing arguments for non-optional parameters → error; extra arguments → error.
- **Validation added:** all of the above, surfaced as distinct diagnostics (ambiguous match, missing required, unknown argument).
- **Tests:** test app `type-typed-args/` — view/action calls with permuted arguments, named args, collisions, inline `OnPress -> { ... }` shorthand.

**Stage 6 — Pattern matching (`when`) and optional narrowing**

- **Grammar:** `WhenExpression ::= 'when' Expression (WhenArm)+`; `WhenArm ::= 'is' WhenPattern '->' (Block | Expression)`; `WhenPattern ::= TypeRef | '?' | 'unknown' | Predicate`. Update formatter.
- **Types / narrowing:**
  - `is <Type>`: in the arm body, the scrutinee is narrowed to `<Type>`. If the scrutinee's static type is not a supertype of `<Type>`, it's a type error (the arm is unreachable by type).
  - `is ?`: only valid when the scrutinee's type is optional; narrows the rest-of-chain to the absent case.
  - `is unknown`: catch-all for `is <Type>` branches; body sees the scrutinee at its static type minus already-matched types.
  - `is <predicate>` (e.g. `is >= 30`): evaluates at runtime; no static narrowing beyond the scrutinee's existing type.
- **Runtime:** pay-as-you-go discriminant metadata (per decision above) — codegen pass collects every nominal type used in an `is <Type>` arm and emits runtime tags for exactly those types.
- **Validation added:** exhaustiveness check for optional scrutinee (`is <T>` / `is ?` must cover both cases, or `is unknown` must be present); unreachable-arm warnings when a `is <Type>` is statically impossible.
- **Tests:** test app `type-pattern-match/` covering `is Type`, `is ?`, `is unknown`, `is <predicate>`, optional-field narrowing, subtype narrowing.

**Stage 7 — Functions (`func`)**

- **Grammar:** `FunctionDeclaration ::= 'func' <Name> <ParameterList> Block`. Return type inference from body; explicit annotation TBD ([open question](#open-questions-still-open)).
- **Types:** user-declared function types registered per document in `onNewAstNode`. Calls are type-checked via Stage 5's argument-matching algorithm.
- **Validation added:** call arity / type matching; body's result type (if relevant for return inference).
- **Tests:** test app `type-functions/`.

**Stage 8 — Interfaces (structural)**

- **Grammar:** `InterfaceDeclaration ::= 'interface' <Name> '{' <Field> (',' <Field>)* '}'`. Same field grammar as struct types.
- **Types:** structural — any `type` whose fields (including inherited) cover the interface's fields is assignable to the interface.
- **Validation added:** structural-satisfaction check at every assignment / argument site where the target is an interface.
- **Tests:** test app `type-interfaces/` — the `Addressable` / `Person` / `Dog` example with `func Greet Addressable`.

**Stage 9 — Cross-module `use type`**

- **Grammar:** extend `UseStatement` to accept `use type <Name> from <import>`. Exported types in a module are the top-level `type` / `interface` declarations.
- **Scoping:** imported type names populate the document's type scope; nominal identity is preserved across modules (two imports of the same `type Person` are the same Typir type).
- **Validation added:** import resolution errors surface once, not per-use.
- **Tests:** test app `type-cross-module/` — `personell.tao` exports `Person`, consumer imports and uses it.

**Stage 10 — Action type (nominal + structural)**

- **Grammar:** allow `action ->` as a `TypeRef` wherever types appear (parameters, fields, `type Foo is action ->`, interface members). Future: parameterized actions `action -> (T)` — [open question](#open-questions-still-open).
- **Types:** structural `action ->` is a single Typir type; `type Foo is action ->` is a distinct nominal type assignable to the structural base. `ActionExpression` values infer to the contextually-expected nominal action type, else the structural base.
- **Validation added:** passing an action value where a different named action type is expected is a type error; inline `OnPress -> { ... }` at a call site where `OnPress` is the target parameter binds correctly.
- **Tests:** test app `type-action/` — nominal actions as view parameters, subtype/supertype interaction with `action ->`.

**Stage 11 — Codegen precision**

- Use inferred/declared types to emit **precise** TypeScript for view parameters, action signatures, state, and scopes — replacing broad `any` / `Record<string, any>` in `runtime-gen.ts` and related generators wherever the Tao type is known.
- Coordinate with `TR.Declare` patterns in `@tao/tao-runtime`; surface any runtime shape that still has to be `any` due to missing Tao-type coverage.
- **Tests:** snapshot-based codegen tests in `packages/compiler/compiler-tests/`, plus all earlier test apps re-verified to build and run under the stricter generated types.

---

**Key files (when implementation starts)**

- **New:** `packages/compiler/compiler-src/typing/tao-type-system.ts` — `LangiumTypeSystemDefinition`.
- **New:** `packages/compiler/compiler-src/typing/` auxiliary files per stage (e.g. `operators.ts`, `structs.ts`, `subtyping.ts`, `pattern-match.ts`) as the surface grows.
- **Modify:** `packages/compiler/compiler-src/langium/tao-services.ts` (or generated `*-module.ts` per [Configuration via services](https://langium.org/docs/reference/configuration-services/)) — register Typir / `TaoTypeSystem`.
- **Modify:** `packages/compiler/package.json` — add `typir`, `typir-langium` (version-aligned with Langium; see [typir-langium](https://www.npmjs.com/package/typir-langium)).
- **Modify:** `packages/parser/tao-grammar.langium` — starting at Stage 2 every structural stage adds grammar. Regenerate AST with `./agent gen`.
- **Modify:** `packages/formatter/` — each grammar-changing stage updates the formatter and its tests.
- **Modify:** `packages/compiler/compiler-src/validation/tao-lang-validator.ts` — keep non-type structural rules; **remove** any ad-hoc checks Typir now subsumes.
- **Modify (Stage 11):** `packages/compiler/.../runtime-gen.ts` and friends.
- **New (tests):** `packages/compiler/compiler-tests/5-test-type-checking.test.ts` plus per-stage `.tao` fixture apps under the test apps directory.

### Language Surface — Examples

The examples below describe the **target** type-system surface in Tao. Not all of it lands in Stages 0–4; later stages/milestones cover structs, subtyping, pattern matching, functions, and interfaces. Anything tagged **DEFER** is captured for design continuity but is out of scope for initial implementation.

#### Nominal types and `type X is Y`

Tao types are **nominal** (named). A `type` declaration introduces a new type whose structural shape may alias another type:

```tao
type FirstName is string
type LastName is string

alias Name = FirstName "John" // Name is a FirstName (not a raw string)
alias Age = 30                // Shorthand for `type Age is number; alias Age = Age 30`
```

- Two nominal types with the same underlying shape (`FirstName`, `LastName`, both `is string`) are **not** mutually assignable — passing a `LastName` where a `FirstName` is expected is a **type error**.
- A bare `alias Name = <literal>` promotes to a fresh nominal type named after the binding (shorthand for `type Name is <base>; alias Name = Name <literal>`).

#### Struct types

Struct types declare named, typed fields with a **comma-delimited** field list. Each field may use the full `<Type> <Name>` form or a **shorthand** when the field name matches a type in scope:

```tao
type Person is {
  FirstName FirstName,      // Field `FirstName` of type `FirstName`
  LastName,                 // Shorthand for `LastName LastName`
  Age,                      // Shorthand for `Age Age`
  Job? { Title string },    // Optional field with an anonymous struct type (shorthand also applies inside)
  Alias? FirstName,         // Optional field `Alias` of type `FirstName`
}
```

- `?` after the field name marks the field **optional** (see [Optional properties](#optional-properties-and-default-values)).
- Anonymous struct types inline in a field declaration are allowed; their members follow the same shorthand rules.

#### Property-accessed subtypes

A struct field whose type is declared inline (e.g. `Job? { Title string }`) can be **referenced by property access** as `Owner.FieldName`:

```tao
alias Job = Person.Job { Title "Developer" }

// Type error: name-based alias shorthand does not work for property-accessed subtypes
alias Person.Job { Title "Developer 2" }
```

- You can name a value of the inline field’s type via `Outer.Field { ... }`.
- The bare-literal shorthand (`alias Name "literal"`) is **not** available for property-accessed names — the binding must be explicit.

#### `alias` / `state` shorthand

A common pattern: if the binding name matches a `type` in scope, the right-hand side type is implied:

```tao
alias FirstName "John"                                     // Shorthand for `alias FirstName = FirstName "John"`
state Person { FirstName, LastName "Doe", Age 30 }         // Shorthand for `state Person = Person { ... }`
state Person2 = Person { FirstName LastName, LastName "Doe", Age 30 }
                                                           // type error: `LastName` is not a `FirstName`
```

- Struct literals allow per-field shorthand (`FirstName` in place of `FirstName FirstName`) — a field name resolves to an in-scope value/type of the same name.
- Field order in struct literals does **not** matter; fields are matched by name.

`set` on struct fields is type-checked against the field type:

```tao
alias Person = Person { FirstName, LastName "Doe", Age 30, Job }
action Example {
  set Person.FirstName = Person.LastName // type error: LastName is not a FirstName
}
```

#### Down-typing (nominal subtyping)

`type X is Y` declares `X` as a **subtype** of `Y`. A value of a subtype is assignable wherever the supertype is expected; the reverse is a type error:

```tao
type Person is { Name string, Age number }
type Employee is Person
type Manager is Employee { Role string } // extends `Employee` with an extra field

view Greet Person {
  Text "Hi " + Person.Name + "!"
}
view Hire Employee {
  Text "Hiring " + Employee.Name + "!"
}

view Example {
  alias Person   { Name "John", Age 30 }
  alias Employee { Name "John", Age 30 }
  alias Manager  { Name "John", Age 30, Role "Manager" }
  Greet Employee { }   // ok — Employee <: Person
  Greet Manager  { }   // ok — Manager  <: Employee <: Person
  Hire  Person   { }   // type error: Person is not an Employee
}
```

- `type Sub is Super { ...extraFields }` is sugar for “`Sub` is a `Super` with these additional fields”.
- Field-level assignability follows the same nominal/subtype rules recursively.

#### Cross-module type imports

Types can be imported across modules via `use type`:

```tao
use type Person from @library/personell
```

(See [Open Questions](#open-questions) for how broadly `use` can bring type names in the first milestone.)

#### Typed arguments (type-based matching)

View / action / function parameters are declared as a list of typed parameters. At a **call site**, if the callee’s parameter types are all distinct, arguments are matched **by type** rather than by position or name, and a bare name whose declared type matches a parameter is accepted as that argument. Order of arguments does **not** matter when types are unambiguous.

```tao
type OnPress is action ->
view ProfileLink with Person, OnPress {
  Pressable OnPress { Text Person.Greeting }
}

view Example {
  alias Person { LastName "Doe", FirstName "John" } // field order does not matter
  action OnPress { }                                  // shorthand: `action OnPress = OnPress { }`

  // Argument order does not matter — matched by type
  ProfileLink OnPress, Person { }

  // Inline action shorthand: `OnPress -> { ... }` is sugar for `OnPress OnPress -> { ... }`
  ProfileLink OnPress -> { ... }, Person { }
}
```

- If two parameters share a type, positional / named disambiguation is required (exact mechanism TBD).
- `action` can be used as a **type** (`type OnPress is action ->`) for passing actions as arguments — see [Action type](#action-type-stage-5).

#### Optional properties and default values

`Field? Type` marks a struct field as optional. Reads of an optional field must be **guarded** (via `when` pattern match or another narrowing construct) before they can be used where a non-optional value of the same type is expected:

```tao
type Employee is { Name string, Age number, Role? string }
alias Employee { Name "John", Age 30 }

view Example {
  when Employee.Role
    is string -> Text Employee.Role
    is ?      -> Text "No role"

  Text Employee.Role // type error: Role is optional and has no default value
}
```

- `is ?` matches the **absent** case of an optional.
- Default values for optional properties / parameters: **design TBD** (see [Open Questions](#open-questions)).

#### Pattern matching (`when ... is ...`)

`when` narrows a value by type or by refinement:

```tao
view Example Addressable {
  when Addressable
    is Person  -> Text "Hi " + Person.Name
    is Dog     -> Text "Woof " + Dog.Name
    is unknown -> Text "Unknown" // (tentative: `is ? -> ...` is under consideration)

  alias Person1 = Person { Name "John", Age 30 }
  alias Person2 = Person { Name "Jane", Age 25 }

  when Person1.Age
    is >= 30 -> Text "Over 30"
}
```

- `is <Type>` narrows to that nominal type within the arm.
- `is <refinement-expr>` (e.g. `>= 30`) narrows by value predicate.
- `is unknown` / `is ?` is the catch-all fallback (final syntax TBD).
- Runtime support for `is <Type>` requires discriminant metadata — see [Open Questions](#open-questions).

#### Functions (`func`)

`func` declares a typed function whose parameters use the same `Type Name` / shorthand syntax as views and actions:

```tao
func Greet Person, Prefix string {
  Text Prefix + " " + Person.FirstName + " " + Person.LastName + "!"
}
```

- Return type inference / declaration: TBD.
- Functions participate in [typed argument matching](#typed-arguments-type-based-matching) at call sites.

#### Interfaces (structural)

`interface` declares a **structural** contract: any type with the listed fields satisfies the interface and can be passed where the interface is expected:

```tao
interface Addressable {
  Name,
}

type Dog is { Name string, Owner Person }

alias Person { Name "John", Age 30 }
alias Dog    { Name "Rex",  Owner Person }

func Greet Addressable {
  Text "Hi " + Addressable.Name
}
```

- Interfaces are the **structural** escape hatch in an otherwise nominal system — `type` is nominal, `interface` is structural.
- An interface field list uses the same shorthand rules as struct types.

#### Action type

`action ->` is a type constructor for actions-as-values. The system uses **both** styles (provisional):

- **Structural base:** the bare `action ->` (optionally with a parameter list in future) is the anonymous structural shape — any `ActionExpression` matches `action ->`.
- **Nominal wrappers:** `type OnPress is action ->` declares a **nominal** action type. `OnPress` is assignable to `action ->` (its structural base), but `OnPress` and another `type OnSubmit is action ->` are **not** assignable to each other.
- Parameters of type `action ->` accept any action; parameters of a named action type accept only that named action (or subtypes). The inline `OnPress -> { ... }` shorthand at a call site produces a value typed as `OnPress`.

See the corresponding stage in the [Execution Plan](#execution-plan).

### Design Decisions (provisional)

Working answers to the original open questions. Each is **provisional** — flip any one and the relevant stage(s) in the [Execution Plan](#execution-plan) adjust accordingly.

- **Nominal auto-promotion:** `alias X = <literal>` / `alias X { ... }` / `alias X <literal>` **auto-declares a fresh `type X`** only when **no type named `X` already exists in scope**. If a `type X` exists, the alias binds at that type (and the RHS must be assignable). Explicit `type X is ...` always wins.
- **Cross-module type imports:** `use type Name from <pkg>` lands **after** struct types and nominal subtyping, **before** functions/interfaces. Until then types are **file-local**.
- **Action type shape:** **Both** — structural `action ->` as anonymous base, nominal `type Foo is action ->` on top. See [Action type](#action-type) above.
- **Typed-argument matching with colliding types:** When two or more parameters share a type, the call site **must** use **named arguments** (`ParamName: value`) for each colliding position. When all parameter types are distinct, by-type matching applies (order-independent).
- **`when` catch-all spelling:** Both allowed — `is ?` is the **optional-absent** arm (only valid when the scrutinee is an optional), `is unknown` is the **type catch-all** for `is <Type>` matching. Using `is ?` on a non-optional is a type error; `is unknown` is always valid.
- **Runtime discriminants for `is <Type>`:** **Pay-as-you-go.** The compiler only emits runtime tag metadata for nominal types that are actually **reached by an `is <Type>` arm** in some `when`. Types never matched at runtime stay tag-free. Enforced by a pre-codegen pass that collects the set of tagged types.
- **Test strategy:** **Per-stage focused test app** under a type-system fixtures directory (e.g. `type-basics`, `type-structs`, `type-subtyping`, `type-pattern-match`, …), **plus** compiler unit tests in `packages/compiler/compiler-tests/`. Each app stays minimal and targets exactly one stage's surface.
- **IDE diagnostics pipeline:** **Unified** — the IDE extension subscribes to the same `TaoWorkspace` / document-builder pipeline as the CLI compiler. Diagnostics flow through Typir → Langium `validation` once, consumed by both surfaces.

### Open Questions (still open)

- **Typir vs roadmap alignment:** Typir's roadmap includes structurally-typed classes (planned). Tao is nominal-via-`type` + structural-via-`interface`; does that match Typir's timeline, or do we need custom Typir types for the interface side?
- **Unify `set` target AST** (Critical Look #2): worth doing **before** type checking, or does the type checker walk both shapes?
- **Optional defaults:** Syntax and semantics for default values on optional struct fields and optional parameters (e.g. `Role? string = "guest"`?).
- **Function return types:** Inferred from body, declarable via `func Greet ... -> Greeting { ... }`, or both?
- **Interface + subtyping interaction:** Can an `interface` extend another interface? Can a `type` explicitly declare `implements`, or is satisfaction purely structural?
- **`action ->` parameter lists:** Do we need `action -> (Person)` or similar to type actions that take arguments, or is Tao's action surface parameterless for now?
- **Struct literal completeness:** Must every non-optional field be present in a struct literal, or does the type checker allow partial literals with contextual inference (e.g. when assigning to a known supertype)?

### Deferred / out-of-scope (for now)

These are intentionally **not** in the initial staged plan; they are listed so the design stays coherent when we return to them.

<a id="value-guards-async-loading-missing-defer"></a>

#### Value guards (async / loading / missing) — DEFER

`guard` and `check` describe rendering fallbacks when data is **loading**, **missing**, or **reloading**. Sketch:

```tao
type Employee is { Name string, Age number, Role? string }
view Example {
  guard loading {
    // If ANY data access in this scope is loading and unguarded, render this instead of anything below it.
  }
  guard missing, loading {
    // Combined fallback for any missing-or-loading data access.
  }

  guard loading Employee.Role {
    // Scoped to a specific access chain.
    Text "Loading data ..."
  }
  guard missing Employee.Role {
    Text "Could not load this data"
  }

  Col {
    Text Employee.Role // type error: Role is optional and has no default value

    check reloading Employee.Role {
      // Render while Employee.Role is reloading, but continue rendering siblings below.
      Spinner
    }

    check Employee.Role {
      Text "No role"
    }
    Text Employee.Role // no type error here — Employee.Role is narrowed by the `check` above
  }
}
```

- `guard` = exclusive fallback (replaces the rest of the scope while active).
- `check` = inline narrowing / side-render without replacing siblings.
- Interacts with optional-field narrowing and with async data. Full semantics TBD.

For the **data layer**, async query results are specified as **`Loadable<T>`** in [Query Design - Preferred.md](../Data%20Schema%20and%20Queries/Query%20Design%20-%20Preferred.md); optional `guard`/`check` integration with that model and other UX options are tracked in [Query Design - Alternatives.md](../Data%20Schema%20and%20Queries/Query%20Design%20-%20Alternatives.md#loadable-vs-guard-and-check) — the sketches in _this_ section are **not** the data-layer spec until unified.

#### Generics — DEFER

Not figured out yet. Sketch for future reference:

```tao
// type List is (T) {
//   items: [T],
// }
// alias List is (T) {
//   items: [T],
// }
// type MapFunc is (ItemT) -> Results
//   where ItemT is any, Results is any[]
// func map Items Item[], MapFunc with output Results {
//   for item in Items {
//     output MapFunc(item)
//   }
// }
```

#### Type functions (computed fields) — DEFER

Declaring computed fields on a type with `with { ... }`, typed by the enclosing type’s fields:

```tao
type Greeting is string
type Person is { FirstName, LastName } with {
  Greeting: "Hi " + FirstName + " " + LastName + "!", // typed as Greeting
  Greeting: 1,                                         // type error: not a string
  Foo: "Bar",                                          // type error: no type "Foo"
}

alias Person   = Person { FirstName "John", LastName "Doe" }
alias Greeting = Person.Greeting // type Greeting
```

- Computed-field names must correspond to an **in-scope type** whose shape matches the expression’s type.
- Unknown names are a type error (no implicit `any`-typed fields).
