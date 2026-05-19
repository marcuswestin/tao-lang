# Data Schema and Queries MVP Project Plan

## Summary

Finish a small, implementation-ready data-query/write sprint for Tao's Buildable App MVP. This plan is scoped to the data-layer slice described in [Data Schema and Queries MVP Project Research](./Data%20Schema%20and%20Queries%20MVP%20Project%20Research.md): selection-block query expansion, strict row-handle updates, `date` fields, Memory support where practical, and InstantDB as the required acceptance path.

The existing [Queries MVP Plan](./Data%20Schema%20and%20Queries/Queries%20MVP%20Plan.md) remains useful history for the broader data-layer target app, but it is too broad for this sprint. The event RSVP [Queries MVP Target App](./Data%20Schema%20and%20Queries/Queries%20MVP%20Target%20App.tao) remains the long-range data-layer target, not this sprint's definition of done.

## Goals

- Add filter-only `where` statements inside query selection blocks, including nested relationship selection blocks.
- Add boolean filter expressions for `where`: `and`, `or`, and parentheses, with `and` binding tighter than `or`.
- Add `exists` and `missing` in both predicate-entry form and `where` form.
- Add one `order by Field [asc|desc]` clause per query or relationship block, defaulting to `asc`.
- Add `date` as a data field type without adding date literals, date functions, or `now()`.
- Add strict row-handle-only `update` statements in actions.
- Extend the query/write plan IR, Memory provider, and InstantDB provider for the V1 feature set.
- Extend the Data Schema test app or a sibling scenario so the sprint proves the new query/write surface.

## Non-goals

- Provider capability manifests or compile-time provider capability validation.
- New `guard` semantics, `if`/`else`, `.isEmpty`, or expression-space `is` / `is not`.
- Full literal target-app completion.
- Text search, `in`, pagination, counts, aggregation, query-once reads, multi-root queries, or associated root filters such as `Friends.Age > 30`.
- Relationship path traversal inside `where`, such as `where Pets.Name = "Fido"`.
- Upsert, merge, delete, link/unlink syntax, lookup writes, explicit transaction syntax, or forced batching of all writes in an action into one InstantDB transaction.
- Real auth/session/permissions/rule params, provider environments/secrets, broad provider support, or provider package splitting.

## Assumptions

- `where` is a query-selection-block statement, not a separate `where { ... }` block.
- Multiple `where` statements in one block are ANDed.
- Bare boolean field entries remain projections. Filtering boolean fields requires explicit `= true` or `= false`.
- Predicate entries filter and project. `where` entries filter only and do not project their fields.
- `exists` and `missing` use postfix syntax: `Field exists` and `Field missing`. `exists` means the value is not null and not missing/undefined. `missing` means the value is null, missing, or undefined. `false`, `0`, and `""` count as existing values.
- `!=` mirrors InstantDB `$ne`: it includes rows where the field is null or missing. Use `exists` plus `!=` when present-but-not-equal behavior is required.
- `order by` does not project the ordered field unless that field is also selected. The ordered field must be a direct scalar field marked `indexed` or `unique`; this sprint rejects unindexed ordering instead of auto-indexing.
- `date` is a data-field scalar in this sprint, not a general expression or literal surface. Tao stores date values as Unix millisecond numbers at the runtime boundary; provider adapters convert to the provider schema/value shape. Direct string or number literals are not accepted as `date` assignments until the language owns date literals or conversion helpers.
- Query identity includes the new filter, existence, ordering, and date-shape inputs. Cache invalidation from query-shape changes is acceptable for this pre-1.0 internal app surface.
- Query rows carry hidden provider identity outside the projected field set. Projection does not need to expose an id field, but update lowering must be able to extract the hidden id or fail clearly.
- `update RowHandle { Field Value }` updates an existing provider row represented by an in-scope row handle. Valid targets include singleton query aliases, `for` row bindings, and nested relationship rows that carry row identity. Entity names, collection names, and lookup/upsert forms are invalid. Shorthand `Field` uses the in-scope value named `Field`, matching the existing `create` assignment style.
- Relationship assignment in `update` supports direct single-link relationship fields assigned from row handles. To-many relationship replacement stays deferred until list literals or explicit link/unlink syntax exist.
- Multiple writes in one action lower as sequential action statements. They do not imply a Tao-level transaction block.

