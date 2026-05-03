# Type Design — Alternatives

> **How to read:** Options and open questions **not** duplicated in [Type Design - Preferred.md](./Type%20Design%20-%20Preferred.md). The **staged plan and long sketches** live in [Type Implementation - Execution plan.md](./Type%20Implementation%20-%20Execution%20plan.md).

---

## Index {#index}

| Anchor                                                          | Topic                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| [Open questions (execution plan)](#open-questions-still-open)   | Pointers into the execution plan’s open-question list         |
| [Optional and auto-promotion](#optional-and-auto-promotion)     | `optional` keyword vs `?`; primitive vs struct auto-promotion |
| [Syntax sugar forks](#syntax-sugar-forks)                       | `with` in views, `type =` vs `is`, import spellings           |
| [Structural vs nominal default](#structural-vs-nominal-default) | Rejected “structural by default” alternative                  |
| [Value guards and Loadable](#value-guards-and-loadable)         | `guard` / `check` vs data-layer `Loadable<T>`                 |

---

## Open questions (execution plan) {#open-questions-still-open}

The authoritative list (Typir timeline vs `interface`, `set` AST unification, optional defaults, function returns, interface extension, parameterized `action ->`, struct literal completeness) is kept in one place:

**[Type Implementation - Execution plan — Open Questions (still open)](./Type%20Implementation%20-%20Execution%20plan.md#open-questions-still-open)**

---

## Optional and auto-promotion {#optional-and-auto-promotion}

| Option                                                                                   | Status                    | Notes                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Role?` postfix optional fields                                                          | `preferred`               | Matches execution plan examples; aligns with `is ?` arms.                                                                                          |
| `optional Name` keyword style                                                            | `rejected` for new syntax | Still appears in older [Language surface - Type System Design](./Language%20surface%20-%20Type%20System%20Design.md) examples—treat as historical. |
| Middle-ground auto-promotion (struct/action literals promote; primitive literals do not) | `preferred`               | See [Language surface](./Language%20surface%20-%20Type%20System%20Design.md) “Alternative approaches” / review pass.                               |
| Full Rust-style (no auto-promotion)                                                      | `rejected` as global rule | Too much boilerplate for struct literals.                                                                                                          |

---

## Syntax sugar forks {#syntax-sugar-forks}

Consolidated from the review pass in **Language surface - Type System Design** (tail sections):

| Topic                                   | Preferred direction               | Status      |
| --------------------------------------- | --------------------------------- | ----------- |
| `view Foo with A, B` vs `view Foo A, B` | Drop `with`; single form          | `preferred` |
| `type X = Y` vs `type X is Y`           | `is` only                         | `preferred` |
| `use entire @pkg` vs `use * from @pkg`  | `*` spelling                      | `preferred` |
| Bare `action` as type vs `action ->`    | `action ->` when used as **type** | `preferred` |

---

## Structural vs nominal default {#structural-vs-nominal-default}

| Option                                                 | Status                                      |
| ------------------------------------------------------ | ------------------------------------------- |
| Nominal `type` + structural `interface` (current plan) | `preferred`                                 |
| Structural-by-default + opt-in nominal                 | `rejected` (see long-form Alt #6 rationale) |

---

## Value guards and Loadable {#value-guards-and-loadable}

View-level **`guard` / `check`** for loading, missing, and reloading are **deferred** — full sketch and relationship to optional narrowing:

**[Type Implementation - Execution plan — Value guards (DEFER)](./Type%20Implementation%20-%20Execution%20plan.md#value-guards-async-loading-missing-defer)**

Data-layer async results: **[Queries Design - Preferred](../Data%20Schema%20and%20Queries/Process%20Docs/Queries%20Design%20-%20Preferred.md)** (`Loadable<T>`). Cross-cutting UX: **[Queries Design - Alternatives](../Data%20Schema%20and%20Queries/Process%20Docs/Queries%20Design%20-%20Alternatives.md#loadable-vs-guard-and-check)**.

---

## Pattern matching alternatives {#pattern-matching}

| Option                                                  | Status      |
| ------------------------------------------------------- | ----------- |
| Nominal `when x is Person` + pay-as-you-go runtime tags | `preferred` |
| Stringly / field-only discrimination only               | `rejected`  |

---

## Other rejected bundles (short)

Captured in **Language surface - Type System Design** “Alternative approaches to consider”: colon field separators, explicit tag syntax as default, split type/value namespaces, dual `with` parser forms, lowercased binding names — all **`rejected`** or **`deferred`** as documented there; this file avoids duplicating full prose—use the long doc for narrative rationale.
