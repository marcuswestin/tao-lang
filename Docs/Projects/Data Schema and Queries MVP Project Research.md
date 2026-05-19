# Data Schema and Queries MVP Project Research

## Goal

Finish a small InstantDB-targeted data-query sprint for Tao's first Buildable App MVP. The sprint should stay inside the data-layer slice and avoid adjacent first-v1 work such as navigation, forms, broader error-state design, demo-app polish, or runtime build hardening.

The longer data-layer direction remains the event RSVP target app in [Queries MVP Target App](./Data%20Schema%20and%20Queries/Queries%20MVP%20Target%20App.tao), but this sprint should choose a smaller compile-and-run slice instead of treating the full target app as the immediate gate.

## Current Context

- `Docs/Tao Project Roadmap.md` lists **Data Schema and Queries MVP** as priority 1.
- The existing implementation plan is [Queries MVP Plan](./Data%20Schema%20and%20Queries/Queries%20MVP%20Plan.md), but it needs a plan refresh before implementation because the sprint scope changed.
- The project already has a concrete target app and a current staging app under `Apps/Test Apps/Data Schema/Data Schema.tao`.
- The roadmap says the broader Buildable App MVP requires a small real Expo/React Native app with data, navigation, UI, styling, interactions, error states, and core tooling. This sprint focuses on the data-query slice only.

## Decisions

- Scope this sprint as a small data-layer step, not a broader first-v1 gate.
- Target InstantDB first. Memory should work where practical, but it does not need to drive the feature shape or exactly mirror every InstantDB edge case.
- Do not add provider capability validation in this sprint.
- Skip new `guard` work for this sprint. Existing `guard` support may remain in current apps and tests, but guard semantics should not be a sprint success criterion.
- Keep selection-block read queries as the query surface.
- Keep projection and filtering in one query block. A field predicate entry filters and projects that field.
- Add `where` statements inside query selection blocks for filter-only boolean logic. Multiple `where` statements are ANDed.
- Allow `where` inside relationship selection blocks for filtering the current related collection.
- Allow `and` / `or` in `where` expressions. `and` binds tighter than `or`; parentheses can override grouping.
- Do not support unary `not` in V1. Use `= false`, `!=`, `exists`, or `missing`.
- Require explicit `= true` / `= false` everywhere. Bare boolean fields remain projection entries, not filter expressions.
- Support direct-field scalar predicates and direct-field relationship identity predicates in `where`.
- Defer relationship path traversal inside `where`, such as `where Pets.Name = "Fido"`.
- Support nested relationship filtering through nested blocks, such as `Friends { Age > 30 }`.
- Defer associated root filtering by dotted related fields, such as `Friends.Age > 30` on the root `People` block.
- Support `exists` and `missing` in predicate-entry form and in `where`. Predicate-entry form filters and projects; `where` form filters only.
- Mirror InstantDB `$ne`: `!=` includes rows where the field is null or missing. Use `exists` with `!=` to require present-but-not-equal.
- Add one `order by Field [asc|desc]` clause per query or relationship block. `asc` is the default.
- Do not require a comma before or after `order by`.
- Mirror InstantDB ordering projection behavior: ordering by a field does not project that field unless it is selected.
- Restrict V1 ordering to a direct scalar field of the current block's entity. Defer relationship identity ordering, nested-attribute ordering, and multi-field ordering.
- Add strict row-handle-only `update` statements in actions. `update` must not upsert and must not return a value.
- Allow `update` to patch multiple fields in one block, including relationship fields when assigned row handles.
- Keep multiple data writes in one Tao action as sequential action statements for now; do not add explicit transaction syntax and do not require batching all writes into one InstantDB transaction in this sprint.
- Add `date` as a field type.
- Keep required-by-default schema fields; `optional` remains the opt-out. Do not add a `required` keyword.
- Defer text search, `in`, upsert, merge, delete, explicit transactions, link/unlink, lookup writes, query-once reads, pagination, counts, aggregation, multi-root queries, auth/session/permissions/rule params, and broad provider support.