## Canonical Syntax Examples

Accepted V1 query syntax:

```tao
query MeetupData.Events as UpcomingEvents {
  Title,
  Status,
  where Status exists,
  where Cancelled = false,
  order by Ordering desc

  Rsvps {
    Status,
    where Status != "no" or Status missing,
    order by CreatedAt asc
  }
}
```

Accepted V1 update syntax:

```tao
action MarkGoing(Rsvp) {
  update Rsvp {
    Status "going"
  }
}
```

Rejected V1 shapes:

```tao
where Active
where not Active
where Friends.Age > 30
order by Host
order by Title, CreatedAt
update MeetupData.Rsvps { Status "going" }
update Rsvp { OtherRsvps NewRsvps }
```

## Implementation Steps

### 1. Grammar and AST for Query Additions

**Context:** `packages/parser/tao-grammar.langium` already has `QueryDeclaration`, `QuerySelectionEntry`, `CreateStatement`, and primitive types `text`, `number`, `boolean`, `action`, and `view`.

**Work:**

- Add `date` to primitive/data field type parsing.
- Replace the current comma-only query-selection entry list with a block-item grammar that can include:
  - field projections and predicate entries;
  - `where` statements;
  - one optional `order by` clause;
  - nested relationship blocks with the same query-block shape.
- Keep comma-separated projections and predicate entries readable, but do not require commas after `where` or `order by` statements.
- Add AST shapes for `where` boolean expressions, preserving precedence: parentheses, comparison/existence atoms, `and`, then `or`.
- Add predicate-entry and `where` syntax for postfix `Field exists` and `Field missing`.
- Add `UpdateStatement` as an action statement with row-handle target and `create`-style field assignments.

**Validation:** `./agent gen`; targeted parser tests via `./agent compiler test parser`.

**Exit criteria:** valid examples parse for `where`, `and`/`or`, parentheses, `exists`, `missing`, `order by`, `date`, and `update`.

**Suggested commit subject:** `Add data query grammar for where order and update`

### 2. Validation and Typing Rules

**Context:** existing data validation lives under `packages/compiler/compiler-src/validation/data/`, with query behavior covered by `QueryValidator` and create behavior by `ForCreateValidator`.

**Work:**

- Validate `where` expressions against the current query block entity.
- Allow direct-field scalar predicates and direct-field relationship identity predicates in `where`.
- Reject relationship path traversal in `where`, associated root filters, bare boolean filters, and unary `not`.
- Validate one `order by` per query/relationship block, with a direct scalar field only, and require the field to be `indexed` or `unique`.
- Validate `exists` / `missing` only on fields of the current block entity and preserve the predicate-entry versus `where` projection distinction.
- Validate `date` fields in schema declarations, field references, and assignment compatibility. Reject direct string/number date literals until date literals or conversion helpers exist.
- Validate `update`:
  - target must be an in-scope data row handle, not a collection/entity name;
  - target must carry hidden provider identity;
  - no upsert or lookup form;
  - fields must exist on the target entity;
  - scalar values type-check;
  - direct single-link relationship fields accept row handles of the related entity;
  - to-many relationship replacement, link/unlink, and lookup writes produce clear diagnostics.

**Validation:** targeted validation/type-checking tests via `./agent compiler test validation data schema` and `./agent compiler test type-checking`.

**Exit criteria:** accepted V1 shapes pass, and deferred shapes fail with clear diagnostics.

**Suggested commit subject:** `Validate data where order date and updates`

### 3. Row-Handle Update Lowering and Runtime Contract

**Context:** action lowering and runtime call generation belong with the generated runtime/action path, while query-plan generation should stay focused on query plan objects.

**Work:**

- Carry hidden row identity through query result row handles without requiring the id to be projected or visible in Tao code.
- Teach action lowering to resolve update targets from singleton query aliases, `for` row bindings, and nested relationship rows when they carry identity.
- Generate update snippets from the action/runtime codegen path, not from `query-plan-gen.ts`.
- Add a provider-facing update patch shape and `TaoDataClient.update(...)` helper.
- Make strict update failure explicit when the target row has no hidden id.
- Keep provider-specific transaction details out of generated Tao app code.

**Validation:** codegen binding tests for update call sites, plus runtime/helper tests for missing-id diagnostics and provider-neutral patch shape.

