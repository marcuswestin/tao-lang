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

**Status:** **M1 is complete** (parse, validate, format for `data` blocks; no codegen). **M2 is complete** for the core slice: raw `query` (including **no-`first`** collection form), view `guard`, `data` → **`getTaoData().declareDataset(...)`** + **`getTaoData().open(...)`** (provider params from `app provider`, **Memory** by default), file-level **`peekQuery`** and in-view **`liveQuery`**, guard driven by per-query loading state, codegen + std lib + [`Apps/Test Apps/Data Schema`](../../../Apps/Test%20Apps/Data%20Schema/) as the primary incremental app. **Real InstantDB** runs in **Expo** (Metro) when the app provider is `InstantDB`. **M3 is complete** in toolchain + Data Schema app: **`for`** over list queries, **`create`** in actions, **`getTaoData().insert`**, parser/validator/formatter/codegen tests; **[`scenario.json`](../../../Apps/Test%20Apps/Data%20Schema/scenario.json)** asserts **Create Event** → **New Event 1**. **Harness:** scenarios can pass nested app overrides such as `{ "provider": { "name": "Memory" } }` or `{ "provider": { "appId": "test-db" } }` through `TaoSDK_compile` (and **`tao compile`** via `--app` / `--app.provider.*` flags); generated memory apps import only the Memory provider registration, while Instant apps import `instantdb/instantdb.ts` / `@instantdb/react-native`. Expo Jest shared scenarios still **allow-list** only **Simple test render** so CI does not pull Instant into that path. **M3.5 is complete:** `createTaoDataClient` + provider registration, trimmed redundant schema-name args on **`TaoDataClient`**, removal of legacy **`DbBootstrap` / `InstantDbBootstrap`** `.tao`, validators grouped under [`validation/data/`](../../../packages/compiler/compiler-src/validation/data/), **`app-config`**-driven import/runtime codegen (dropped `tao-runtime-bootstrap-path.ts`). **Prep/build ergonomics:** root **`dprint`** fmt/check runs with **`--incremental=false`**; **`sort-package-json`** uses a repo **`TMPDIR`**; **`_build_all`** runs the IDE extension **`build`** (package only, no local install). **Next:** **M4** (pipeline queries, dotted paths), **M5** (`if`/`else`), **M6** (`update`), **M7** staging app, **M8** literal target app.

**M2 follow-ups (optional):** richer scenario assertions everywhere harnesses support Instant; dedicated codegen test files; tighter TS for query row / `for` bindings; subscribe or lazy-bind file-level **`peekQuery`** so aliases stay fresh after `open` (today **`InstantTaoData.peekQuery`** uses the reactor snapshot without subscribing — fine for fields omitted from `create` until relations ship).

### M1 — Schema: `data` block (grammar + validation + formatter) — **done**

Incremental test app: [`Apps/Test Apps/Data Schema/Data Schema.tao`](../../../Apps/Test%20Apps/Data%20Schema/Data%20Schema.tao) (minimal UI + full `data MeetupData { ... }` shape).

Test app starts with just the `data MeetupData { ... }` block.

New grammar constructs:

- `data Name { ... }` top-level declaration.
- `provider Provider { key "value" }` inside the app block; omitted provider defaults to Memory.
- `type Name is base` inside data block (data-scoped type alias).
- Entity declarations: `Plural Singular { fields... }`.
- Field types: `text`, `number`, named type refs, `[Entity]` (to-many).
- Field metadata: `optional`, `unique`, `default expr`.
- Shorthand fields: `Event,` (name = type, no explicit type).

Work:

- [x] Grammar rules for `data` block and all sub-constructs.
- [x] Parser generation (`./agent gen`) produces AST nodes.
- [x] Validator: entity references resolve, relationships consistent (cardinality inference per [Preferred §Relationships](./Process%20Docs/Queries%20Design%20-%20Preferred.md#relationships)), field types resolve, duplicate entity/field checks.
- [x] Formatter handles `data` blocks.
- [x] Tests: parser round-trip, validation happy/sad paths.

No codegen yet — just parse, validate, format.

### M2 — Raw queries + `guard` + InstantDB end-to-end — **done** (core)

**Goal:** first **running** InstantDB-backed Tao app: schema + **raw** queries (no `where`, `order`, `take`, or dotted paths in queries) + `guard`, compiled and verified in a real runtime (Expo and/or headless test runtime).

**Reference app (manual porting / shape):** repo [`TMP_taodev/`](../../../TMP_taodev/) — use as the working example for wiring InstantDB in a small app: e.g. [`TMP_taodev/src/lib/db.ts`](../../../TMP_taodev/src/lib/db.ts), [`TMP_taodev/src/instant.schema.ts`](../../../TMP_taodev/src/instant.schema.ts), app bootstrap. Tao codegen should converge on the same responsibilities (`init` + schema, **`useQuery`** in views) without copying the Next.js app structure verbatim; Tao centralizes that in **`InstantTaoData`** + generated **`getTaoData()`** calls.

**Development InstantDB app id:** use `9faf89c0-c15c-49b4-bf3f-3b5b2cd9a19f` in the incremental test app’s `app ... { provider InstantDB { appId "…" } }` so local runs hit a known dev project (distinct from `meetup-lite-dev` in the target `.tao` until final integration).

Incremental [Data Schema test app](../../../Apps/Test%20Apps/Data%20Schema/Data%20Schema.tao) today includes:

- `provider InstantDB { appId "9faf89c0-c15c-49b4-bf3f-3b5b2cd9a19f" }` on `app DataSchemaApp`.
- File-level queries: `query MeetupData get first Person as CurrentUser` and `query MeetupData get Event as MyEvents` (singular entity ref; no pipeline).
- `app … { provider InstantDB { ... }; ui RootView }`; providers open from compiled `_taoRunAppInits`, so no bootstrap Tao action is needed.
- Root view with `guard { Text "Loading..." }` then main UI. Headless [`scenario.json`](../../../Apps/Test%20Apps/Data%20Schema/scenario.json) asserts **“Loading…”** where the stub keeps queries loading-shaped, and (with **Memory** + list/`create` wired) **Create Event** / **New Event** text for the M3 create path.

New grammar (M2 only):

- `query Schema get Entity as Alias` with optional `first` before `Entity`.
- **No** query pipeline (`>` steps), **no** dotted field paths inside queries.
- `guard { ... }` in views (bare form only).
- App lifecycle: `on init` with `action { … }` body (today **only** `init` is validated); `do ActionName` uses `ActionRender` (`action` cross-ref, not `view`).

**Runtime std lib (hand-written, not generated):**

- [`tao-data-client.ts`](../../../packages/tao-std-lib/tao/data/providers/tao-data-client.ts) — `TaoDataClient`, `getTaoData` / `setTaoData`, init params (`instantdb` | `memory`).
- [`in-memory.ts`](../../../packages/tao-std-lib/tao/data/providers/in-memory/in-memory.ts) / [`instantdb.ts`](../../../packages/tao-std-lib/tao/data/providers/instantdb/instantdb.ts) — `MemoryTaoData` / `InstantTaoData` (Instant pulls `@instantdb/react-native`; **not** re-exported from `tao-data-client` so memory-only bundles skip loading it).
- **Generated code stays short:** `setTaoData(createTaoDataClient(...))`, `declareDataset`, `_Scope.Alias = getTaoData().peekQuery|liveQuery(…)`, per-query `isLoading` checks for guards, `_taoRunAppInits()` calls `getTaoData().open(providerParams)`.
- **Harness compile override:** `TaoSDK_compile` / `compileTao` accept optional nested **`app`** config overrides (CLI: `--app provider.appId=value` or `--app.provider.appId=value`) so tests can select provider and database without changing Tao source.

Work:

- [x] Grammar rules for raw `query` (`first`, `as`); **no** `>` pipeline in this milestone.
- [x] Grammar rule for `guard { ... }`; app `on init` + `AppUiStatement` / `OnStatement` split.
- [x] Validator: entities exist on the named schema; query placement; duplicate names; `first` / collection shape; `on` event = `init` only; guard only under views.
- [x] Formatter handles raw queries, `guard`, and app `on` / `do` surfaces.
- [x] Codegen: `data` → `getTaoData().declareDataset` (primitive field map for entities).
- [x] Codegen: file-level `query` → `getTaoData().peekQuery`; in-view `query` → `getTaoData().liveQuery`.
- [x] Codegen: `guard` → early `if` on query-result `isLoading` checks for in-view queries, with JSX fallback — not React `<Suspense>` in the MVP path.
- [x] Query results: `{ data, isLoading, error }`; headless scenarios use **Memory** provider via app overrides/defaults so CI does not load Instant unless explicitly requested.
- [x] Headless: [`./agent headless-test-runtime test`](../../../packages/headless-test-runtime/) includes the Data Schema scenario; full [`./agent test`](../../../AGENTS.md) runs compiler + headless + expo-runtime harnesses.
- [ ] Optional polish: assert post-load UI text once non-stub data is wired; add focused parser/validation/codegen test files named in the original M2 checklist; tighten types for query aliases (`CurrentUser.Name`, etc.).

### M3 — List queries + `for` + `create` (button adds events) — **done**

**Goal:** the Data Schema test app lists **all** events and has a **button** that runs a **`create`** mutation; each tap **appends** an event and the **`for`** loop shows the updated list end-to-end (codegen + `IDB` + runtime), with headless scenario coverage where feasible.

**Relationship to M2:** M2 already documents a **collection** raw query (`query MeetupData get Event as MyEvents` — no `first`) and validates `first` vs collection shape. M3 does **not** invent new query surface syntax for “all rows”; it **tightens** list-shaped results for views (`IDB` + types), adds **`for`**, **`create`**, and stub/real data paths so lists are **iterable** in JSX and CI assertions can see rows.

Incremental test app shape (illustrative — keep the **MyEvents** alias to match M2):

- Reuse or refine file- / view-level `query MeetupData get Event as MyEvents` so the alias is consistently **list-shaped** in validator, codegen, and runtime (`peekQuery` / `useQuery` return data the emitter can `.map` over).
- Root UI: `for Event in MyEvents { … }` rendering each row (minimal row UI is fine — e.g. title text or stable test id).
- A `Button` (or equivalent) whose handler invokes an action containing **`create MeetupData.Event { … }`** with enough fields to satisfy validation; after success, list refresh follows the same query subscription path as M2 `useQuery`.

New grammar / surfaces (this milestone only):

- **`for Binding in Collection { ... }`** as a view statement — `Collection` is a query alias (or expression) that resolves to an array-like / list-shaped query result.
- **`create Schema.Entity { field value, ... }`** in action bodies only.

**Semantics carried forward from M2 (tightened in M3):** `query Schema get Entity as Alias` **without** `first` must be **safe to iterate** in `for` and have correct **element types** for the binding.

Explicitly **not** in M3:

- Query pipeline (`> where` / `> order` / `> take`) or dotted paths inside queries — **M4**.
- **`update`** — **M6**.

Work:

- [x] Grammar: `for` view statement; `create` in actions; only adjust raw `query` grammar/AST if `first` vs omission needs clarification for downstream typing.
- [x] Validator: `for` binding scope; list type for `in`; `create` entity/field existence and value types; action-only placement for `create`; align list vs singleton query aliases with `for` and `create` refresh.
- [x] Codegen: `for` → `.map((binding) => …)` in JSX; `create` → thin `IDB` / `transact` wrapper; ensure collection aliases emit list-shaped reads consistent with M2 call sites.
- [x] Formatter: `for`, `create` (collection queries unchanged if grammar unchanged).
- [x] Tests: parser, validation, codegen; extend [`Data Schema.tao`](../../../Apps/Test%20Apps/Data%20Schema/Data%20Schema.tao) + [`scenario.json`](../../../Apps/Test%20Apps/Data%20Schema/scenario.json) so **one** `create` runs and assertions see **N+1** rows (or visible new content). **Headless:** prefer real button press / harness action if the headless runtime supports it; otherwise call the same `create` path from **`on init`** (e.g. second init action or a dev-only branch) so CI still proves list growth without implying tap simulation exists yet.
- [ ] Optional: richer headless assertions once stub/real `IDB` returns stable list data in CI.

### M3.5 — Milestone spike: architectural pause before M4 — **done**

**Intent:** M1–M3 are done; M4 (`>` pipeline + dotted paths), M5 (`if`/`else`), M6 (`update`), and M7–M8 (target app) are next. Pipeline work will roughly **double** surface area across grammar, validation, codegen, and both providers — whatever asymmetry or duplication exists now will **calcify**. This spike is **not** new user-facing syntax: preserve M3 behavior while taking only structural wins that pay back **before** M4 lands.

**Leave alone:** the small **`TaoDataClient`** surface; app-level provider overrides as the harness seam; validator **split-by-concern** (this spike only **groups** files); **`compileNode` / `refResolved`** codegen idioms.

**In scope (do before M4):**

- [x] **Factory:** add `createTaoDataClient(providerName)` in std-lib; provider modules register factories, and codegen imports one provider registration path based on app provider selection.
- [x] **Trim redundant schema-name argument** on `TaoDataClient` methods where it duplicates `getTaoData(name)` — `peekQuery(collection, opts)` / `useLiveQuery(collection, opts)` / `insert(collection, record)` / `declareDataset(shape)` / `isBusy()`.
- [x] **Remove legacy bootstrap `.tao`** after confirming no shipped `use …` / `do InitDb` / `OpenDb` paths remain.
- [x] **Group data/query validators:** move `DataSchemaValidator.ts`, `ForCreateValidator.ts`, and `QueryGuardOnValidator.ts` into [`validation/data/`](../../../packages/compiler/compiler-src/validation/data/) with a thin barrel; register from [`tao-lang-validator.ts`](../../../packages/compiler/compiler-src/validation/tao-lang-validator.ts) so M4/M6 validators (`pipeline`, `update`) have an obvious home.

**Explicitly defer (revisit after M4 has real dual-provider pipeline behavior):**

- Promote query options from `{ first: boolean }` to a **`mode: 'one' | 'many'`** (and room for `take` / pipeline) — **end of M4** when call sites are exercised.
- **Provider capability registry** keyed by `source` — **defer** until at least one pipeline clause is implemented on **both** Memory and Instant (avoid speculative registries).
- **Move `evaluateRecordFields`** out of the interface module — minor cleanup when convenient.

**Verification:** `./agent prep-commit`; `./agent headless-test-runtime test` (Data Schema scenario); `./agent expo-runtime test`; manual Expo on Data Schema (Create Event still appends); diff generated Data Schema output before/after (smaller snippets, single provider import where applicable).

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
- [Query Design - Preferred](./Process%20Docs/Queries%20Design%20-%20Preferred.md) — design decisions
- [Query Design - Alternatives](./Process%20Docs/Queries%20Design%20-%20Alternatives.md) — deferred forks
- [Runtime - TanStack Query and InstantDB](./Process%20Docs/Runtime%20-%20TanStack%20Query%20and%20InstantDB.md) — InstantDB mapping notes
- `packages/parser/` — Langium grammar
- `packages/compiler/` — validator and codegen
- `packages/headless-test-runtime/` — end-to-end compiled app tests

---

## Maintaining this document

Keep this plan **current** whenever Data Schema / Queries MVP work lands (same PR when practical, or an immediate doc follow-up).

- **New information:** Update the **Summary / Status** paragraph, the milestone sections that changed, file links, test-app paths, and **Risks / open questions** when behavior, grammar, harness flags, app provider overrides, or providers (`InstantTaoData`, `MemoryTaoData`) shift. Prefer one coherent narrative here over scattering “done” notes only in chat or `TODO.md`.
- **Completions:** When a milestone or a major slice closes, mark the relevant checklist items `[x]` **in the milestone section**, and add a **dated line under Completed log** below (what shipped; optional pointer to PR or commit). The Status paragraph, inline checklists, and Completed log must **not contradict** each other.

## Completed log

Append-only (newest entry first). Example line shape: `- **YYYY-MM-DD — M*n*:** short note on what completed.`

- **2026-05-01 — M3 + M3.5:** Shipped **`for`** / **`create`** end-to-end (grammar, validators under **`validation/data/`**, formatter, **`app-config`** codegen and provider imports, compiler tests including bindings). Std-lib **`createTaoDataClient`**, trimmed **`TaoDataClient`** signatures, removed **`DbBootstrap.tao`** / **`InstantDbBootstrap.tao`**. **`TaoSDK_compile`** / **`TaoBunSdk`** and **`tao` CLI** nested **`--app`** overrides. **`AGENTS.md`** note on trivial helpers; **`ide-extension`** default **`build`** without local install; shared **`dprint --incremental=false`**, repo **`TMPDIR`** for **`sort-package-json`**, **`_build_all`** extension step uses package build only. Process docs and Data Schema scenario landed in prior commits on this branch; this commit syncs the plan only.
