# Example App — Target (aspirational Tao)

**Not valid Tao today.** These files are **design fictions** under `Docs/`: they show how the **[Query Design - Preferred](../Query%20Design%20-%20Preferred.md)** surface might look for one minimal app (**event RSVP + planning**). The compiler and grammar do not implement this layer yet.

## Layout

- **`App.tao`** — UI shell; swaps data/query story via one `use` line.
- **`variants/DataPipeline.tao`** — Preferred **pipeline** queries + patch/create/delete mutations + `Loadable` usage sketch.
- **`variants/DataBlockQuery.tao`** — Same domain, **block-shaped** query sketch (see [Alternatives — pipeline vs block](../Query%20Design%20-%20Alternatives.md#query-flow-pipeline-vs-block)).

To compare variants, change:

```tao
use Data from ./variants/DataPipeline
```

to:

```tao
use Data from ./variants/DataBlockQuery
```

## Domain (minimal)

- **Person** — host or guest.
- **Event** — title, startsAt, host.
- **Rsvp** — links Person + Event with status (`going` | `maybe` | `no`).

Covers: 1:N and M:N-shaped data, parameterized queries (“events for host”, “rsvps for event”), `CurrentUser`, create/update/delete, query identity comments, `Loadable` in views.