**Exit criteria:** generated update call sites stay short, deterministic, provider-neutral, and incapable of silently upserting.

**Suggested commit subject:** `Lower strict row handle updates`

### 4. Formatter Support

**Context:** data schema and query formatting lives in `packages/formatter/formatter-src/TaoFormatter.ts`, with coverage in `packages/formatter/formatter-tests/1-test-formatter.test.ts`.

**Work:**

- Format `where` statements in query blocks and nested relationship blocks.
- Format boolean `where` expressions while preserving parentheses and precedence.
- Format `exists`, `missing`, and `order by` consistently.
- Format `update` blocks using the same multi-line field-assignment style as `create`.
- Add idempotence coverage for mixed projection, predicate, `where`, `order by`, and nested relationship blocks.

**Validation:** `./agent fmt`; targeted formatter tests via `./agent test formatter`.

**Exit criteria:** formatter output is stable and readable for all new syntax.

**Suggested commit subject:** `Format data where order and update syntax`

### 5. Query and Provider IR

**Context:** compiled queries currently emit `TaoQueryPlan` objects through `packages/compiler/compiler-src/codegen/app/query-plan-gen.ts`, and provider-facing query types live in `packages/tao-std-lib/tao/data/providers/tao-query.ts`.

**Work:**

- Extend `TaoQueryPlan` / `TaoQuerySelection` with:
  - predicate-entry filters that still project selected fields;
  - boolean filter trees for `where`;
  - existence predicates;
  - ordering descriptors per block;
  - provider-lowerable versus client-only filter/order fragments;
  - enough shape for nested relationship block filtering and ordering.
- Represent multiple `where` statements as an AND at the block level.
- Preserve current projection trees and predicate-entry projection behavior.
- Keep query identity deterministic and include new filter/order inputs.
- Represent `date` fields in provider-facing schema/data types using the runtime Unix-ms contract.

**Validation:** codegen binding tests in `packages/compiler/compiler-tests/6-test-codegen-bindings.test.ts`; std-lib query unit tests in `packages/tao-std-lib/tao/data/providers/tao-query.test.ts`.

**Exit criteria:** generated query plans stay deterministic and provider-neutral, and providers have enough information to lower supported pieces while preserving JS fallback behavior.

**Suggested commit subject:** `Extend Tao data IR for filters ordering and dates`

### 6. Memory Provider Support

**Context:** `MemoryTaoData` already filters and projects rows from `TaoQueryPlan` and is the default provider when an app omits provider config.

**Work:**

- Evaluate `where` boolean trees, `exists`, `missing`, and `!=` null/missing semantics.
- Apply ordering after filtering and before projection.
- Apply nested relationship filters and nested relationship ordering when in-memory rows already contain nested object/array values.
- Implement strict row-handle `update` against stored rows and notify subscribers.
- Cover Memory behavior where practical; do not let Memory limitations drive the InstantDB-targeted language surface.

**Validation:** focused provider unit tests through `./agent test "MemoryTaoData"` and shared query tests through `./agent test "tao-query"`.

**Exit criteria:** Memory exercises the same semantics where practical and has explicit tests for any accepted V1 behavior it supports.

**Suggested commit subject:** `Implement Memory data query and update additions`

### 7. InstantDB Provider Support

**Context:** `InstantDBTaoClient` lowers existing predicates into InstaQL where possible, filters/project rows in JS, and inserts rows through `transact(...update(...))`.

**Work:**

- Lower direct-field `where` predicates, `exists`, `missing`, and ordering to InstantDB query shape where supported.
- Preserve JS-side filtering/projection fallback for client-only shapes, including relationship identity predicates and nested relationship selection data.
- Mirror InstantDB `$ne` behavior for `!=`, including null or missing values.
- Serialize `date` schema fields to the InstantDB schema/admin shape and convert runtime values at the provider boundary.
- Implement strict row-handle updates through InstantDB transactions using no-upsert update semantics.
- Keep sequential action writes sequential; do not add Tao transaction syntax.

**Validation:** focused provider unit tests through `./agent test "InstantDBTaoClient"`; compiler codegen tests for emitted provider calls; schema-push tests where existing coverage owns provider schema shape.

**Exit criteria:** InstantDB is the required acceptance path for the sprint and supports the documented V1 query/write semantics.

**Suggested commit subject:** `Implement InstantDB data query and update additions`

