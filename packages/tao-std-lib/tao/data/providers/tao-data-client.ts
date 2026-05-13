import type { TaoQueryPlan, TaoQueryResult } from './tao-query'

/** TaoDatasetShape describes the entity/field layout declared by a compiled `data` block. */
export type TaoDatasetFieldShape = string | {
  type: string
  optional?: boolean
  unique?: boolean
  indexed?: boolean
}

export type TaoDatasetShape = {
  entities: Record<string, Record<string, TaoDatasetFieldShape>>
  links: Record<string, unknown>
}

export type TaoSerializedDataSchema = {
  name: string
  shape: TaoDatasetShape
}

export type TaoDataAdminPushSchemaInput = {
  schemas: TaoSerializedDataSchema[]
  params: TaoDataProviderParams
  overwrite: boolean
}

/** TaoDataAdmin is the compile-time/admin provider interface for schema management. */
export interface TaoDataAdmin {
  /** pushSchema pushes serialized Tao data schema metadata into the backing provider. */
  pushSchema(input: TaoDataAdminPushSchemaInput): Promise<unknown>
}

/** TaoDataProviderParams carries untyped runtime config passed from app bootstrap into provider init. */
export type TaoDataProviderParams = Record<string, unknown>

/** TaoDataProviderFactory constructs one registered provider implementation. */
export type TaoDataProviderFactory = () => TaoDataClient

/** TaoDataClient is the provider interface that Memory and InstantDB implementations conform to. */
export interface TaoDataClient {
  /** declareDataset registers the entity shape for this client (called at module load from compiled `data` blocks). */
  declareDataset(shape: TaoDatasetShape): void
  /** open initialises the provider with runtime params (e.g. InstantDB appId); called from app bootstrap. */
  open(params: TaoDataProviderParams): void
  /** useLiveQuery subscribes to collection data — must only run inside a React component (see {@link useTaoDataLiveQuery}). */
  useLiveQuery(plan: TaoQueryPlan): TaoQueryResult
  /** peekQuery reads current data without subscription (file-level scope or snapshot). */
  peekQuery(plan: TaoQueryPlan): TaoQueryResult
  /** isBusy returns true while the provider is still loading data. */
  isBusy(): boolean
  /** insert appends a row to the collection (local-first, then syncs for cloud providers). */
  insert(collection: string, record: Record<string, unknown>): void
}

const clients = new Map<string, TaoDataClient>()
const providerFactories = new Map<string, TaoDataProviderFactory>()

type RuntimeExprLike = { evaluate?: () => { jsValue: unknown } }

/** evaluateRecordFields converts runtime expression objects to plain JS values before persistence. */
export function evaluateRecordFields(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === 'object') {
      const expr = value as RuntimeExprLike
      if (typeof expr.evaluate === 'function') {
        out[key] = expr.evaluate().jsValue
        continue
      }
    }
    out[key] = value
  }
  return out
}

/** taoDatasetFieldType returns the primitive provider type from either legacy or structured field shape. */
export function taoDatasetFieldType(field: TaoDatasetFieldShape): string {
  return typeof field === 'string' ? field : field.type
}

/** taoDatasetFieldIsIndexed returns true when provider schema metadata should mark the field indexed. */
export function taoDatasetFieldIsIndexed(field: TaoDatasetFieldShape): boolean {
  return typeof field !== 'string' && (field.indexed === true || field.unique === true)
}

/** setTaoData installs the data client for one compiled `data` declaration. */
export function setTaoData(name: string, client: TaoDataClient): void {
  clients.set(name, client)
}

/** getTaoData returns the data client registered for `name` via {@link setTaoData}. */
export function getTaoData(name: string): TaoDataClient {
  const client = clients.get(name)
  if (!client) {
    throw new Error(`TaoDataClient '${name}' not initialised — call setTaoData before using data operations.`)
  }
  return client
}

/** registerTaoDataProvider registers a provider factory under a case-insensitive provider name. */
export function registerTaoDataProvider(name: string, factory: TaoDataProviderFactory): void {
  providerFactories.set(name.toLowerCase(), factory)
}

/** createTaoDataClient returns a provider client by name, leaving parameter validation to `client.open(...)`. */
export function createTaoDataClient(provider: string): TaoDataClient {
  const factory = providerFactories.get(provider.toLowerCase())
  if (!factory) {
    throw new Error(`Tao data provider '${provider}' is not registered.`)
  }
  return factory()
}

export type {
  TaoQueryCardinality,
  TaoQueryComparisonOperator,
  TaoQueryOrder,
  TaoQueryOrderDirection,
  TaoQueryPlan,
  TaoQueryPredicate,
  TaoQueryResult,
} from './tao-query'
