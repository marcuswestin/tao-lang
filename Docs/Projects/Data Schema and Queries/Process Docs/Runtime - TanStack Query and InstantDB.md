# Runtime — TanStack Query and InstantDB

Companion to **[Data and Queries - Design.md](./Data%20and%20Queries%20-%20Design.md)**. Execution details and **why** the datasource bridge splits Tao vs TypeScript.

---

## TanStack Query (and TanStack DB-style collections)

- **Schema-agnostic:** TanStack Query does not know about Tao entities; it only sees **`queryKey` + `queryFn`** (and related options).
- **Caching:** identity is **key-based**. There is no per-field GraphQL-style resolver unless you build that layer in `queryFn` or a meta-framework.
- **Auth:** bring-your-own — tokens, headers, and session live in TS injections or shared runtime, not in the query cache layer itself.

TanStack DB / `createCollection`-style APIs bundle schema-ish typing **in TypeScript** with sync handlers (`onInsert`, …). Tao’s direction is the inverse for **authoritative** shape: **Tao schema + queries** compile toward keys and fn hooks; TS fills execution.

### Datasource bridge sketch

How Tao concepts may lower toward a TanStack-shaped runtime (conceptual names only):

```ts
createCollection({
  queryKey: ['todos'],
  queryFn: async () => fetch('/api/todos').then((r) => r.json()),
  getKey: (item) => item.id,
})
```

Or classic `useQuery`:

```ts
useQuery({
  queryKey: ['User', session.userId],
  queryFn: () => fetchUser(session.userId),
})
```

