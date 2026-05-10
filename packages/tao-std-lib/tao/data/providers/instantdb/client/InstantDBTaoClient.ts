import * as IDB from '@instantdb/react-native'
import { Assert } from '../../../../tao-runtime/runtime-utils'
import {
  buildQueryResult,
  evaluateQueryPlan,
  evaluateRecordFields,
  registerTaoDataProvider,
  type TaoDataClient,
  type TaoDataProviderParams,
  taoDatasetFieldIsIndexed,
  type TaoDatasetFieldShape,
  taoDatasetFieldType,
  type TaoDatasetShape,
  type TaoQueryPlan,
  type TaoQueryPredicate,
  type TaoQueryResult,
} from '../../tao-data-client'
import { createTaoIDBClient } from './TaoIDBClient'

type InstantDb = ReturnType<typeof IDB.init>
type InstantEndpointConfig = Pick<
  IDB.InstantConfig<IDB.InstantSchemaDef<any, any, any>, boolean>,
  'apiURI' | 'websocketURI'
>
type InstantStoreConfig = Pick<IDB.InstantConfig<IDB.InstantSchemaDef<any, any, any>, boolean>, 'Store'>

declare const require: (id: string) => unknown

const iTypeFns: Record<string, () => ReturnType<typeof IDB.i.string>> = {
  string: () => IDB.i.string(),
  number: () => IDB.i.number(),
  boolean: () => IDB.i.boolean(),
}

/** buildInstantAttr turns Tao field metadata into InstantDB attr metadata. */
function buildInstantAttr(field: TaoDatasetFieldShape): ReturnType<typeof IDB.i.string> {
  const factory = iTypeFns[taoDatasetFieldType(field)]
  let attr = factory ? factory() : IDB.i.any()
  if (typeof field !== 'string') {
    if (field.optional === true) {
      attr = attr.optional()
    }
    if (field.unique === true) {
      attr = attr.unique()
    }
    if (taoDatasetFieldIsIndexed(field)) {
      attr = attr.indexed()
    }
  }
  return attr
}

/** buildInstantSchema constructs an `IDB.i.schema(...)` from the plain TaoDatasetShape so InstantDB gets full type info. */
function buildInstantSchema(shape: TaoDatasetShape) {
  const entities: Record<string, ReturnType<typeof IDB.i.entity>> = {}
  for (const [collection, fields] of Object.entries(shape.entities)) {
    const attrs: Record<string, ReturnType<typeof IDB.i.string>> = {}
    for (const [fieldName, field] of Object.entries(fields)) {
      attrs[fieldName] = buildInstantAttr(field)
    }
    entities[collection] = IDB.i.entity(attrs)
  }
  return IDB.i.schema({ entities, links: {} })
}

function omitId(record: Record<string, unknown>): Record<string, unknown> {
  const { id: _id, ...rest } = record
  return rest
}

/** coerceQueryShape normalizes a query object the same way Instant does so reactor cache keys match useQuery. */
function coerceQueryShape<Q extends Record<string, unknown>>(q: Q): Q {
  return JSON.parse(JSON.stringify(q)) as Q
}

function getCollectionRows(data: unknown, collection: string): unknown[] {
  if (!data || typeof data !== 'object') {
    return []
  }
  const rows = (data as Record<string, unknown>)[collection]
  return Array.isArray(rows) ? [...rows] : []
}

/** Shape of Instant’s internal reactor used only for cache peek (non-public API). */
type InstantReactorPeek = { getPreviousResult: (query: unknown) => unknown }

/** getInstantReactorPeek returns the reactor handle if present on this client build. */
function getInstantReactorPeek(db: InstantDb): InstantReactorPeek | undefined {
  const core = (db as { core?: { _reactor?: InstantReactorPeek } }).core
  return core?._reactor
}

/** getInstantPreviousQueryResult reads the reactor cache for `query`; returns undefined if unavailable or if the private API throws. */
function getInstantPreviousQueryResult(db: InstantDb, query: unknown): unknown {
  const reactor = getInstantReactorPeek(db)
  if (!reactor) {
    return undefined
  }
  try {
    return reactor.getPreviousResult(query)
  } catch {
    return undefined
  }
}

/** assertValueMatchesDeclaredTaoField throws when `value` is non-nullish but its JS type disagrees with Tao’s primitive name `declared`. */
function assertValueMatchesDeclaredTaoField(
  collection: string,
  field: string,
  declared: string,
  value: unknown,
): void {
  if (value === null || value === undefined) {
    return
  }
  if (declared === 'string') {
    Assert(typeof value === 'string', `Instant insert ${collection}.${field}: expected string`)
    return
  }
  if (declared === 'number') {
    Assert(typeof value === 'number', `Instant insert ${collection}.${field}: expected number`)
    return
  }
  if (declared === 'boolean') {
    Assert(typeof value === 'boolean', `Instant insert ${collection}.${field}: expected boolean`)
    return
  }
}