### 8. Test App and Runtime Scenario

**Context:** `Apps/Test Apps/Data Schema/Data Schema.tao` already covers schema declarations, selection-block queries, relationships, `guard`, `for`, and `create`, but not the new query/write surface.

**Work:**

- Extend the Data Schema app or add a sibling scenario under `Apps/Test Apps/Data Schema/` for:
  - direct-field `where`;
  - nested relationship filtering;
  - `exists` / `missing`;
  - one `order by` on a root block and one inside a relationship block;
  - `date` field declaration;
  - strict row-handle `update`;
  - create followed by update with refreshed visible data.
- Keep the existing `Apps/Test Apps/Data Schema/scenario.json` Memory-provider override as Memory coverage, not InstantDB acceptance.
- Prove InstantDB execution through a sibling scenario or an agent-approved local InstantDB recipe before claiming acceptance.
- Cover Memory where practical through provider override tests or unit tests rather than forcing the app scenario to be Memory-first.

**Validation:** targeted compiler/runtime test for the staged app via `./agent test "Data Schema"`; `./agent check`; `./agent prep-commit` before implementation is considered ready to commit.

**Exit criteria:** the staged app compiles and the selected runtime scenario proves the new data-query/write slice.

**Suggested commit subject:** `Exercise data query write MVP scenario`

### 9. Documentation and Roadmap Cleanup

**Context:** the research found a stale link from `Queries Design - Alternatives.md` to missing `Queries Design - Preferred.md`; the live preferred design is `Data and Queries - Design.md`.

**Work:**

- Repair or account for stale preferred-design links in the query alternatives doc.
- Update the data-query design doc only where implementation decisions need to be made normative after code lands.
- Keep the older full-target-app plan linked as historical/broader context rather than active sprint scope.
- Note that query identity changes from this sprint are allowed to invalidate pre-existing caches.
- Update `Docs/Tao Project Roadmap.md` as implementation progresses through the project workflow statuses.

**Validation:** `./agent dprint check --incremental=false`; `./agent git diff --check`.

**Exit criteria:** docs point to the active plan and do not imply provider capability validation, `if`/`else`, or the full target app are in this sprint.

**Suggested commit subject:** `Document data query MVP sprint boundaries`

## Validation Plan

- `./agent gen` after grammar changes.
- `./agent compiler test parser`.
- `./agent compiler test validation`.
- `./agent compiler test type-checking`.
- `./agent test formatter`.
- `./agent test "MemoryTaoData"`.
- `./agent test "InstantDBTaoClient"`.
- `./agent test "tao-query"`.
- `./agent test "Data Schema"`.
- Targeted compiler/codegen tests for generated query/update plans.
- Targeted headless or runtime scenario for the staged Data Schema app.
- `./agent check`.
- `./agent prep-commit` before committing implementation chunks.

## Risks

- `where` boolean expressions add a second expression grammar inside query blocks. Keep the grammar small and avoid pulling all general expression operators into query filters.
- `exists` / `missing` have different projection behavior in predicate-entry form versus `where` form. Tests need to lock this down early.
- `!=` null/missing behavior is intentionally surprising because it mirrors InstantDB. Provider and compiler tests must make that explicit.
- Row-handle update depends on hidden provider identity already preserved in query rows. If identity is missing from projected rows, update must fail clearly rather than silently upsert.
- Nested relationship filtering and ordering depend on what the provider returns for linked data. Keep unsupported shapes rejected or client-only with explicit tests.
- Date fields are schema/type support only in this sprint. Avoid accidentally inventing date literals, `now()`, or formatting semantics.

## Deferrals

- Provider capability manifests and provider-specific compile-time capability validation.
- `if`/`else`, `.isEmpty`, expression-space `is` / `is not`, and full target-app RSVP UI behavior.
- Date literals, `now()`, date formatting, and date arithmetic.
- Text search, `in`, pagination, counts, aggregation, query-once reads, multi-root queries, and alias-as-source/query-on-query.
- Upsert, merge, delete, link/unlink, lookup writes, explicit transaction syntax, and write return values.
- Real auth/session/permissions/rule params, provider environments/secrets, provider package split, broader provider ecosystem, and offline/sync policy.

## Next Step

Run `project-5-implement-project` and implement the reviewed plan one committable step at a time.
