# Queries Design — Alternatives

> **How to read this document**
>
> - This file tracks **forks, rejected options, and open questions** for the Tao data layer. It does **not** restate external language surveys — see **[Prior Art - Query Languages.md](./Prior%20Art%20-%20Query%20Languages.md)**.
> - The **current preferred** choices live in **[Queries Design - Preferred.md](./Queries%20Design%20-%20Preferred.md)**. Each section below links back to the matching anchor in Preferred where applicable.

**Status legend:** `preferred` (matches Preferred doc today) · `deferred` · `rejected` · `open` · `superseded`

---

## Index (anchors for deep links)

| Topic                                | Anchor                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Query flow: pipeline vs block        | [#query-flow-pipeline-vs-block](#query-flow-pipeline-vs-block)                 |
| Query clauses / interpolation        | [#query-clauses-and-interpolation](#query-clauses-and-interpolation)           |
| Provider config placement            | [#provider-config-placement](#provider-config-placement)                       |
| Query placement and reuse            | [#query-placement-and-reuse](#query-placement-and-reuse)                       |
| Query granularity                    | [#query-granularity](#query-granularity)                                       |
| `Loadable` vs `guard` / `check`      | [#loadable-vs-guard-and-check](#loadable-vs-guard-and-check)                   |
| Write model: command vs patch        | [#write-model-command-vs-patch](#write-model-command-vs-patch)                 |
| Cache invalidation strategies        | [#cache-invalidation-strategies](#cache-invalidation-strategies)               |
| Relationship loading and cardinality | [#relationship-loading-and-cardinality](#relationship-loading-and-cardinality) |
| Authentication and session           | [#authentication-and-session](#authentication-and-session)                     |
| Provider capability matrix           | [#provider-capability-matrix](#provider-capability-matrix)                     |
| Strategic bundles (A–D)              | [#strategic-bundles](#strategic-bundles)                                       |
| Open questions checklist             | [#open-questions-checklist](#open-questions-checklist)                         |

---

## Query flow: pipeline vs block {#query-flow-pipeline-vs-block}

**Preferred:** pipeline (`>` steps) — [Preferred §3.1](./Queries%20Design%20-%20Preferred.md#query-shape).

| Option                                                     | Status      | Notes                                                           |
| ---------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| Pipeline `query Data get Tasks` + `> where …` + `> take N` | `preferred` | Order-sensitive; maps to execution pipeline; KQL/LINQ-inspired. |
| Block `query Data get Tasks { where … take N }`            | `deferred`  | Same semantics, different surface; ergonomics TBD.              |
| Hybrid (allow both)                                        | `open`      | Parser + formatter cost; style guide needed.                    |

**Example app:** swap via `variants/` in [Example App - Target](./Example%20App%20-%20Target/README.md) when added.

---

## Query clauses and interpolation {#query-clauses-and-interpolation}

**Preferred:** `where Owner is CurrentUser` — RHS is Tao expression space; no `${}` — [Preferred §3.2](./Queries%20Design%20-%20Preferred.md#query-semantics).

| Option                                               | Status      | Notes                                                           |
| ---------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| Expression-only RHS                                  | `preferred` | Aligns with Tao typing; no string holes.                        |
| `${CurrentUser}` / template interpolation in clauses | `deferred`  | Familiar to web devs; complicates parsing and injection safety. |

Open: identifier vs keyword disambiguation in clause heads.

---

## Provider config placement {#provider-config-placement}

**Preferred:** `provider Provider { … }` inside `app`; omitted provider defaults to Memory. Provider params pass through untyped and are validated only by the provider implementation — [Preferred §1 Schema](./Queries%20Design%20-%20Preferred.md#schema).

| Option                                                 | Status       | Notes                                                |
| ------------------------------------------------------ | ------------ | ---------------------------------------------------- |
| `provider` inside `app` block                          | `preferred`  | App runtime concern; keeps `data` schema-only.       |
| `source` inside `data` block                           | `superseded` | Matched early InstantDB sketches but overfit schema. |
| Provider config only in TS / sidecar JSON              | `deferred`   | Keeps Tao schema pure; more drift risk.              |
| Separate top-level `provider` block referencing `data` | `open`       | Clear separation; two places to edit.                |

---

## Query placement and reuse {#query-placement-and-reuse}

Illustrative intent (not syntax): “load `User.Posts` filtered by category with fields `Title`, `Category.Name`, `Comments.Author.Name`.”

| Option                               | Status            | Notes                                             |
| ------------------------------------ | ----------------- | ------------------------------------------------- |
| Co-located queries in views          | `preferred`       | Early Tao likely declares queries near consumers. |
| Shared named queries in module scope | `preferred`       | Reuse across views; stable query identity.        |
| Catalog-only (no inline)             | `rejected` for v1 | Too heavy for small apps.                         |

---

## Query granularity {#query-granularity}

| Option                     | Status      | Notes                                           |
| -------------------------- | ----------- | ----------------------------------------------- |
| Full entity in Phase 1     | `preferred` | Simplest provider lowering.                     |
| Projections / `select { }` | `deferred`  | Better payload size; typing for derived shapes. |
| Hybrid                     | `open`      | Per-query or per-field defaults.                |

---

## `Loadable` vs `guard` and `check` {#loadable-vs-guard-and-check}

**Preferred:** MVP queries use runtime loading state with `guard`; richer `Loadable<T>` / explicit async states are deferred — [Preferred §3.6](./Queries%20Design%20-%20Preferred.md#async-model).

| Option                                                           | Status     | Notes                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Loadable<T>` only                                               | `deferred` | Explicit in type system, but not the MVP path.                                                                                                                                                                                                                                                                                         |
| `guard loading { … }` on async parameters (example in test apps) | `deferred` | Ergonomic; must unify with type system `guard`/`check` — see [Type Design - Alternatives](../../Type%20System/Type%20Design%20-%20Alternatives.md#value-guards-and-loadable) and [Type Implementation - Execution plan](../../Type%20System/Type%20Implementation%20-%20Execution%20plan.md#value-guards-async-loading-missing-defer). |
| Automatic suspense-style without types                           | `rejected` | Violates explicit async principle.                                                                                                                                                                                                                                                                                                     |

---

## Write model: command vs patch {#write-model-command-vs-patch}

**Preferred Phase 1:** patch-style `update` — [Preferred §4](./Queries%20Design%20-%20Preferred.md#mutation-model).

| Option                                                       | Status      | Notes                                             |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------- |
| Patch / graph updates (`Data.Tasks.update …`)                | `preferred` | Maps well to Instant-style transactions.          |
| Server-named commands only (`mutation ArchiveTodo …` opaque) | `deferred`  | GraphQL/RPC interop; authority at server.         |
| Both (provider profile)                                      | `open`      | Type system must express capability per provider. |

Related **strategic bundles** below (especially **Bundle A** vs **Bundle C**).

---

## Cache invalidation strategies {#cache-invalidation-strategies}

| Option                             | Status      | Notes                                                                       |
| ---------------------------------- | ----------- | --------------------------------------------------------------------------- |
| Provider/runtime default (Phase 1) | `preferred` | [Preferred §4.4](./Queries%20Design%20-%20Preferred.md#cache-invalidation). |
| Automatic by touched collections   | `deferred`  | Needs dependency graph.                                                     |
| Explicit Tao invalidation DSL      | `deferred`  | Power + spec cost.                                                          |

---

## Relationship loading and cardinality {#relationship-loading-and-cardinality}

**Preferred:** inference rules in [Preferred §Relationships](./Queries%20Design%20-%20Preferred.md#relationships); Tao does not encode join vs batch strategy.

| Option                              | Status      | Notes                                   |
| ----------------------------------- | ----------- | --------------------------------------- |
| Provider decides join / batch / N+1 | `preferred` | Keeps schema portable.                  |
| Per-query eager/lazy hints          | `deferred`  | Needs syntax + validation per provider. |
| Always eager                        | `rejected`  | Too blunt.                              |

Further cardinality edge cases (multiple edges between same types): explicit inverse syntax — `open` (later phase).

---

## Authentication and session {#authentication-and-session}

| Option                                    | Status      | Notes                           |
| ----------------------------------------- | ----------- | ------------------------------- |
| `CurrentUser` in expression space         | `preferred` | Sketch in Preferred.            |
| `session { User Person }` companion block | `deferred`  | See Tao Language Design sketch. |
| Provider-only (no Tao session)            | `deferred`  | TanStack-only apps.             |

---

## Provider capability matrix {#provider-capability-matrix}

Illustrative rows (extend as providers land):

| Capability                | REST              | TanStack           | InstantDB       | GraphQL (typical) |
| ------------------------- | ----------------- | ------------------ | --------------- | ----------------- |
| Ad hoc joins in one query | often no          | build in `queryFn` | model-dependent | yes (resolvers)   |
| Aggregations              | endpoint-specific | in `queryFn`       | limited vs SQL  | resolver-defined  |
| Realtime push             | rare              | separate           | yes (Instant)   | subscriptions     |

Compiler should **fail early** when a Preferred query shape exceeds provider support — [Preferred §Provider capability](./Queries%20Design%20-%20Preferred.md#provider-capability-validation).

---

## Strategic bundles {#strategic-bundles}

High-level packages (from former _Query Language Design_). Tao may mix aspects over time; **Preferred** today leans **Bundle C** for reads/writes + **pipeline** surface, without committing to full EdgeQL or GraphQL-string passthrough.

### Bundle A — GraphQL-shaped reads + named server mutations

- **Reads:** nested selection + arguments.
- **Writes:** server-named mutations.
- **Pros:** authorization boundaries; interop.
- **Cons:** second path for Instant-style client writes unless dual model.
- **Status:** `deferred` (command leg aligns here).

### Bundle B — Relational core in Tao (EdgeQL-lite) + lowering

- **Pros:** one algebra; expressive.
- **Cons:** Tao owns semantics forever.
- **Status:** `rejected` as full v1 scope; pieces may inform expressions.

### Bundle C — Named queries + typed params; writes as patches

- **Pros:** matches stable `queryKey` + `queryFn`; phased growth.
- **Cons:** power users may lean on TS escape hatches.
- **Status:** `preferred` (closest to [Preferred](./Queries%20Design%20-%20Preferred.md)).

### Bundle D — Tao intent; TS is the real query language

- **Pros:** fastest to ship.
- **Cons:** two sources of truth unless codegen is airtight.
- **Status:** `open` (escape hatch always exists; how much is _policy_ TBD).

### Debates (thesis / antithesis)

1. **Tree-shaped reads vs filter-first:** UI trees vs list screens — both partially satisfied by pipeline + future `select { }`.
2. **One language read+write vs two:** industry often splits; Tao unifies surface but may split semantics by provider.
3. **Pipes in Tao for app devs:** `preferred` lightly (pipeline queries); full KQL-like analytics language — `rejected` for core app layer for now.
4. **Client-defined writes vs server-named:** provider-dependent; both rows above.

---

## Open questions checklist {#open-questions-checklist}

Carry forward until answered in **Preferred** or resolved here with status:

1. **Primary backend for v1:** InstantDB vs REST-first vs TS-only bridge?
2. **Read power day one:** named queries + safe subset only, or richer relational core?
3. **Writes:** confirm patch-first only for Phase 1 release gate, or dual command path?
4. **Nesting depth assumptions** for projection design (2–3 levels vs arbitrary).
5. **Graph-native data** in Tao near term, or FK-shaped only?
6. **Compile-time strictness** vs runtime escape hatches (policy).
7. **Two read notations** long-term acceptable (CRUD pipeline vs analytics SQL/KQL module)?

---

## Schema tags / metadata (extended checklist) {#schema-tags-extended}

Deferred detail from former spec drafts — promote to Preferred when decided:

- `unique`, `indexed`, `optional`, `default`, relationship metadata, cascade rules, ID/primary key strategy, provider-specific extensions, validation rules per provider.

---

## Datasource bridge (open questions) {#datasource-bridge-open}

See **[Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md)** for the `createCollection` / `useQuery` sketch.

Open: what is auto-generated vs hand-written; exact `queryKey` derivation; mutation → invalidation wiring; how much TS escape hatch is idiomatic.

---

## Scratch / superseded sketches

- Legacy `entity User { id: ID … }` / `schema TODOs { model … }` blocks from early working papers — **superseded** by `Tasks Task` + `X is Y` in [Preferred](./Queries%20Design%20-%20Preferred.md#schema).
- `query currentUser = User.get(session.userId)` strawman — **superseded** by named `query` + pipeline direction; keep as historical comparison only.
