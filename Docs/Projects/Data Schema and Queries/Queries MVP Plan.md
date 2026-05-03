# Data Schema and Queries — MVP Plan

## Summary

Build the MVP of Tao's data layer: schema, queries, view control flow, and data writes — compiling to the app-selected provider using a **thin** shared runtime: a **`TaoDataClient`** interface in std lib (`getTaoData()` / `setTaoData()`, `createTaoDataClient`, `declareDataset`, `open`, `peekQuery`, `liveQuery`, `isBusy`, `insert`) plus short generated snippets. The app data provider is specified in `app { provider Name { key "value" } }`; every app has one, and **Memory** is the default when unspecified. Provider key-value pairs are passed through to provider init untyped; only providers validate their own params. This is **not** a generic multi-backend datasource product; **`MemoryTaoData`** exists for in-memory harnesses and default local apps, and **`InstantTaoData`** backs InstantDB apps. Auth is faked (`first Person as CurrentUser`). The [Queries MVP Target App](./Queries%20MVP%20Target%20App.tao) is the authoritative goal: when that app compiles and runs, the MVP is done.

**Approach:** an incremental test app in `Apps/Test Apps/` starts minimal and grows with each milestone. Each milestone's first step is adding the new syntax to the test app, then making it compile and run. When a milestone is complete, the test app should be able to compile and run, and pass the headless test runtime scenario where the harness supports it, along with `prep-commit`.

**Codegen:** prefer **short generated snippets** that call the **shared `TaoDataClient`** in the std lib (see M2). Avoid emitting large InstantDB boilerplate per app; keep generated output readable and stable.

---

## Goals

- **Schema:** `data` blocks with entities, relationships, and field metadata parse, validate, and compile; app-level `provider` selects runtime data access.
- **Queries:** first **raw** queries (`query Data get [first] Entity as Alias` — no `where` / `order` / `take`); **collection** queries without `first` parse and wire in **M2**; **M3** makes list results **`for`-iterable** and type-aligned for element binding, then **pipeline** steps and dotted paths (M4).
- **View control flow:** `guard` (Suspense fallback); `for` (iteration) over list-shaped query aliases (M3); `if`/`else` (conditionals) in views (M5).
- **Data writes:** `create` in actions (M3); `update` and remaining write polish (M6) compile to InstantDB `transact` via `getTaoData().insert(...)` on **`InstantTaoData`** (and in-memory rows on **`MemoryTaoData`**).
- **Working app:** the [target app](./Queries%20MVP%20Target%20App.tao) compiles and runs against InstantDB, end-to-end (**M8**).

## Non-goals (this branch)

