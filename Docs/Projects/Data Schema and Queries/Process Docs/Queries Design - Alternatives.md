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

## Query flow: pipeline vs selection block {#query-flow-pipeline-vs-block}

**Preferred:** selection block (`query Data.Plurals { Field, Relation { Field }, Field > value }`) — [Preferred §3.1](./Queries%20Design%20-%20Preferred.md#query-shape).

| Option                                       | Status       | Notes                                                                  |
| -------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| Selection block `query Data.Tasks { Title }` | `preferred`  | Projects returned shape directly; nested blocks fetch relations.       |
| Legacy pipeline query syntax                 | `superseded` | Removed from the language to avoid a second query surface.             |
| Clause block with `where` entries            | `rejected`   | Same old clause model inside braces; less direct than projection.      |
| Hybrid (allow both)                          | `rejected`   | Parser, formatter, and docs cost without a current compatibility goal. |

**Example app:** swap via `variants/` in [Example App - Target](./Example%20App%20-%20Target/README.md) when added.

---

## Query clauses and interpolation {#query-clauses-and-interpolation}

**Preferred:** field predicates inside selection blocks, for example `Owner = CurrentUser` or `Rating >= 4.5`; RHS is Tao expression space; no `${}` — [Preferred §3.2](./Queries%20Design%20-%20Preferred.md#query-semantics).

| Option                                               | Status      | Notes                                                           |
| ---------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| Expression-only RHS                                  | `preferred` | Aligns with Tao typing; no string holes.                        |
| `${CurrentUser}` / template interpolation in clauses | `deferred`  | Familiar to web devs; complicates parsing and injection safety. |

Open: expression-space identity operators for later non-query conditionals; read queries currently use comparison operators only.

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

Alias-as-source / query-on-query is `deferred`: later restricted desugar only when the compiler can merge the derived query into one provider query.

---

## Query granularity {#query-granularity}

| Option                      | Status       | Notes                                                                 |
| --------------------------- | ------------ | --------------------------------------------------------------------- |
| Selection-block projections | `preferred`  | Query result shape follows selected scalar and relationship entries.  |
| Full entity by default      | `superseded` | Simpler early lowering, but no longer matches current query syntax.   |
| Separate `select { }` block | `rejected`   | Duplicates the current selection block without improving the surface. |

---

## `Loadable` vs `guard` and `check` {#loadable-vs-guard-and-check}

**Preferred:** MVP queries use runtime loading state with `guard`; richer `Loadable<T>` / explicit async states are deferred — [Preferred §3.6](./Queries%20Design%20-%20Preferred.md#async-model).

| Option                                                           | Status      | Notes                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guard { … }` Suspense boundary                                  | `preferred` | MVP path. Queries expose typed values / handles to views, and `guard` supplies the fallback boundary without adding `Loadable<T>`.                                                                                                                                                                                                     |
| `Loadable<T>` only                                               | `deferred`  | Explicit in type system, but not the MVP path.                                                                                                                                                                                                                                                                                         |
| `guard loading { … }` on async parameters (example in test apps) | `deferred`  | Ergonomic; must unify with type system `guard`/`check` — see [Type Design - Alternatives](../../Type%20System/Type%20Design%20-%20Alternatives.md#value-guards-and-loadable) and [Type Implementation - Execution plan](../../Type%20System/Type%20Implementation%20-%20Execution%20plan.md#value-guards-async-loading-missing-defer). |

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

| Capability                | REST              | TanStack           | InstantDB                     | GraphQL (typical) |
| ------------------------- | ----------------- | ------------------ | ----------------------------- | ----------------- |
| Ad hoc joins in one query | often no          | build in `queryFn` | model-dependent               | yes (resolvers)   |
| Aggregations              | endpoint-specific | in `queryFn`       | limited vs SQL                | resolver-defined  |
| Realtime push             | rare              | separate           | yes (Instant)                 | subscriptions     |
| Offset pagination         | endpoint-specific | in `queryFn`       | deferred in Tao V1            | schema-dependent  |
| Cursor pagination         | endpoint-specific | in `queryFn`       | deferred in Tao V1            | common pattern    |
| Nested relationship order | endpoint-specific | in `queryFn`       | reject or denormalize for now | resolver-defined  |

V1 defers compiler enforcement and lets provider implementations accept the structured plan. Later provider manifests should **fail early** when a Preferred query shape exceeds provider support — [Preferred §Provider capability](./Queries%20Design%20-%20Preferred.md#provider-capability-validation).

---

## Strategic bundles {#strategic-bundles}

High-level packages (from former _Query Language Design_). Tao may mix aspects over time; **Preferred** today leans **Bundle C** for reads/writes plus a GraphQL-like selection tree for reads, without committing to full EdgeQL or GraphQL-string passthrough.

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

1. **Tree-shaped reads vs filter-first:** UI trees vs list screens — current read queries choose tree-shaped projection with inline predicates.
2. **One language read+write vs two:** industry often splits; Tao unifies surface but may split semantics by provider.
3. **Pipes in Tao for app devs:** removed for app read queries; full KQL-like analytics language remains `rejected` for the core app layer for now.
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
- `query currentUser = User.get(session.userId)` strawman and pipeline query sketches — **superseded** by named selection-block queries; keep as historical comparison only.
