# Type Design — Preferred

> **How to read this document**
>
> - **Current preferred** Tao type-system _product_ direction: nominal `type`, structural `interface`, staged Typir rollout, unified diagnostics.
> - **Forks, open questions, and superseded options** live in **[Type Design - Alternatives.md](./Type%20Design%20-%20Alternatives.md)**.
> - **Full staged execution plan** (Stages 0–11), language-surface examples, design decisions, and deferred blocks (value guards, generics): **[Type Implementation - Execution plan.md](./Type%20Implementation%20-%20Execution%20plan.md)**.
> - **Typir + Langium wiring** (patterns, LOX references): **[Typir and Langium - Implementation guide.md](./Typir%20and%20Langium%20-%20Implementation%20guide.md)**.
> - **Long-form language examples and informal semantics** (historical / tutorial depth): **[Language surface - Type System Design.md](./Language%20surface%20-%20Type%20System%20Design.md)** (moved from _Tao Language Design_; may lag Preferred—resolve conflicts in **Alternatives**).
> - **Implementation checklist** (type matching phases, etc.): **[Type System - Followups.md](./Type%20System%20-%20Followups.md)**.
> - **Future per-stage `.tao` fixtures** (placeholder): [Example Types - Target](./Example%20Types%20-%20Target/README.md).
> - **Data layer async types** (`Loadable<T>`) interact with deferred view `guard`/`check` — see [Queries Design - Preferred](../Data%20Schema%20and%20Queries/Process%20Docs/Queries%20Design%20-%20Preferred.md) and [Queries Design - Alternatives](../Data%20Schema%20and%20Queries/Process%20Docs/Queries%20Design%20-%20Alternatives.md#loadable-vs-guard-and-check).

---

## Invariants {#invariants}

1. **Typir owns assignability and inference** — one `LangiumTypeSystemDefinition` implementation (`TaoTypeSystem` in [`packages/compiler/compiler-src/typing/`](../../../packages/compiler/compiler-src/typing/)); non-type structural rules stay in the existing `ValidationRegistry` until migrated deliberately.
2. **No typing when a reference is unresolved** — return `InferenceRuleNotApplicable` (LOX / Typir pattern) so link errors are not compounded by type noise.
3. **Unified diagnostics** — IDE and CLI share the same `TaoWorkspace` / document-builder pipeline; Typir feeds Langium validation once ([Execution plan — Design Decisions](./Type%20Implementation%20-%20Execution%20plan.md#design-decisions-provisional)).
4. **Nominal default, structural escape** — `type` introduces nominal identity; `interface` is the structural contract. See [Execution plan](./Type%20Implementation%20-%20Execution%20plan.md).

---

## Stages at a glance {#stages}

| Stage | Theme                                                                  |
| ----- | ---------------------------------------------------------------------- |
| 0     | Typir + Langium wiring                                                 |
| 1     | Primitives, operators, existing `string` / `number` / `any` parameters |
| 2     | Nominal scalar `type X is Y`                                           |
| 3     | Structs, literals, member access                                       |
| 4     | Nominal subtyping `type Sub is Super { … }`                            |
| 5     | Typed-argument matching at call sites                                  |
| 6     | `when` / narrowing / `is ?` / `is unknown`                             |
| 7     | `func`                                                                 |
| 8     | `interface`                                                            |
| 9     | Cross-module `use type`                                                |
| 10    | `action ->` nominal + structural                                       |
| 11    | Codegen precision                                                      |

Full detail, exit criteria, tests, and grammar touchpoints: **[Type Implementation - Execution plan.md](./Type%20Implementation%20-%20Execution%20plan.md#execution-plan)**.

---

## Language surface (summary) {#language-surface}

- **Shorthand:** `alias FirstName "John"`, struct fields by name, type-based argument matching when parameter types are distinct.
- **Optional fields:** `Role?` postfix on the field name; narrowing via `when` (see [Alternatives](./Type%20Design%20-%20Alternatives.md#optional-and-auto-promotion) for `optional` keyword vs `?` cleanup in long-form doc).
- **Actions as types:** structural `action ->` + nominal `type OnPress is action ->` — [Execution plan Stage 10](./Type%20Implementation%20-%20Execution%20plan.md#execution-plan).

---

## Where to look next {#reference-index}

| Need                              | Document                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Implement a stage                 | [Type Implementation - Execution plan](./Type%20Implementation%20-%20Execution%20plan.md)           |
| Wire Typir services               | [Typir and Langium - Implementation guide](./Typir%20and%20Langium%20-%20Implementation%20guide.md) |
| Tutorial-style examples           | [Language surface - Type System Design](./Language%20surface%20-%20Type%20System%20Design.md)       |
| Parser/compiler file paths        | Execution plan **Key files** section                                                                |
| Open questions / forks            | [Type Design - Alternatives](./Type%20Design%20-%20Alternatives.md)                                 |
| Phased followups (matching, etc.) | [Type System - Followups](./Type%20System%20-%20Followups.md)                                       |