- A **generic** pluggable datasource layer (REST/GraphQL adapters, swappable drivers). **In scope:** a small **`TaoDataClient`** contract with **`InstantTaoData`** (real `@instantdb/react-native`) and **`MemoryTaoData`** (no Instant) — see M2.
- `Loadable<T>` or generic async wrapper types (MVP uses `guard` + Suspense per [Preferred §3.6](./Process%20Docs/Queries%20Design%20-%20Preferred.md#async-model)).
- REST, GraphQL, Supabase, or TanStack-only providers.
- Real auth / session model (fake auth via `first Person`).
- Projections / partial selection, `delete`, aggregations.
- Migrations, schema diffing, offline/sync, optimistic updates.

---

## Milestones

**Status:** M1-M3.5 are complete. The current implementation parses and validates `data` blocks, supports raw queries, view `guard`, list-shaped query aliases, `for`, `create`, app/provider overrides, provider factory registration, and grouped data validators under [`validation/data/`](../../../packages/compiler/compiler-src/validation/data/). The active next milestones are **M4** (pipeline queries and dotted paths), **M5** (`if`/`else`), **M6** (`update`), **M7** (relationship-heavy staging app), and **M8** (literal target app).

### Completed milestones

- **M1:** `data` block grammar, validation, formatter support, and parser generation landed.
- **M2:** raw `query`, `guard`, app provider configuration, `TaoDataClient`, Memory/Instant providers, short generated `declareDataset` / `open` / query calls, and harness app overrides landed.
- **M3:** list-shaped queries, `for`, `create`, `getTaoData().insert`, Data Schema scenario coverage, parser/validator/formatter/codegen tests, and visible list-growth behavior landed.
- **M3.5:** `createTaoDataClient`, per-provider registration imports, trimmed `TaoDataClient` signatures, removal of legacy DB bootstrap `.tao` files, `validation/data/` grouping, and app-config-driven runtime imports landed.

### M4 — Query pipeline: `where`, `order`, `take`, dotted paths

M3.5 has landed (factory + trimmed client API + `validation/data/` + bootstrap `.tao` removal + `app-config` codegen). M3 behavior unchanged; **no** pipeline syntax required until M4.

Test app extends queries toward the [target app](./Queries%20MVP%20Target%20App.tao) shape, e.g.:

- `get Event as MyEvents > where Host is CurrentUser > order Ordering asc`.
- Dotted field paths in clauses where needed (e.g. `Rsvp.Event.Ordering`).

New grammar (deferred from M2/M3):

- Pipeline steps: `> where field is expr`, `> where field is not expr`, `> order field asc/desc`, `> take N`.
- Dotted field paths in `where` / `order` (relationship traversal).

Work:

- [ ] Grammar: pipeline continuation on `query`.
- [ ] Validator: clause targets resolve through relationships; `order` / `where` fields valid for InstantDB mapping or documented client-side fallback.
- [ ] Formatter: pipeline queries.
- [ ] Codegen: map pipeline to InstantDB query shapes (or `IDB` helpers that compose filters), keeping generated sites small.
- [ ] Tests: parse, validate, compile; extend running test app once M3 list + create path is stable.

### M5 — `if` / `else` conditionals in views

Test app adds conditionals: `if MyRsvps.isEmpty { ... }`, `if Rsvp.Person is CurrentUser { ... } else { ... }`.

New grammar:

- `if Expression { ... }` and `if Expression { ... } else { ... }` as view statements.
- `is` / `is not` as comparison operators in expression space.
- `.isEmpty` as a property on collections/query results.

Work:

- [ ] Grammar rules for `if`/`else`.
- [ ] Grammar/expression support for `is`, `is not`, `.isEmpty`.
- [ ] Validator: condition is boolean-typed expression.
- [ ] Codegen: `if`/`else` → conditional rendering in JSX.
- [ ] Formatter handles `if`/`else`.
- [ ] Tests: parse, validate, compile conditionals.

### M6 — `update` and additional writes

Test app adds **`update`** and any extra write patterns needed for the target app: e.g. `SetRsvpStatus`, `CreateRsvp` (if not already covered by M3 `create` shapes).

New grammar:

- `update Entity { field value, ... }` in action bodies (`create` is delivered in M3).

Work:

- [ ] Grammar rules for `update`.
- [ ] Validator: entity exists, fields match, values type-check; relationship to `create` rules.
- [ ] Codegen: `update` → thin `IDB` / `transact` patterns — avoid large per-statement generated blobs.
- [ ] Formatter handles `update`.
- [ ] Tests: parse, validate, compile `update`; exercise in test app alongside M3 `create`.

### M7 — Staging: relationship-heavy app (not yet the literal target file)

**Intent:** expand the incremental test app **or** add a **sibling** scenario under `Apps/Test Apps/` that mirrors the [target app](./Queries%20MVP%20Target%20App.tao) in **structure**: multiple entities, relationships, RSVPs, host-scoped lists, and **combined** use of M3–M6 (pipeline, conditionals, create/update). **Success:** compiles, runs, and passes headless/Expo checks for that staged app — **without** requiring a byte-for-byte paste of `Queries MVP Target App.tao`.

Work:

- [ ] Models and queries matching target relationships (Person, Event, Rsvp, etc.).
- [ ] Actions: create/update flows the target demonstrates.
- [ ] Compiles and runs against InstantDB (dev app id as in target or unified dev project).
- [ ] Headless and/or Expo verification for the expanded scenario.

### M8 — Done: literal target app compiles and runs

**Intent:** the [Queries MVP Target App](./Queries%20MVP%20Target%20App.tao) (or a merged equivalent with the **same** surface area) is the **definition of done** — copy/port into the shipped test harness as appropriate, then freeze.

Work:

- [ ] Full target `.tao` compiles and runs end-to-end.
- [ ] Target app id `meetup-lite-dev` unless unified with the M2 dev project.
- [ ] Verify in headless test runtime and Expo runtime.
- [ ] Demonstrates: define schema → query data (including pipeline where required) → mutate data → see updated view.

---

## What already exists (no new work needed)

- `app` declaration, `view`/`action` declarations, parameters, argument binding.
- `state` and `alias` assignments, `set` state updates.
- `do` action invocation (`ActionRender` callee is an `action` declaration), inline `action { ... }` expressions.
- App `on init action { … }` and bootstrap `_taoRunAppInits()` (module-load; no hook in generated shell).
- View rendering with arguments (`Button "text", handler`).
- File-level and in-view raw `query …`; view `guard { … }` with `IDB.isLoading`-driven fallback JSX.
- **`for`** over list-shaped query aliases; **`create Schema.Entity { … }`** in actions; **`getTaoData().insert`** on **`MemoryTaoData`** / **`InstantTaoData`**.
- **`createTaoDataClient`** with per-provider factory registration; nested **`app`** / **`provider`** overrides on **`TaoSDK_compile`** and **`tao compile`** CLI flags.
- String templates with `${...}` interpolation, binary ops (`+`).
- `type X is Y` declarations (at top level — data-scoped variant is new).

---

## Risks / open questions

- **`is` keyword overload (M4 pipeline, M5):** `is` is already used in type declarations (`type X is Y`) and parameters (`Title is text`). Using it as a comparison operator (`where Host is CurrentUser`, `if X is Y`) needs careful grammar disambiguation.
- **Dotted paths in query clauses (M4):** `> order Rsvp.Event.Ordering asc` traverses relationships — confirm InstantDB supports this or codegen/`IDB` must decompose it.
- **`for` variable shadowing (M3):** `for Event in MyEvents` binds `Event` which may shadow the entity type name from the schema. Scoping rules need to be clear.
- **List vs `first` (M3, extends M2):** M2 already distinguishes collection vs singleton queries; M3 must keep validator, types, and `IDB.peekQuery` / `useQuery` aligned so **no-`first`** aliases are consistently list-shaped and **`for`** element types match the entity row type.
- **InstantDB query shape limits (M4):** some `where` patterns (e.g. `where Host is not CurrentUser`) may not map directly to InstantDB's query API — may need client-side filtering inside `IDB` helpers.
- **`create` + list refresh (M3):** ensure query subscriptions or cache invalidation after `transact` so the button-driven flow shows a new row without a full reload.
- **Stale docs:** [Alternatives §Loadable](./Process%20Docs/Queries%20Design%20-%20Alternatives.md#loadable-vs-guard-and-check) still frames a `Loadable<T>`-first row as “preferred” while [Preferred §3.6](./Process%20Docs/Queries%20Design%20-%20Preferred.md#async-model) rejects `Loadable` for MVP — reconcile table labels and cross-links when next editing Alternatives.

---

## References

- [Queries MVP Target App](./Queries%20MVP%20Target%20App.tao) — authoritative MVP target (the app that must compile and run)
- [`TMP_taodev/`](../../../TMP_taodev/) — working reference app for InstantDB wiring (`src/lib/db.ts`, `src/instant.schema.ts`, etc.); not part of the shipped Tao toolchain, but the template for behavior and file responsibilities.
- Std lib (M2/M3.5): `packages/tao-std-lib/tao/data/providers/instantdb/instantdb.ts`, `in-memory/in-memory.ts`, and `tao-data-client.ts` — thin provider contract; copied under emitted `use/@tao/data/providers/` with the app.
- [Queries Design - Preferred](./Process%20Docs/Queries%20Design%20-%20Preferred.md) — design decisions
- [Queries Design - Alternatives](./Process%20Docs/Queries%20Design%20-%20Alternatives.md) — deferred forks
- [Runtime - TanStack Query and InstantDB](./Process%20Docs/Runtime%20-%20TanStack%20Query%20and%20InstantDB.md) — InstantDB mapping notes
- `packages/parser/` — Langium grammar
- `packages/compiler/` — validator and codegen
- `packages/headless-test-runtime/` — end-to-end compiled app tests

---