## User Interview Notes

- 2026-05-19: User asked to "finish up the data query and all that is required for our first MVP version one of Tau." Working assumption: "Tau" means Tao unless corrected.
- 2026-05-19: User clarified that the sprint should be small and that guards can be skipped for this sprint.
- 2026-05-19: User confirmed that the small sprint should prove both Memory and InstantDB execution. User asked to skip repeated validation during research edits and run checks once at the end.
- 2026-05-19: User asked future research passes to batch question answering and document updates instead of editing the research doc after every answer.
- 2026-05-19: User rejected provider capability validation for this sprint and clarified that the feature set is meant to target InstantDB, with Memory preferred where practical.
- 2026-05-19: User selected V1 support for nested filtering, `where` boolean expressions inside selection blocks, `exists` / `missing`, ordering, strict row-handle `update`, and `date` field types.
- 2026-05-19: User deferred text search, `in` until list literals exist, upsert, merge, explicit transaction syntax, associated root filtering, and relationship path traversal inside `where`.

## Repo Findings

- `CORE_TENETS.md` requires Tao app/runtime behavior to map to React Native/Expo, a Tao runtime helper, or an explicit validation/runtime error.
- M1-M4 in `Queries MVP Plan.md` are documented as complete: data blocks, selection-block read queries, `guard`, `for`, `create`, provider overrides, schema push, structured query plans, and Memory/InstantDB execution.
- The older plan remainder emphasizes provider capability validation, M5 conditionals, M6 `update`, M7 relationship-heavy staging app, and M8 literal target app execution. The next plan should replace that with the smaller InstantDB query/write sprint recorded here.
- `packages/parser/tao-grammar.langium` currently includes `QueryDeclaration`, `GuardStatement`, `ForStatement`, and `CreateStatement`, but not `if`/`else`, expression-space `is` / `is not`, `.isEmpty`, or `UpdateStatement`.
- `packages/tao-std-lib/tao/data/providers/tao-data-client.ts` currently exposes `insert(...)` but no update helper, matching the M6 gap.
- `Apps/Test Apps/Data Schema/Data Schema.tao` exercises schema declarations, selection-block queries, relationships, `guard`, `for`, and `create`, but does not yet exercise conditionals, RSVP status updates, or the full target app flow.
- `Docs/Projects/Data Schema and Queries/Process Docs/Queries Design - Alternatives.md` still links to a missing `Queries Design - Preferred.md`; the live preferred design appears to be `Data and Queries - Design.md`.

## External Research

Official InstantDB docs reviewed for query and mutation capabilities:

- [InstantDB Reading Data](https://www.instantdb.com/docs/instaql)
- [InstantDB Writing Data](https://www.instantdb.com/docs/instaml)
- [InstantDB Modeling Data](https://www.instantdb.com/docs/modeling-data)
- [InstantDB Permissions](https://www.instantdb.com/docs/permissions)
- [InstantDB Backend](https://www.instantdb.com/docs/backend)

### InstantDB Capability Index

| Capability                                  | Sprint stance                                                                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nested relationship selection               | V1. Keep selection-block relationship entries.                                                                                                       |
| Nested relationship filtering               | V1. Use nested blocks with predicate entries or `where` statements on direct fields of the related entity.                                           |
| Associated root filtering by related fields | Deferred. InstantDB supports dotted associated filters, but Tao V1 skips root filters like `Friends.Age > 30`.                                       |
| Boolean AND/OR filters                      | V1. Use `where` statements with `and`, `or`, and parentheses. Multiple `where` statements are ANDed.                                                 |
| `$in`                                       | Deferred until Tao has list literals; add soon after list literals exist.                                                                            |
| Comparison filters                          | V1 for current Tao operators on direct fields.                                                                                                       |
| `$ne`                                       | V1 via `!=`, mirroring InstantDB behavior that includes null or missing values.                                                                      |
| `$isNull`                                   | V1 via `exists` and `missing`.                                                                                                                       |
| `$like` / `$ilike`                          | Deferred. Text search needs its own Tao surface and indexed-string validation story.                                                                 |
| Field selection                             | V1 via Tao selection blocks. `where` and `order by` do not project fields by themselves; predicate entries do.                                       |
| Ordering                                    | V1 for one direct scalar field per current block; `asc` default, `desc` explicit.                                                                    |
| Nested namespace ordering                   | V1 when the `order by` appears inside the nested relationship block and targets a direct scalar field of that related entity.                        |
| Nested-attribute ordering                   | Deferred; InstantDB documents this as unsupported.                                                                                                   |
| Pagination and infinite queries             | Deferred.                                                                                                                                            |
| Query deferral                              | Deferred; guard/loading is not part of this sprint gate.                                                                                             |
| Query-once reads                            | Deferred.                                                                                                                                            |
| Multi-root queries                          | Deferred.                                                                                                                                            |
| Strict row update                           | V1. Tao `update` is row-handle-only and strict, not upsert.                                                                                          |
| Upsert                                      | Deferred.                                                                                                                                            |
| Merge                                       | Deferred until Tao has object/json field mutation semantics worth exposing.                                                                          |
| Delete                                      | Deferred.                                                                                                                                            |
| Link / unlink                               | Deferred. V1 uses simple relationship field assignment on create/update where practical.                                                             |
| Lookup-based writes                         | Deferred.                                                                                                                                            |
| Atomic transaction surface                  | Deferred. No `transaction {}` syntax in V1, and this sprint does not require combining every action's writes into one generated Instant transaction. |
| Date fields                                 | V1 as a field type. Defer date literals and date functions such as `now()`.                                                                          |
| Required vs optional fields                 | V1 required-by-default; `optional` opts out.                                                                                                         |
| Permissions, auth/session, and rule params  | Deferred. Continue fake auth through a singular query over a unique field.                                                                           |
| Admin/backend query and transaction APIs    | Deferred from the client-side Tao app surface.                                                                                                       |
| Provider capability validation              | Deferred by explicit user decision.                                                                                                                  |

## Alternatives Considered

- **Refresh the existing plan instead of creating research:** rejected because the project queue had no research doc and the user invoked the research workflow.
- **Treat the full target app as the immediate sprint gate:** rejected for this sprint because the user wants the work to stay small.
- **Broaden this into the whole Buildable App MVP gate:** rejected for this sprint because it would pull in navigation, forms, error states, demo apps, and runtime build work beyond the data-layer plan.
- **Keep `guard` as an active sprint item:** rejected for this sprint; guard work can remain in the longer data-layer plan.
- **Separate `where { ... }` block syntax:** rejected. Tao keeps a single selection block; `where` is a statement inside that block.
- **Pipe syntax for boolean filtering:** rejected. Repeated `where` statements already behave like a filter pipeline, and arbitrary OR logic still belongs inside a `where` expression.
- **Bare boolean filters:** rejected. Require `Active = true` or `Active = false` everywhere.
- **Upsert and merge in V1:** rejected for this sprint after consideration.
- **One action always lowers to one generated InstantDB transaction:** rejected for this sprint. Sequential writes are acceptable for now.

## Unresolved Questions

None. Research is ready to turn into an implementation plan.

## Planning Inputs

- The plan refresh should shrink the sprint below the current M5-M8 full-target-app sequence and remove provider capability validation from the active sprint.
- Sprint verification should prioritize InstantDB and cover Memory where practical.
- The implementation plan should update the parser, validation, formatter, query-plan IR, Memory provider, InstantDB provider, and tests for V1 query/filter/order/update/date behavior.
- The implementation plan should explicitly cover grammar, validation, formatter, codegen, runtime providers, targeted tests, the staged app, and final target-app verification.
- The next plan should repair or account for the missing preferred-design link in the alternatives doc.
- The roadmap status should move to `Ready for plan`; the next skill is `project-3-write-project-plan`.
