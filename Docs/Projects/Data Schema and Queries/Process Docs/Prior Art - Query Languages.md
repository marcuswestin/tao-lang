# Prior Art — Query Languages

External **survey** of how other systems express schema, reads, and writes. Used to inform Tao’s **Preferred** and **Alternatives** docs — not a specification of Tao syntax.

See **[Queries Design - Preferred.md](./Queries%20Design%20-%20Preferred.md)** for what Tao actually intends to ship.

---

## TanStack Query / TanStack DB-style collections

Link: [TanStack Query — React overview](https://tanstack.com/query/latest/docs/framework/react/overview)

TanStack’s collection pattern (often with inferred TS types) bundles **query + mutation sync** around a keyed collection:

```ts
import { createCollection, queryCollectionOptions } from '@tanstack/db'

// Define the Schema (usually inferred, but structures data)
type Todo = {
  id: string
  name: string
  active: boolean
}

// Create the collection with Query and Mutation handling
const todoCollection = createCollection(queryCollectionOptions({
  queryKey: ['todos'],
  queryFn: async () => {
    const response = await fetch('/api/todos')
    return response.json()
  },
  getKey: (item) => item.id, // Primary key for caching
  // Mutation Handler for Syncing
  onInsert: async ({ transaction }) => {
    const { modified: newTodo } = transaction.mutations[0]
    await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify(newTodo),
    })
  },
}))
```

Tao’s bridge story is summarized in **[Runtime - TanStack Query and InstantDB.md](./Runtime%20-%20TanStack%20Query%20and%20InstantDB.md)**.

---

## By concern: schema, reads, mutations

The rest of this document groups the same systems by **schema**, **query (reads)**, and **mutation / writes** (plus a short comparison table). Content derives from the former _Research_ and _By type_ notes, deduplicated.

---

## Schema

How each system declares entities, fields, relations, and constraints.

### GraphQL

Link: [https://graphql.org/](https://graphql.org/)

```gql
type Project {
  name: String!
  tagline: String
  contributors(first: Int, after: ID): [User!]!
}
```

### InstantDB

Link: [https://www.instantdb.com/](https://www.instantdb.com/)

```ts
import { i } from '@instantdb/core'
const schema = i.schema({
  entities: {
    messages: i.entity({
      text: i.string(),
      createdAt: i.date(),
    }),
  },
})
export default schema
```

### Prisma

[https://www.prisma.io/client](https://www.prisma.io/client)

```
datasource db {
  provider = "postgres"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["interactiveTransactions"]
}

model User {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  email     String   @unique
  name      String
  age       Int
  role      Role     @default(USER)
  posts     Post[]
  profile   Profile?
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique
}

model Post {
  id         Int        @id @default(autoincrement())
  createdAt  DateTime   @default(now())
  title      String
  published  Boolean    @default(false)
  categories Category[] @relation(references: [id])
  author     User       @relation(fields: [authorId], references: [id])
  authorId   Int
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[] @relation(references: [id])
}

enum Role {
  USER
  ADMIN
}
```

### EdgeDB / EdgeQL schema (SDL)

Link: [https://www.edgedb.com/docs/edgeql](https://www.edgedb.com/docs/edgeql)

```edgeql
type User {
  required email: str;
  multi friends: User;
}

type BlogPost {
  required title: str;
  required author: User;
}

type Comment {
  required text: str;
  required author: User;
}
```

### SQL

Link: [https://en.wikipedia.org/wiki/SQL](https://en.wikipedia.org/wiki/SQL)

DDL lives here (not expanded in this note). Prisma’s schema layer maps closely to relational DDL.

### Falcor, JSON:API

- [Falcor](https://netflix.github.io/falcor/) — graph-of-JSON model; schema is often implicit in routes and JSON graph keys.
- [JSON:API](https://jsonapi.org/) — resource types and relationships are convention-driven over HTTP rather than a single schema language in this doc.

---

## Query (reads)

### GraphQL — selection sets and arguments

```gql
{
    project(name: "Tao") {
        tagline
        contributors(first: 10) {
            name
        }
    }
}
```

### InstantDB — typed find

```ts
const messages = await schema.messages.find()
```

### Prisma — client read API

(Placeholder in original research.)

```
```

### Cypher — pattern matching on a graph

Link: [https://neo4j.com/docs/cypher-manual/current/](https://neo4j.com/docs/cypher-manual/current/)

```
MATCH (keanu:Person {name:'Keanu Reeves'})
RETURN keanu.name AS name, keanu.born AS born
```

```
MATCH (bornInEighties:Person)
WHERE bornInEighties.born >= 1980 AND bornInEighties.born < 1990
RETURN bornInEighties.name as name, bornInEighties.born as born
ORDER BY born DESC
```

```
MATCH (m:Movie {title: 'The Matrix'})<-[d:DIRECTED]-(p:Person)
RETURN p.name as director
```

### Kusto Query Language (KQL) — pipelined tabular queries

Link: [https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/)

- **Shape:** pipe query data through operators (`where`, `project`, `distinct`, `top`, `sort`).

```
StormEvents
| where StartTime between (datetime(2007-11-01) .. datetime(2007-12-01))
| where State == "FLORIDA"
| count

StormEvents
| take 5

StormEvents
| take 5
| project State, EventType, DamageProperty // "Select"

StormEvents
| distinct EventType // List unique values
| top 5 by DamageProperty desc

StormEvents
| sort by DamageProperty // Sort
```

### LINQ — integrated query syntax (C#)

Link: [https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/linq/](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/linq/)

```
IEnumerable<int> scoreQuery =
    from score in scores
    where score > 80
    select score;
```

### EdgeQL — composable `select`

```
with x := {1, 2, 3, 4, 5}
select x
filter x >= 3;
```

---

## Mutation and writes

### GraphQL — server-named operations

```gql
mutation AddContributor($project: String! $name: String!) {
  addContributor(name: $name) {
    name
  }
}
```

### InstantDB — client-defined transactions

```ts
const addMessage = (msg) => {
  db.transact(db.tx.messages[id()].update(msg))
}
```

### Prisma — imperative create (example)

```
const newUser = await prisma.user.create({
  data: {
    name: "Alice",
    email: "alice@prisma.io",
  },
});
```

### EdgeQL — `insert` with relational subqueries

```
insert User {
  email := "user2@me.com",
  friends := (select detached User filter .email = "user1@me.com")
};
```

### Cypher, SQL, KQL, LINQ

- **Cypher** — `CREATE`, `MERGE`, `DELETE`, etc. (not expanded in the original snippet set).
- **SQL** — `INSERT`, `UPDATE`, `DELETE` as the mutation surface.
- **KQL** — mostly read/analytics; control commands exist outside the samples here.
- **LINQ** — typically projects to in-memory updates or ORM calls rather than a single “mutation DSL” in the excerpt.

---

## Systems named without type-local examples

| System   | Link                                                                   |
| -------- | ---------------------------------------------------------------------- |
| Falcor   | [https://netflix.github.io/falcor/](https://netflix.github.io/falcor/) |
| JSON:API | [https://jsonapi.org/](https://jsonapi.org/)                           |

---

## Quick comparison (from the samples)

| Concern | GraphQL                     | InstantDB         | Prisma           | Cypher                        | KQL             | LINQ           | EdgeQL              |
| ------- | --------------------------- | ----------------- | ---------------- | ----------------------------- | --------------- | -------------- | ------------------- |
| Schema  | SDL types                   | TS `i.schema`     | `model` / `enum` | labels/properties in patterns | implicit tables | N/A in snippet | SDL `type`          |
| Read    | selection + args            | `find()`          | client (empty)   | `MATCH` / `RETURN`            | pipes           | query expr     | `select` / `filter` |
| Write   | `mutation` + resolver names | `transact` / `tx` | `create` / etc.  | (not shown)                   | (not focus)     | (via host)     | `insert`            |
