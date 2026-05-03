import * as IDB from '@instantdb/react-native'
import { Assert } from '../../../tao-runtime/runtime-utils'
import {
  evaluateRecordFields,
  registerTaoDataProvider,
  type TaoDataClient,
  type TaoDataProviderParams,
  type TaoDatasetShape,
  type TaoQueryOpts,
  type TaoQueryResult,
} from '../tao-data-client'
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

/** buildInstantSchema constructs an `IDB.i.schema(...)` from the plain TaoDatasetShape so InstantDB gets full type info. */
function buildInstantSchema(shape: TaoDatasetShape) {
  const entities: Record<string, ReturnType<typeof IDB.i.entity>> = {}
  for (const [collection, fields] of Object.entries(shape.entities)) {
    const attrs: Record<string, ReturnType<typeof IDB.i.string>> = {}
    for (const [fieldName, fieldType] of Object.entries(fields)) {
      const factory = iTypeFns[fieldType]
      if (factory) {
        attrs[fieldName] = factory()
      } else {
        attrs[fieldName] = IDB.i.any()
      }
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
export class InstantTaoData implements TaoDataClient {
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
  useLiveQuery(collection: string, opts: TaoQueryOpts): TaoQueryResult {
    if (!this.db) {
      return fallbackResult(opts)
    }
    const result = this.db.useQuery({ [collection]: {} } as Parameters<InstantDb['useQuery']>[0])
    const rows = getCollectionRows(result.data, collection)
    if (opts.first) {
      return { data: rows[0] ?? null, isLoading: result.isLoading, error: result.error ?? null }
    }
    return { data: rows, isLoading: result.isLoading, error: result.error ?? null }
  }

  /** peekQuery reads the InstantDB reactor cache without subscribing; uses non-public Instant APIs — may return loading until `open` completes. */
  peekQuery(collection: string, opts: TaoQueryOpts): TaoQueryResult {
    if (!this.db) {
      return fallbackResult(opts)
    }
    const q = coerceQueryShape({ [collection]: {} })
    const prev = getInstantPreviousQueryResult(this.db, q)
    const rows = getCollectionRows(prev, collection)
    if (opts.first) {
      return { data: rows[0] ?? null, isLoading: !prev, error: null }
    }
    return { data: rows, isLoading: !prev, error: null }
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
    return this.shape?.entities[collection] ?? {}
  }
}

registerTaoDataProvider('InstantDB', () => new InstantTaoData())

function fallbackResult(opts: TaoQueryOpts): TaoQueryResult {
  return opts.first
    ? { data: null, isLoading: true, error: null }
    : { data: [], isLoading: true, error: null }
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
