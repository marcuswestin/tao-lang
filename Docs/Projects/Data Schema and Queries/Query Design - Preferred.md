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
- Maps **schema + queries + mutations** to runtime data systems (e.g. TanStack Query, InstantDB)
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
    Title is Title
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

**Provider binding in schema (preferred stance):** A `data` block may include a nested **`source`** (e.g. `source InstantDB { appId "…" }`) plus field metadata (`unique`, `indexed`, `optional`, `default`, cascades) for codegen and provider validation. _Alternatives_ (config only in TS, split files, …) → [Alternatives](./Query%20Design%20-%20Alternatives.md#provider-config-placement).

---

### 2. Providers (backend binding) {#providers}

Providers map:

```text
Schema → Data Access
```

Examples: InstantDB → schema + direct APIs; REST → HTTP; GraphQL → operations; TanStack-shaped stacks → `queryKey` + `queryFn`.

**Principle:** Tao defines types and boundaries; providers define execution. See [Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).

---

### 3. Queries and Mutations (execution boundary) {#queries-and-mutations-boundary}

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
  > where Owner is Owner
```

**Model:** parameters are named, typed, in scope for all clauses, bound into Tao expressions.

---

### 3.4 Query identity and key derivation {#query-identity}

Each query compiles to a **stable identity**:

```text
queryKey = [ schema, collection, parameters, pipeline steps ]
```

**Requirements:** deterministic, parameter-sensitive, order-sensitive (pipeline).

**Purpose:** cache identity (TanStack Query), invalidation targeting, deduplication. _Bridge TS patterns_ → [Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).

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

All queries return **`Loadable<T>`** with states `loading` | `error(err)` | `ready(T)`.

**Principle:** async is **explicit in the type system**. Views handle states before using values.

**Related:** optional `guard`/`check` ergonomics for async and narrowing are **not** finalized here — see [Alternatives](./Query%20Design%20-%20Alternatives.md#loadable-vs-guard-and-check), [Type Design - Alternatives](../Type%20System/Type%20Design%20-%20Alternatives.md#value-guards-and-loadable), and the deferred sketch in [Type Implementation - Execution plan](../Type%20System/Type%20Implementation%20-%20Execution%20plan.md#value-guards-async-loading-missing-defer).

---

## Mutation Model {#mutation-model}

### 4.1 Mutation shape {#mutation-shape}

**Update (patch-style, Phase 1 preferred):**

```tao
mutation ToggleTodo TodoItem Task {
  Data.Tasks.update TodoItem {
    Completed not TodoItem.Completed
  }
}
```

**Create and delete (first-class alongside patch):**

```tao
mutation AddTodo Owner Person, TodoText text {
  Data.Tasks.create {
    Title TodoText
    Owner Owner
  }
}

mutation DeleteTodo TodoItem Task {
  Data.Tasks.delete TodoItem
}
```

**Constraints:** `update` / `delete` targets must be mutation parameters in Phase 1; no arbitrary expressions initially. _Command-style / server-named mutations vs patch-only_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#write-model-command-vs-patch).

---

### 4.2 Mutation return values {#mutation-returns}

Mutations may return `void`, updated entity, or `Loadable<T>` (provider-dependent). **Direction:** default no implicit return; optional explicit return later.

---

### 4.3 Write model {#write-model-summary}

**Preferred Phase 1:** **patch** model (`update` with field expressions). **Command** model (opaque operations) remains possible later — [Alternatives](./Query%20Design%20-%20Alternatives.md#write-model-command-vs-patch).

---

### 4.4 Cache invalidation {#cache-invalidation}

Mutations must map to query invalidation or direct cache updates. **Phase 1:** provider/runtime owns strategy; explicit invalidation DSL later — [Alternatives](./Query%20Design%20-%20Alternatives.md#cache-invalidation-strategies).

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
  → Runtime (TanStack / InstantDB / …)
  → Reactive UI
```

**Datasource bridge:** Tao generates query structure, query identity (`queryKey` shape), and mutation structure; TypeScript supplies `queryFn`, auth, and provider-specific logic — details in [Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).

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

1. **TanStack Query:** schema-agnostic; key-based caching — expand in [Runtime](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).
2. **Query granularity:** Phase 1 full entities; later projections — [Alternatives](./Query%20Design%20-%20Alternatives.md#query-granularity).
3. **Caching:** runtime concern; identity from [§3.4](#query-identity).

---

## Provider capability validation {#provider-capability-validation}

The compiler should verify whether a provider supports a query shape and fail early when unsupported (e.g. REST may not support joins; InstantDB may not support aggregations). _Matrix / examples_ → [Alternatives](./Query%20Design%20-%20Alternatives.md#provider-capability-matrix).

---

## Implementation phases {#implementation-phases}

### Phase 1 — Minimal system

- Schema (entities + relationships + `source` + minimal field metadata)
- InstantDB provider
- Basic queries + mutations (patch + create + delete)
- `Loadable<T>` + view integration

### Phase 2 — REST + TanStack

- REST provider; query → TanStack mapping; parameters; key derivation; basic projections

### Phase 3 — Broader backends

- GraphQL integration; Supabase adapter; auth conventions

### Phase 4 — Advanced features

- Projection typing; invalidation strategies; relationship loading controls; offline/sync hooks

---

## Summary {#summary}

| Piece     | Role                       |
| --------- | -------------------------- |
| Schema    | Entities and relationships |
| Queries   | Define data requirements   |
| Providers | Execute data access        |
| Runtime   | Caching and state          |
| Views     | Consume typed values       |

**Core invariant:** all data entering views is **fully typed** with **explicit async** behavior (`Loadable<T>`).

---

## Outstanding and deferred (high level) {#outstanding}

Detailed forks for each bullet live in **[Query Design - Alternatives.md](./Query%20Design%20-%20Alternatives.md)** and the checklist in **Outstanding** there.

**Query and language:** aggregation/grouping; ordering semantics; pagination model; further query-reuse vs co-location strategy.

**Mutation and data flow:** multi-step transactions; optimistic updates; mutation return standardization.

**Schema and modeling:** ID / primary key strategy; full schema metadata system; relationship inverse syntax when ambiguous.

**Runtime and execution:** advanced invalidation DSL; lazy/eager loading controls; offline/sync; conflict resolution.

**Platform and tooling:** authorization (field/row-level); error semantics; migrations; codegen layout; testing generated code.