**Tao generates (design intent):** a structured `TaoQueryPlan`, **stable `queryKey` materialization** from [Data and Queries - Design §3.4](./Data%20and%20Queries%20-%20Design.md#query-identity), mutation structure for invalidation hooks.

**TypeScript provides:** `queryFn`, transport, auth, provider-specific edge cases — see [Data and Queries - Design — Declarative vs imperative](./Data%20and%20Queries%20-%20Design.md#declarative-vs-imperative).

Open questions (also listed in [Data and Queries - Design — Outstanding and deferred](./Data%20and%20Queries%20-%20Design.md#outstanding)): auto-generated vs hand-authored portions; mutation → invalidation mapping; how much dynamic shaping stays in TS by policy.

---

## InstantDB

- **Schema + client:** InstantDB expects an app schema (often TS `i.schema`) and client APIs (`find`, `transact`, …).
- **Auth / permissions:** Instant’s ecosystem may model rules alongside schema to varying degrees — specifics remain provider-version dependent.
- **Realtime:** subscriptions are a native strength; Tao provider layer should map reactive UI expectations without re-specifying wire protocol in Tao source.

**Rough mapping from Tao:**

- Tao `data` + app-level `provider InstantDB { … }` → generated InstantDB schema + thin wrappers.
- Tao queries → structured `TaoQueryPlan` values passed through `TaoDataClient.useLiveQuery` / `peekQuery`; the Instant provider pushes scalar root predicates to InstaQL `where` when they are not `clientOnly`, then applies **all** predicates (including relationship identity), nested filters, and the selection projection in JS on the returned rows.
- Tao writes (`create` / `update`) → `transact` / update patterns, plus provider-driven invalidation or sync.

### Current V1 provider behavior

- `id` is treated as the provider row id and can be queried without being declared as a Tao field.
- Query field paths are normalized before execution: root prefixes such as `Person.Email` / `People.Email` become `Email`, while nested relationship paths remain explicit.
- Memory applies the structured plan in-process. InstantDB V1 treats Tao relationships as `any` attributes (not link edges), so nested shape is not sent as an InstaQL include tree. Scalar predicates that are not `clientOnly` become InstaQL `where`; relationship identity predicates are `clientOnly` and run only in JS. The client then evaluates **every** root `where` entry, filters nested relationship `where` inside the selection tree, and projects. If **all** root predicates are `clientOnly`, InstaQL has no top-level `where` and the SDK may return **every row in that collection** before JS filtering, which is acceptable for dev-sized data but not a long-term large-table strategy.
- One direct scalar `order by` per query block is implemented for Memory and InstantDB. Limiting and pagination are intentionally not implemented in V1; they need a provider-capability design before Tao commits to a portable query-plan shape.

Current limits: limiting/pagination, provider-specific ordering modes, provider capability manifests, and strict compile-time rejection of provider-specific gaps are still deferred. Nested relationship loading is provider-sensitive and should be rejected, denormalized, or handled by a provider-specific strategy before deeper traversal is treated as generally portable.

---

## Relationship loading and caching (runtime view)

- **How** edges resolve (join vs batch vs N+1) is **provider- and strategy-dependent** — Tao schema does not encode loading strategy ([Data and Queries - Design — Relationships](./Data%20and%20Queries%20-%20Design.md#relationships)).
- **Caching** is delegated to TanStack Query, Instant client, or other stacks — Tao does not reinvent cache internals unless a future invalidation DSL lands ([Data and Queries - Design — Outstanding and deferred](./Data%20and%20Queries%20-%20Design.md#outstanding)).

---

## Reactive UI stacks (mention only)

Apps may combine Legend State, TanStack Query, Instant subscriptions, React Suspense, etc. Exact composition is **per-app runtime** choice; Tao’s MVP contract is **typed query values and query handles** crossing the view boundary, with loading handled by `guard { … }` / Suspense rather than a `Loadable<T>` wrapper.

---

## Authentication (runtime view)

- TanStack path: session and tokens in **TS** (or shared native module), not implied by `useQuery` itself.
- Instant path: follow Instant’s auth/session integration for the chosen major version.

Tao-level `CurrentUser` and session blocks are specified in [Data and Queries - Design — Authentication](./Data%20and%20Queries%20-%20Design.md#authentication) and forks in [Outstanding and deferred](./Data%20and%20Queries%20-%20Design.md#outstanding).

---

## RAW TRANSFER (from pre-cleanup roadmap notes)

Verbatim excerpt: old roadmap lines **618–677**. In the old file this block sat under **App Routing** with the heading `#### Layout: Choice exploration, thinking & justification` — the title was a misnomer; the content is **data sources, schema targets, and provider/driver brainstorming**. Preserved here next to TanStack/Instant runtime notes.

#### Layout: Choice exploration, thinking & justification

- [ ] Design: Data Sources: Declaration, Schema, Queries, Authentication, Offline-first, Providers
  - Goal:
    - Authentication
    - Model definitions
      - Relations between models
        - Cascading deletes
      - Access permissions
    - Reactive queries
      - Defined on models?
    - Mutations
      - Defined on models?
      - Do mutations describe the mutation code?
      - Or do they just specify the endpoints to sync to?
      - They need to define conflict resolutions. At least "last-write" strategy as a lowest common denominator
    - Offline first
      - Realtime sync
      - Conflict resolutions

  - [ ] Study schema definition targets
    - [ ] Relational
    - [ ] Event based
      - [ ] https://github.com/livestorejs/livestore/blob/main/examples/standalone/web-todomvc/src/livestore/schema.ts
        - This could map directly to schema definitions!
      - [ ] A first data driver
      - [ ] Pick target driver .. tanstack w ElectricDB/TxDB? supabase with powersync? instantdb? zerodb? localStorage/localOnly? https://tanstack.com/db/latest/docs/overview#localstoragecollection
        - Supabase
          - Not offline-first
          - Might be able to get there with watermelonDB or powersync
        - Tanstack DB
          - Can persist to ElectricDB, RxDB, or custom via Tanstack Query -> backend.
        - Tanstack Query
          - Works by mapping a useQuery => e.g a REST endpoint, GraphQL, etc
          - Requires manual query invalidation ...
          - NOT great
        - oRPC? OpenAPI rpc ...
          - Live queries? https://orpc.unnoq.com/docs/integrations/tanstack-query#live-query-options
        - LiveStore?
          - Event source!
            - Do I want to support different sorts of databases?
            - Relational
            - Eventlog
            - Etc ..
            - How is this modeled in the schema?
              - This is really cool! https://github.com/livestorejs/livestore/blob/main/examples/standalone/web-todomvc/src/livestore/schema.ts
          - Offline first!
          - Looks promising maybe?
          - https://livestore.dev
        - Prisma?
          - Hmmm
      - [ ] app datasource clause
        - Using a generic bridge interface?
        - Or does the datasource definition itself generate the code?
          - THIS is probably easier in the beginning!
          - Maybe a light mix of both?
          - Do we even have datasource-specific querying language?
            - This would be improved supported by type percolation
      - [ ] Pick another datasource, and make that work too