/** assertNormalizedMatchesInstantEntityDecl throws on unknown keys or bad primitives; returns `record` for a linear call site (Tao-validated inserts should always pass). */
function assertNormalizedMatchesInstantEntityDecl(
  collection: string,
  fieldTypes: Readonly<Record<string, string>>,
  record: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(record)) {
    Assert(
      key === 'id' || key in fieldTypes,
      `Instant insert ${collection}: unknown field ${
        JSON.stringify(key)
      } (not declared on this collection for Instant)`,
    )
    if (key === 'id') {
      continue
    }
    const declared = fieldTypes[key]
    Assert(declared !== undefined, `Instant insert ${collection}: missing field type for ${JSON.stringify(key)}`)
    assertValueMatchesDeclaredTaoField(collection, key, declared, record[key])
  }
  return record
}

/** optionalStringProviderParam returns an optional string provider parameter, rejecting non-string values. */
function optionalStringProviderParam(params: TaoDataProviderParams, name: string): string | undefined {
  const value = params[name]
  Assert(
    value === undefined || typeof value === 'string',
    `InstantDB provider parameter \`${name}\` must be a string when provided`,
  )
  return value as string | undefined
}

/** instantEndpointConfig returns configured Instant endpoints without overriding Instant defaults with undefined values. */
function instantEndpointConfig(apiURI: string | undefined, websocketURI: string | undefined): InstantEndpointConfig {
  const config: InstantEndpointConfig = {}
  if (apiURI !== undefined) {
    config.apiURI = apiURI
  }
  if (websocketURI !== undefined) {
    config.websocketURI = websocketURI
  }
  return config
}

/** InstantTaoData implements TaoDataClient using the published InstantDB React Native client package. */
export class InstantDBTaoClient implements TaoDataClient {
  private shape: TaoDatasetShape | undefined
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- `init` return is wide upstream; `undefined` is intentional until `open`.
  private db: InstantDb | undefined
  private opened = false

  declareDataset(shape: TaoDatasetShape): void {
    this.shape = shape
  }

  open(params: TaoDataProviderParams): void {
    if (this.opened) {
      return
    }
    this.opened = true
    const appId = params['appId']
    Assert(appId && typeof appId === 'string', 'InstantDB provider requires string parameter `appId`')
    const apiURI = optionalStringProviderParam(params, 'apiURI')
    const storage = optionalStringProviderParam(params, 'storage')
    const websocketURI = optionalStringProviderParam(params, 'websocketURI')
    const schema = buildInstantSchema(this.shape ?? { entities: {}, links: {} })
    const endpointConfig = instantEndpointConfig(apiURI, websocketURI)
    const storeConfig = instantStoreConfig(storage)
    this.db = createTaoIDBClient({ appId, schema, ...endpointConfig, ...storeConfig })
  }

  /** useLiveQuery delegates to InstantDB `useQuery` — must run only inside a React component. */
  useLiveQuery(plan: TaoQueryPlan): TaoQueryResult {
    const normalized = evaluateQueryPlan(plan)
    if (!this.db) {
      return fallbackResult(normalized)
    }
    const query = instantQueryShape(normalized)
    const result = this.db.useQuery(query as Parameters<InstantDb['useQuery']>[0])
    const rows = getCollectionRows(result.data, normalized.collection)
    if (normalized.cardinality === 'one') {
      return buildQueryResult(rows[0] ?? null, result.isLoading, result.error ?? null)
    }
    return buildQueryResult(rows, result.isLoading, result.error ?? null)
  }

  /** peekQuery reads the InstantDB reactor cache without subscribing; uses non-public Instant APIs — may return loading until `open` completes. */
  peekQuery(plan: TaoQueryPlan): TaoQueryResult {
    const normalized = evaluateQueryPlan(plan)
    if (!this.db) {
      return fallbackResult(normalized)
    }
    const q = coerceQueryShape(instantQueryShape(normalized))
    const prev = getInstantPreviousQueryResult(this.db, q)
    const rows = getCollectionRows(prev, normalized.collection)
    if (normalized.cardinality === 'one') {
      return buildQueryResult(rows[0] ?? null, !prev, null)
    }
    return buildQueryResult(rows, !prev, null)
  }

  isBusy(): boolean {
    return !this.opened
  }

