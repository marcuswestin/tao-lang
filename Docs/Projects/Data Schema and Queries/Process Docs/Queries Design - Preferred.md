# Query Design — Preferred

> **How to read this document**
>
> - This file is the **current preferred** Tao data layer design (what we intend to build toward).
> - **Forks, competing options, and debates** live in **[Query Design - Alternatives.md](./Query%20Design%20-%20Alternatives.md)** — follow links like _→ [Alternatives](…#anchor)_ instead of duplicating them here.
> - **External language prior art** (GraphQL, Prisma, KQL, …): **[Prior Art - Query Languages.md](./Prior%20Art%20-%20Query%20Languages.md)**.
> - **TanStack Query vs InstantDB** execution and bridge details: **[Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md)**.
> - **Target-only example fictions** (not valid Tao today): **[Example App - Target](./Example%20App%20-%20Target/README.md)**.

---

# Tao Data Layer — Design Summary for Implementation

## Purpose

Define a **type-safe, backend-agnostic data layer** in Tao that:

- Models entities and relationships declaratively in a **schema**
- Keeps schemas separate from UI; **views consume typed values produced by queries**
- Binds schemas to **providers** (REST, GraphQL, Supabase, InstantDB, …)
- Maps **schema + queries + data writes** to runtime data systems (e.g. TanStack Query, InstantDB)
- Supports **code generation** (schema + clients + helpers)
- Enables **co-located queries** while supporting reuse — _illustrative intent:_ loading something in the spirit of “`User.Posts` filtered by category with fields `Title`, `Category.Name`” (not proposed syntax; placement/reuse forks → [Alternatives](./Query%20Design%20-%20Alternatives.md#query-placement-and-reuse))

This document is a **design overview**, not a formal spec. Expression-level details (e.g. `where` RHS forms) → [Alternatives](./Query%20Design%20-%20Alternatives.md#query-clauses-and-interpolation).

---

## Core Model

### 1. Schema (declarative source of truth) {#schema}

```tao
data Data {
  type Title is text

  Tasks Task {
    Title
    Completed is boolean default false
    Owner is Person
    Tags [Tag]
  }

  People Person {
    Name is text
    Tasks [Task]
  }

  Tags Tag {
    Name is text
    Tasks [Task]
  }
}
```

**Properties**

- Explicit plural/singular pairing: `Tasks` = collection, `Task` = entity — no implicit pluralization.
- Field syntax aligns with Tao types (`X is Y`).
- Relationships inferred when unambiguous (see [Relationships](#relationships)).
- Schema is **purely declarative** — no imperative backend logic in the schema; execution lives in providers and TypeScript injections.

**Provider binding in app (preferred stance):** An `app` block may include `provider Name { key "value" }` while `data` stays schema-only. Every app has a provider; omitted provider defaults to Memory. Provider key-value pairs are passed through to provider init untyped, and only provider implementations validate their own params. Field metadata (`unique`, `indexed`, `optional`, `default`, cascades) remains schema metadata for codegen/provider use. _Alternatives_ (config only in TS, split files, …) → [Alternatives](./Query%20Design%20-%20Alternatives.md#provider-config-placement).

---

### 2. Providers (backend binding) {#providers}

Providers map:

```text
Schema → Data Access
```

Examples: InstantDB → schema + direct APIs; REST → HTTP; GraphQL → operations; TanStack-shaped stacks → `queryKey` + `queryFn`.

**Principle:** Tao defines types and boundaries; providers define execution. See [Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).

---

### 3. Queries and Data Writes (execution boundary) {#queries-and-writes-boundary}

```text
Schema → Provider → Runtime → Views
```

---

## Query Model {#query-model}

### 3.1 Query shape {#query-shape}

**Preferred:** pipeline-based queries (KQL/LINQ-inspired). _Block-shaped query syntax_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#query-flow-pipeline-vs-block).

```tao
query Data get Tasks as CompletedTasks
  > where Completed is true
  > where Owner is CurrentUser
  > take 10
```

**Characteristics:** pipeline-based, order-dependent, extensible (`select`, `order`, `group`, …).

---

### 3.2 Query semantics {#query-semantics}

- Operate in **Tao expression space** (e.g. `where Owner is CurrentUser`).
- **Preferred:** no string interpolation in `where` — RHS is a normal expression. _`${…}` form_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#query-clauses-and-interpolation).

**Name resolution**

| Name         | Meaning            |
| ------------ | ------------------ |
| `Tasks`      | Local query result |
| `Data.Tasks` | Collection         |
| `Task`       | Entity type        |

---

### 3.3 Query parameters {#query-parameters}

Queries may define parameters:

```tao
query Data get Tasks for Owner Person as UserTasks
  > where Owner is ${Owner}
```

**Model:** parameters are named, typed, in scope for all clauses, bound into Tao expressions.

For query parameter values, we use ${ ... } just the same as in string interpolation

---

### 3.4 Query identity and key derivation {#query-identity}

Each query compiles to a **stable identity**:

```text
queryKey = [ schema, collection, parameters, pipeline steps ]
```

**Requirements:** deterministic, parameter-sensitive, order-sensitive (pipeline).

**Purpose:** feeds the **provider’s runtime library** — e.g. TanStack Query `queryKey` / dedup, InstantDB client subscription and reconciliation — so the same logical query maps to one cached path in that SDK. **Caching itself** is implemented by those libraries (not a separate Tao cache). _Bridge TS patterns_ → [Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).

---

### 3.5 Partial selection / projection {#projections}

**Future direction:**

```tao
> select {
    Title
    Owner {
      Name
    }
  }
```

Produces **derived types**, nested selections, compile-time inference. Phase 1 may stay full-entity; _granularity tradeoffs_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#query-granularity).

---

### 3.6 Async model {#async-model}

#### MVP: `guard` + React Suspense (no generics)

The MVP **does not** introduce `Loadable<T>` or any generic wrapper type. Instead, async data loading is handled transparently via **React Suspense** and Tao's `guard` statement.

**`guard` statement semantics:**

`guard` is a **statement** inside a view, not a wrapper around the view's content. Its body defines the **Suspense fallback**. Everything that appears **below** the `guard` statement in the view is compiled inside a React `<Suspense>` boundary whose `fallback` is the guard body.

```tao
view TodoList {
  query Data get Tasks as AllTasks

  guard { Text "Loading..." }

  Col {
    each AllTasks as Task {
      Text Task.Title
    }
  }
}
```

Compiles conceptually to:

```tsx
<Suspense fallback={<Text>Loading...</Text>}>
  <Col>
    {AllTasks.map(task => <Text>{task.Title}</Text>)}
  </Col>
</Suspense>
```

If any subview below the guard accesses data that has not yet loaded, React suspends rendering and shows the guard's fallback until the data is ready.

**MVP scope and simplifying assumptions:**

- Only the **bare** `guard { … }` form is supported — **no** `guard <state> { … }` conditional variant.
- `guard` appears **once** per view, **before** all render statements. These constraints are assumed but not necessarily validated in MVP.
- `guard` is purely a Suspense boundary; it does not narrow types or match on loading states.
- There is no explicit `loading` / `error` / `ready` state in the Tao type system at this stage — the runtime handles it.

**Future direction:** a richer async model (explicit loadable states, `guard <state> { … }` matching, error boundaries, etc.) may be introduced in a later phase. Prior exploration of `Loadable<T>`, `guard`/`check` ergonomics, and type-level async is deferred — see [Alternatives](./Query%20Design%20-%20Alternatives.md#loadable-vs-guard-and-check), [Type Design - Alternatives](../Type%20System/Type%20Design%20-%20Alternatives.md#value-guards-and-loadable), and the deferred sketch in [Type Implementation - Execution plan](../Type%20System/Type%20Implementation%20-%20Execution%20plan.md#value-guards-async-loading-missing-defer).

---

## Write Model {#write-model}

### 4.1 Data writes via `create` and `update` in actions {#write-statements}

There is **no `mutation` keyword**. Data writes use `create` and `update` statements inside **actions** (event handlers, callbacks, etc.). Their syntax mirrors `set` — they assign field values on a data entity.

**Update (patch-style):**

```tao
action ToggleTodo Task {
  update Task {
    Completed not Task.Completed
  }
}
```

**Create:**

```tao
action AddTodo Owner Person, TodoText text {
  create Data.Tasks {
    Title TodoText
    Owner Owner
  }
}
```

`create` and `update` are **statements**, not top-level declarations. They live wherever imperative logic is allowed (actions, event handlers, etc.).

**MVP scope:** `create` and `update` only. No `delete` in MVP — can be added in a later phase. _Command-style / server-named mutations vs patch-only_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#write-model-command-vs-patch).

---

### 4.2 Coherence after writes {#cache-invalidation}

`create` / `update` must integrate with how the **provider’s client** keeps reads consistent — e.g. TanStack Query invalidation or optimistic updates, InstantDB transactional / sync updates. Tao generates calls that line up with that SDK; **Phase 1:** no Tao-level cache of its own. Explicit invalidation DSL later — [Alternatives](./Query%20Design%20-%20Alternatives.md#cache-invalidation-strategies).

---

## Relationships {#relationships}

- Declared in schema; typed at compile time; executed by providers.
- **Inference (when unambiguous):** bidirectional edges may be inferred from paired collection/entity fields.

**Cardinality hints (compiler inference rules):**

| Pattern     | Interpretation                         |
| ----------- | -------------------------------------- |
| `[A] ↔ [B]` | Many-to-many                           |
| `A ↔ [B]`   | One-to-many (single ref to collection) |
| `A ↔ B`     | Ambiguous → explicit annotation later  |

If multiple relationships exist between the same entities, explicit inverse syntax will be required in a later phase. _Further relationship / loading-strategy options_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#relationship-loading-and-cardinality).

**Execution strategies** (join, batching, multiple queries): **not** encoded in Tao schema text — provider/runtime concern.

---

## Runtime mapping {#runtime-mapping}

```text
Schema
  → Provider binding
  → Generated query layer
  → Provider client library (caching + sync live here)
  → Reactive UI
```

**Caching:** done by the **provider’s runtime/SDK** (TanStack Query’s cache, InstantDB’s client, etc.). Tao’s generated layer invokes those APIs; it does not implement a separate cache.

**Datasource bridge:** Tao generates query structure, stable query identity (for keys / dedup where applicable), and write-call shape; TypeScript supplies `queryFn`, auth, and provider-specific logic — details in [Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).

---

## Reference example app {#reference-example}

Target-only `.tao` fictions (not parseable today) for a minimal **event RSVP** domain live in **[Example App - Target](./Example%20App%20-%20Target/README.md)**. Swap `use Data from ./variants/DataPipeline` vs `DataBlockQuery` to compare pipeline vs block sketches; map variants to [Alternatives](./Query%20Design%20-%20Alternatives.md#query-flow-pipeline-vs-block).

---

## Code generation {#code-generation}

Single unified pipeline targets may include: InstantDB schema, REST/OpenAPI, GraphQL SDL, Supabase schema, runtime helpers.

**Principle:** one schema → many targets.

---

## Authentication {#authentication}

**Expected direction:** session available in expressions (e.g. `CurrentUser`); provider handles tokens/headers; possible schema annotations later. _Open auth/session shapes_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#authentication-and-session).

---

## Declarative vs imperative {#declarative-vs-imperative}

| Layer      | Responsibility              |
| ---------- | --------------------------- |
| Tao        | Structure, types, queries   |
| TypeScript | Execution, auth, edge cases |

---

## Key constraints {#key-constraints}

1. **Provider clients own caching:** TanStack Query, InstantDB SDK, and similar libraries hold query results and invalidation semantics; Tao [§3.4](#query-identity) supplies stable identity so generated code plugs into them cleanly — [Runtime](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).
2. **Query granularity:** Phase 1 full entities; later projections — [Alternatives](./Query%20Design%20-%20Alternatives.md#query-granularity).
3. **No Tao-managed cache:** reads and writes go through the provider runtime; coherence after writes follows that SDK’s patterns ([§4.2](#cache-invalidation)).

---

## Provider capability validation {#provider-capability-validation}

The compiler should verify whether a provider supports a query shape and fail early when unsupported (e.g. REST may not support joins; InstantDB may not support aggregations). _Matrix / examples_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#provider-capability-matrix).

---

## Implementation phases {#implementation-phases}

### Phase 1 — Minimal system (MVP)

- Schema (entities + relationships + `source` + minimal field metadata)
- Codegen targets the app provider through the thin `TaoDataClient` runtime; InstantDB apps import `@instantdb/*`, while omitted providers default to Memory
- Basic queries + `create` / `update` write statements in actions
- View control flow: `for` (iteration), `if`/`else` (conditionals)
- `guard { … }` Suspense boundaries for async data in views (no `Loadable<T>`, no generics)
- Fake auth (`query Data get first Person as CurrentUser`); no session model

### Phase 2 — Runtime datasource interface + REST/TanStack

- **Runtime TS interface:** widen the MVP-thin provider contract into a typed datasource contract (`DataSource<Schema>` or similar) with query, mutate, subscribe methods as additional provider families land.
- Typed query results: map schema entity types through pipeline clauses to output type at the interface boundary.
- REST provider; query → TanStack Query mapping (`queryKey` + `queryFn`); key derivation from [§3.4](#query-identity).
- Basic projections / `select { … }`.
- `Loadable<T>` wrapper type (`loading | error | ready`) or richer `guard` variants — see [§3.6 future direction](#async-model).

### Phase 3 — Broader backends

- GraphQL integration; Supabase adapter; auth conventions

### Phase 4 — Advanced features

- Projection typing; invalidation strategies; relationship loading controls; offline/sync hooks

---

## Summary {#summary}

| Piece             | Role                         |
| ----------------- | ---------------------------- |
| Schema            | Entities and relationships   |
| Queries           | Define data requirements     |
| `create`/`update` | Write data from actions      |
| Providers         | Execute data access          |
| Runtime           | Provider SDK (caching, sync) |
| Views             | Consume typed values         |

**Core invariant:** all data entering views is **fully typed**; async loading is handled by `guard { … }` Suspense boundaries (MVP) with richer explicit-state models deferred to later phases.

---

## Outstanding and deferred (high level) {#outstanding}

Detailed forks for each bullet live in **[Query Design - Alternatives.md](./Query%20Design%20-%20Alternatives.md)** and the checklist in **Outstanding** there.

**Runtime abstraction (MVP-thin, broader surface deferred):** MVP compiles to a small `TaoDataClient` provider interface for Memory and InstantDB. Phase 2 may widen that into a typed `DataSource<Schema>` contract with query/mutate/subscribe methods for REST/TanStack and other providers. See [Phase 2](#implementation-phases).

**Query and language:** aggregation/grouping; ordering semantics; pagination model; further query-reuse vs co-location strategy.

**Writes and data flow:** `delete` statement; multi-step transactions; optimistic updates; dedicated `mutation` keyword / top-level declarations; write return values.

**Schema and modeling:** ID / primary key strategy; full schema metadata system; relationship inverse syntax when ambiguous.

**Runtime and execution:** `Loadable<T>` or richer async model beyond bare `guard`; advanced invalidation DSL; lazy/eager loading controls; offline/sync; conflict resolution.

**Platform and tooling:** authorization (field/row-level); real auth/session model; error semantics; migrations; codegen layout; testing generated code.
