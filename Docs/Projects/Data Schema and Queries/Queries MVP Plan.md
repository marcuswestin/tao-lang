# Data Schema and Queries — MVP Plan

## Summary

Build the MVP of Tao's data layer: schema, queries, view control flow, and data writes — compiling to the app-selected provider using a **thin** shared runtime: a **`TaoDataClient`** interface in std lib (`getTaoData()` / `setTaoData()`, `createTaoDataClient`, `declareDataset`, `open`, `peekQuery`, `useLiveQuery`, `isBusy`, `insert`) plus short generated snippets. The app data provider is specified in `app { provider Name { key "value" } }`; every app has one, and **Memory** is the default when unspecified. Provider key-value pairs are passed through to provider init untyped; only providers validate their own params. This is **not** a generic multi-backend datasource product; **`MemoryTaoData`** exists for in-memory harnesses and default local apps, and **`InstantTaoData`** backs InstantDB apps. Auth is faked with `get one Person as CurrentUser` over a unique field such as `Email`. The [Queries MVP Target App](./Queries%20MVP%20Target%20App.tao) is the authoritative goal: when that app compiles and runs, the MVP is done.

**Approach:** an incremental test app in `Apps/Test Apps/` starts minimal and grows with each milestone. Each milestone's first step is adding the new syntax to the test app, then making it compile and run. When a milestone is complete, the test app should be able to compile and run, and pass the headless test runtime scenario where the harness supports it, along with `prep-commit`.

**Codegen:** prefer **short generated snippets** that call the **shared `TaoDataClient`** in the std lib (see M2). Avoid emitting large InstantDB boilerplate per app; keep generated output readable and stable.

---
## Goals

- **Schema:** `data` blocks with entities, relationships, and field metadata parse, validate, and compile; app-level `provider` selects runtime data access.
- **Queries:** first **raw** queries (`query Data get [first] Entity as Alias` — no `where` / `order`); **collection** queries without `first` parse and wire in **M2**; **M3** makes list results **`for`-iterable** and type-aligned for element binding; **M4** landed V1 query plans with `for <Plural>`, `get one <Singular>`, `where`, `order`, and `include`.
- **View control flow:** `guard` (Suspense fallback); `for` (iteration) over list-shaped query aliases (M3); `if`/`else` (conditionals) in views (M5).
- **Data writes:** `create` in actions (M3) currently compiles through `getTaoData().insert(...)`; `update` and remaining write polish (M6) should compile through thin `TaoDataClient` write helpers backed by InstantDB `transact` and in-memory row updates.
- **Working app:** the [target app](./Queries%20MVP%20Target%20App.tao) compiles and runs against InstantDB, end-to-end (**M8**).
- **Schema push:** provider admin implementations can push serialized Tao data schemas during CLI compile/dev workflows. Providers temporarily live in `packages/tao-std-lib/tao/data/providers`, split into `client/` and `admin/` folders.

## Non-goals (this branch)