  insert(collection: string, record: Record<string, unknown>): void {
    if (!this.db) {
      return
    }
    const normalized = evaluateRecordFields(record)
    const fieldTypes = this.instantMergedEntityFieldTypes(collection)
    const payload = assertNormalizedMatchesInstantEntityDecl(collection, fieldTypes, normalized)
    const rowId = IDB.id()
    void this.db.transact((this.db.tx as any)[collection][rowId].update(omitId(payload)))
  }

  /** instantMergedEntityFieldTypes mirrors `open`’s shallow merge of `entities` so insert checks match the Instant schema. */
  private instantMergedEntityFieldTypes(collection: string): Record<string, string> {
    const fields = this.shape?.entities[collection] ?? {}
    return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, taoDatasetFieldType(field)]))
  }
}

registerTaoDataProvider('InstantDB', () => new InstantDBTaoClient())

function fallbackResult(plan: TaoQueryPlan): TaoQueryResult {
  return buildQueryResult(plan.cardinality === 'one' ? null : [], true, null)
}

function instantQueryShape(plan: TaoQueryPlan): Record<string, unknown> {
  const body = includeTree(plan.includes)
  const queryOptions: Record<string, unknown> = {}
  const where = instantWhere(plan.where)
  if (where) {
    queryOptions['where'] = where
  }
  const order = instantOrder(plan)
  if (order) {
    queryOptions['order'] = order
  }
  if (Object.keys(queryOptions).length > 0) {
    body['$'] = queryOptions
  }
  return { [plan.collection]: body }
}

function includeTree(includes: readonly string[][]): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  for (const include of includes) {
    let current = root
    for (const segment of include) {
      const next = current[segment]
      if (next && typeof next === 'object') {
        current = next as Record<string, unknown>
      } else {
        const created: Record<string, unknown> = {}
        current[segment] = created
        current = created
      }
    }
  }
  return root
}

function instantWhere(predicates: readonly TaoQueryPredicate[]): unknown {
  if (predicates.length === 0) {
    return undefined
  }
  const compiled = predicates.map(instantPredicate)
  if (compiled.length === 1) {
    return compiled[0]
  }
  return { and: compiled }
}

function instantPredicate(predicate: TaoQueryPredicate): Record<string, unknown> {
  if (predicate.kind === 'and' || predicate.kind === 'or') {
    const left = instantPredicate(predicate.left)
    const right = instantPredicate(predicate.right)
    return { [predicate.kind]: [left, right] }
  }
  if (predicate.kind === 'not') {
    const inner = instantPredicate(predicate.predicate)
    return { not: inner }
  }
  return { [`${predicate.path.join('.')}`]: instantPredicateValue(predicate) }
}

function instantPredicateValue(predicate: Extract<TaoQueryPredicate, { kind: 'compare'; path: string[] }>): unknown {
  switch (predicate.op) {
    case 'is':
    case '=':
      return predicate.value
    case 'isNot':
    case '!=':
      return { $ne: predicate.value }
    case '<':
      return { $lt: predicate.value }
    case '<=':
      return { $lte: predicate.value }
    case '>':
      return { $gt: predicate.value }
    case '>=':
      return { $gte: predicate.value }
    case 'in':
      return { $in: predicate.value }
    case 'contains':
      return { [predicate.ignoreCase ? '$ilike' : '$like']: `%${String(predicate.value)}%` }
    case 'startsWith':
      return { [predicate.ignoreCase ? '$ilike' : '$like']: `${String(predicate.value)}%` }
    case 'endsWith':
      return { [predicate.ignoreCase ? '$ilike' : '$like']: `%${String(predicate.value)}` }
  }
}

function instantOrder(plan: TaoQueryPlan): Record<string, unknown> | undefined {
  if (plan.order.length === 0) {
    return undefined
  }
  const entries: [string, string][] = []
  for (const order of plan.order) {
    if (order.path.length !== 1) {
      console.warn(
        `[Tao/InstantDB] Nested order path '${
          order.path.join('.')
        }' is not supported by InstantDB and will be ignored.`,
      )
      continue
    }
    entries.push([order.path[0]!, order.direction])
  }
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

/** instantStoreConfig returns optional Instant storage overrides requested by provider params. */
function instantStoreConfig(storage: string | undefined): InstantStoreConfig {
  Assert(
    storage === undefined || storage === 'async-storage' || storage === 'mmkv',
    'InstantDB provider parameter `storage` must be "async-storage" or "mmkv" when provided',
  )
  if (storage !== 'mmkv') {
    return {}
  }
  try {
    const mod = require('@instantdb/react-native-mmkv') as { default?: InstantStoreConfig['Store'] }
    return { Store: mod.default ?? (mod as InstantStoreConfig['Store']) }
  } catch (err) {
    throw new Error(
      'InstantDB provider storage "mmkv" requires a custom native build with react-native-mmkv linked. Error: ' + err,
    )
  }
}
