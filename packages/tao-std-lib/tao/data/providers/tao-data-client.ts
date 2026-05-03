/** TaoDatasetShape describes the entity/field layout declared by a compiled `data` block. */
export type TaoDatasetShape = {
  entities: Record<string, Record<string, string>>
  links: Record<string, unknown>
}

/** TaoQueryOpts controls singular vs collection reads. */
export type TaoQueryOpts = { first: boolean }

/** TaoQueryResult mirrors the { data, isLoading, error } contract consumed by guards and for-loops. */
export type TaoQueryResult = { data: unknown; isLoading: boolean; error: unknown }

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
  useLiveQuery(collection: string, opts: TaoQueryOpts): TaoQueryResult
  /** peekQuery reads current data without subscription (file-level scope or snapshot). */
  peekQuery(collection: string, opts: TaoQueryOpts): TaoQueryResult
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