- A **generic** pluggable datasource layer (REST/GraphQL adapters, swappable drivers). **In scope:** a small **`TaoDataClient`** contract with **`InstantTaoData`** (real `@instantdb/react-native`) and **`MemoryTaoData`** (no Instant) — see M2.
- `Loadable<T>` or generic async wrapper types (MVP uses `guard` + Suspense per [Data and Queries - Design §3.6](./Process%20Docs/Data%20and%20Queries%20-%20Design.md#async-model)).
- REST, GraphQL, Supabase, or TanStack-only providers.
- Real auth / session model (fake auth via `get one Person` over a unique field).
- Projections / partial selection, limiting/pagination, `delete`, aggregations.
- Migrations, schema diffing, offline/sync, optimistic updates.
---

## Milestones

**Status:** M1-M4 are complete. The current implementation parses and validates `data` blocks, supports raw and structured queries, view `guard`, list-shaped query aliases, `for`, `create`, app/provider overrides, provider factory registration, grouped data validators under [`validation/data/`](../../../packages/compiler/compiler-src/validation/data/), structured query plan codegen, and Memory/InstantDB query execution. The active next milestones are **M5** (`if`/`else`), **M6** (`update`), **M7** (relationship-heavy staging app), and **M8** (literal target app).

### Completed milestones

- **M1:** `data` block grammar, validation, formatter support, and parser generation landed.
- **M2:** raw `query`, `guard`, app provider configuration, `TaoDataClient`, Memory/Instant providers, short generated `declareDataset` / `open` / query calls, and harness app overrides landed.
- **M3:** list-shaped queries, `for`, `create`, `getTaoData().insert`, Data Schema scenario coverage, parser/validator/formatter/codegen tests, and visible list-growth behavior landed.
- **M3.5:** `createTaoDataClient`, per-provider registration imports, trimmed `TaoDataClient` signatures, removal of legacy DB bootstrap `.tao` files, `validation/data/` grouping, and app-config-driven runtime imports landed.
- **M4:** pipeline query syntax and structured plans landed: `for <Plural>`, `get one <Singular>`, `where`, `order`, `include`, root-prefixed field-path normalization, built-in `id` singleton validation, and Memory/InstantDB execution.

### M4 — Complete: query pipeline and provider execution

The compiler now emits structured `TaoQueryPlan` objects into `TaoDataClient.useLiveQuery` / `peekQuery`, keeping generated call sites short while giving providers enough shape to execute and later validate capabilities.

Landed scope:

- Query sources: `query Data for People [as Alias]`, `query Data get one Person [as Alias]`, with default aliases from plural/singular schema names.
- Pipeline steps: `> where field is expr`, `> where field = expr`, `> where field contains expr [ignoring case]`, `> order field asc/desc`, `> include Relation.Path`.
- Dotted field paths in `where` / `order` / `include`, with root entity prefixes normalized before provider execution.
- `get one` accepts the built-in provider `id` and declared `unique` fields as singleton keys.
- `get one` does not accept uniqueness satisfied only under an `or` branch.
- Memory and InstantDB providers execute the shared query plan without limiting or pagination.

Follow-up polish:

- Add provider capability manifests so unsupported nested ordering, include depth, operators, limiting, and pagination modes fail at compile time.
- Add focused provider/runtime unit coverage around query identity and InstantDB query-shape lowering.
- Revisit limiting/pagination only after the provider capability model can express provider-specific modes.

### Recommended next work

1. **Provider capability validation:** add provider manifests first, then reject unsupported nested ordering, include depth, unsupported operators, limiting, and pagination modes during validation. This gives the target app clearer failures before relationship-heavy work increases the surface area.
2. **M5 conditionals:** implement `if` / `else`, `.isEmpty`, and expression-space `is` / `is not` in views next. The target app needs conditionals before the RSVP flows can feel complete.
3. **M6 updates:** after conditionals, add `update` so RSVP status changes can exercise reads and writes together.
4. **Relationship/provider modeling:** tighten InstantDB relationship/link lowering and decide which nested paths are supported directly versus rejected until denormalized.
5. **Provider environments and secrets:** split admin/runtime provider params so `adminToken` and future secrets do not travel through the app runtime config path.
6. **Runtime coverage:** add provider-level tests for query identity and InstantDB query-shape serialization before adding more app scenarios.

### M5 — `if` / `else` conditionals in views

Test app adds conditionals: `if MyRsvps.isEmpty { ... }`, `if Rsvp.Person is CurrentUser { ... } else { ... }`.

New grammar:

- `if Expression { ... }` and `if Expression { ... } else { ... }` as view statements.
- `is` / `is not` as comparison operators in expression space.
- `.isEmpty` as a property on collections/query results.

Work:

- Grammar rules for `if`/`else`.
- Grammar/expression support for `is`, `is not`, `.isEmpty`.
- Validator: condition is boolean-typed expression.
- Codegen: `if`/`else` → conditional rendering in JSX.
- Formatter handles `if`/`else`.
- Tests: parse, validate, compile conditionals.

### M6 — `update` and additional writes

Test app adds `update` and any extra write patterns needed for the target app: e.g. `SetRsvpStatus`, `CreateRsvp` (if not already covered by M3 `create` shapes).

New grammar:

- `update Entity { field value, ... }` in action bodies (`create` is delivered in M3).

Work:

- Grammar rules for `update`.
- Validator: entity exists, fields match, values type-check; relationship to `create` rules.
- Codegen: `update` → thin `IDB` / `transact` patterns — avoid large per-statement generated blobs.
- Formatter handles `update`.
- Tests: parse, validate, compile `update`; exercise in test app alongside M3 `create`.

### M7 — Staging: relationship-heavy app (not yet the literal target file)

**Intent:** expand the incremental test app **or** add a **sibling** scenario under `Apps/Test Apps/` that mirrors the [target app](./Queries%20MVP%20Target%20App.tao) in **structure**: multiple entities, relationships, RSVPs, host-scoped lists, and **combined** use of M3–M6 (pipeline, conditionals, create/update). **Success:** compiles, runs, and passes headless/Expo checks for that staged app — **without** requiring a byte-for-byte paste of `Queries MVP Target App.tao`.

Work:

- Models and queries matching target relationships (Person, Event, Rsvp, etc.).
- Actions: create/update flows the target demonstrates.
- Compiles and runs against InstantDB (dev app id as in target or unified dev project).
- Headless and/or Expo verification for the expanded scenario.

### M8 — Done: literal target app compiles and runs

**Intent:** the [Queries MVP Target App](./Queries%20MVP%20Target%20App.tao) (or a merged equivalent with the **same** surface area) is the **definition of done** — copy/port into the shipped test harness as appropriate, then freeze.

Work:

- Full target `.tao` compiles and runs end-to-end.
- Target app id `meetup-lite-dev` unless unified with the M2 dev project.
- Verify in headless test runtime and Expo runtime.
- Demonstrates: define schema → query data (including pipeline where required) → mutate data → see updated view.

---

## What already exists (no new work needed)

- `app` declaration, `view`/`action` declarations, parameters, argument binding.
- `state` and `alias` assignments, `set` state updates.
- `do` action invocation (`ActionRender` callee is an `action` declaration), inline `action { ... }` expressions.
- App `on init action { … }` and bootstrap `_taoRunAppInits()` (module-load; no hook in generated shell).
- View rendering with arguments (`Button "text", handler`).
- File-level and in-view raw `query …`; view `guard { … }` with `IDB.isLoading`-driven fallback JSX.
- `for` over list-shaped query aliases; `create Schema.Entity { … }` in actions; `getTaoData().insert` on `MemoryTaoData` / `InstantTaoData`.
- Structured query plans for `for`, `get one`, `where`, `order`, and `include`, with normalized root field paths, built-in `id`, and singleton validation.
- `createTaoDataClient` with per-provider factory registration; nested `app` / `provider` overrides on `TaoSDK_compile` and `tao compile` CLI flags.
- `TaoDataAdmin.pushSchema` with `tao schema push`, `tao compile --push-schema`, and local InstantDB dev-loop schema push. This currently accepts provider admin params such as `adminToken` directly in provider config.
- String templates with `${...}` interpolation, binary ops (`+`).
- `type X is Y` declarations (at top level — data-scoped variant is new).

---

## Risks / open questions

- **`is` keyword overload (M5):** `is` is already used in type declarations (`type X is Y`), parameters (`Title is text`), and M4 `where` comparisons. Reusing it inside general `if` expressions still needs careful grammar disambiguation.
- **Dotted paths in query clauses:** root entity/plural prefixes now normalize correctly, and built-in `id` works as a scalar. Nested relationship ordering is still provider-sensitive; InstantDB should reject, denormalize, or handle it through an explicit provider strategy once capability validation lands.
- **`for` variable shadowing (M3):** `for Event in MyEvents` binds `Event` which may shadow the entity type name from the schema. Scoping rules need to be clear.
- **Legacy `first`:** `get one` is now the singleton path for real queries. `get first` remains compatibility-only and should not be used for fake auth or target-app examples.
- **InstantDB query shape limits:** V1 maps supported top-level `where`, `order`, and `include` to InstaQL. Provider manifests still need to reject unsupported nested order, unsupported operators, unsupported include depth, and any future limiting/pagination assumptions.
- **`create` + list refresh (M3):** ensure query subscriptions or cache invalidation after `transact` so the button-driven flow shows a new row without a full reload.
- **Provider packaging:** providers currently live under `tao-std-lib` for this branch. A later provider-package milestone should move them to `packages/providers/<Provider>/client` and `packages/providers/<Provider>/admin`, each with its own package dependencies so runtime clients do not inherit compile-time admin packages.
- **Provider environments and secrets:** V1 passes admin credentials such as `adminToken` through provider params. The next environment milestone should support multiple named environments, separate provider configs per environment, and encrypted secret provider fields.

---

## References

- [Queries MVP Target App](./Queries%20MVP%20Target%20App.tao) — authoritative MVP target (the app that must compile and run)
- `[TMP_taodev/](../../../TMP_taodev/)` — working reference app for InstantDB wiring (`src/lib/db.ts`, `src/instant.schema.ts`, etc.); not part of the shipped Tao toolchain, but the template for behavior and file responsibilities.
- Std lib (M2/M3.5): `packages/tao-std-lib/tao/data/providers/instantdb/client/instantdb.ts`, `in-memory/client/in-memory.ts`, provider `admin/` folders, and `tao-data-client.ts` — thin provider contracts; only shared/client files are copied under emitted `use/@tao/data/providers/` with the app.
- [Data and Queries - Design](./Process%20Docs/Data%20and%20Queries%20-%20Design.md) — design decisions and deferred forks
- [Runtime - TanStack Query and InstantDB](./Process%20Docs/Runtime%20-%20TanStack%20Query%20and%20InstantDB.md) — InstantDB mapping notes
- `packages/parser/` — Langium grammar
- `packages/compiler/` — validator and codegen
- `packages/headless-test-runtime/` — end-to-end compiled app tests

---
