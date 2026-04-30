# Runtime — TanStack Query and InstantDB

Companion to **[Query Design - Preferred.md](./Query%20Design%20-%20Preferred.md)**. Execution details and **why** the datasource bridge splits Tao vs TypeScript.

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

**Tao generates (design intent):** query structure, **stable `queryKey` materialization** from [Preferred §3.4](./Query%20Design%20-%20Preferred.md#query-identity), mutation structure for invalidation hooks.

**TypeScript provides:** `queryFn`, transport, auth, provider-specific edge cases — see [Preferred — Declarative vs imperative](./Query%20Design%20-%20Preferred.md#declarative-vs-imperative).

Open questions (also listed in [Alternatives — Datasource bridge](./Query%20Design%20-%20Alternatives.md#datasource-bridge-open)): auto-generated vs hand-authored portions; mutation → invalidation mapping; how much dynamic shaping stays in TS by policy.

---

## InstantDB

- **Schema + client:** InstantDB expects an app schema (often TS `i.schema`) and client APIs (`find`, `transact`, …).
- **Auth / permissions:** Instant’s ecosystem may model rules alongside schema to varying degrees — specifics remain provider-version dependent.
- **Realtime:** subscriptions are a native strength; Tao provider layer should map reactive UI expectations without re-specifying wire protocol in Tao source.

**Rough mapping from Tao:**

- Tao `data` + `source InstantDB { … }` → generated InstantDB schema + thin wrappers.
- Tao queries → Instant query calls (or equivalent) preserving typed results surfaced as `Loadable<T>` in views.
- Tao mutations (patch / create / delete) → `transact` / update patterns, plus provider-driven invalidation or sync.

---

## Relationship loading and caching (runtime view)

- **How** edges resolve (join vs batch vs N+1) is **provider- and strategy-dependent** — Tao schema does not encode loading strategy ([Preferred — Relationships](./Query%20Design%20-%20Preferred.md#relationships)).
- **Caching** is delegated to TanStack Query, Instant client, or other stacks — Tao does not reinvent cache internals unless a future invalidation DSL lands ([Alternatives](./Query%20Design%20-%20Alternatives.md#cache-invalidation-strategies)).

---

## Reactive UI stacks (mention only)

Apps may combine Legend State, TanStack Query, Instant subscriptions, etc. Exact composition is **per-app runtime** choice; Tao’s contract is **typed values** crossing the view boundary, typically via `Loadable<T>`.

---

## Authentication (runtime view)

- TanStack path: session and tokens in **TS** (or shared native module), not implied by `useQuery` itself.
- Instant path: follow Instant’s auth/session integration for the chosen major version.

Tao-level `CurrentUser` and session blocks are specified in [Preferred — Authentication](./Query%20Design%20-%20Preferred.md#authentication) and forks in [Alternatives](./Query%20Design%20-%20Alternatives.md#authentication-and-session).
