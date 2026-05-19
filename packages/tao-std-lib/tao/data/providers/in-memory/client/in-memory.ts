import * as React from 'react'
import {
  evaluateRecordFields,
  registerTaoDataProvider,
  type TaoDataClient,
  type TaoDataProviderParams,
  taoDataRowId,
  type TaoDatasetShape,
  type TaoDataUpdatePatch,
} from '../../tao-data-client'
import {
  buildQueryResult,
  evaluateQueryPlan,
  taoQueryIdentity,
  type TaoQueryPlan,
  type TaoQueryResult,
  useReactiveQueryPlan,
} from '../../tao-query'
import { evaluateTaoQueryPredicate, projectTaoQueryRow } from '../../tao-query-projection'

type CryptoLike = {
  randomUUID?: () => string
  getRandomValues?: (array: Uint8Array) => Uint8Array
}

/** randomRowId returns a v4 UUID using whichever `crypto` API the host exposes (RN polyfills `getRandomValues`; modern Node/web give `randomUUID`). */
function randomRowId(): string {
  const c: CryptoLike | undefined = typeof crypto !== 'undefined' ? crypto : undefined
  if (c?.randomUUID) {
    return c.randomUUID()
  }
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    bytes[6] = (bytes[6]! & 0x0f) | 0x40
    bytes[8] = (bytes[8]! & 0x3f) | 0x80
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

/** MemoryTaoData implements TaoDataClient with a fully in-memory store (no persistence across refresh). */
export class MemoryTaoData implements TaoDataClient {
  private shape: TaoDatasetShape | undefined
  private initialized = false
  private readonly rows = new Map<string, Record<string, unknown>[]>()
  private readonly listeners = new Map<string, Set<() => void>>()

  declareDataset(shape: TaoDatasetShape): void {
    this.shape = shape
  }

  open(_params: TaoDataProviderParams): void {
    this.initialized = true
    for (const collection of Object.keys(this.shape?.entities ?? {})) {
      if (!this.rows.has(collection)) {
        this.rows.set(collection, [])
      }
      this.notifyBucket(collection)
    }
  }

  /** useLiveQuery subscribes to in-memory row updates for one query plan — must run only inside a React component. */
  useLiveQuery(plan: TaoQueryPlan): TaoQueryResult {
    const normalized = useReactiveQueryPlan(plan)
    const collection = normalized.collection
    const identity = taoQueryIdentity(normalized)
    const [, bump] = React.useState(0)
    React.useEffect(() => {
      let set = this.listeners.get(collection)
      if (!set) {
        set = new Set()
        this.listeners.set(collection, set)
      }
      const cb = (): void => {
        bump(x => x + 1)
      }
      set.add(cb)
      return () => {
        set.delete(cb)
      }
    }, [collection, identity])
    return this.snapshot(normalized)
  }

  peekQuery(plan: TaoQueryPlan): TaoQueryResult {
    return this.snapshot(evaluateQueryPlan(plan))
  }

  isBusy(): boolean {
    return !this.initialized
  }

  insert(collection: string, record: Record<string, unknown>): void {
    const prev = this.rows.get(collection) ?? []
    const normalized = evaluateRecordFields(record)
    const idProp = normalized['id']
    const id = typeof idProp === 'string' && idProp.length > 0 ? idProp : randomRowId()
    this.rows.set(collection, [...prev, { ...normalized, id }])
    this.notifyBucket(collection)
  }

  update(collection: string, row: unknown, patch: TaoDataUpdatePatch): void {
    const id = taoDataRowId(row)
    const prev = this.rows.get(collection) ?? []
    const index = prev.findIndex(item => Reflect.get(item, 'id') === id)
    if (index === -1) {
      throw new Error(`Tao update target row '${id}' does not exist in '${collection}'.`)
    }
    const normalized = evaluateRecordFields(patch)
    const { id: _ignoredId, ...patchWithoutId } = normalized
    const next = [...prev]
    next[index] = { ...prev[index]!, ...patchWithoutId, id }
    this.rows.set(collection, next)
    this.notifyBucket(collection)
  }

  private snapshot(plan: TaoQueryPlan): TaoQueryResult {
    if (!this.initialized) {
      return buildQueryResult(plan.cardinality === 'one' ? null : [], true, null)
    }
    const list = this.applyPlan(this.rows.get(plan.collection) ?? [], plan)
    if (plan.cardinality === 'one') {
      return buildQueryResult(
        list[0] ?? null,
        false,
        list.length > 1 ? new Error('Expected one query row.') : null,
      )
    }
    return buildQueryResult([...list], false, null)
  }

  /** applyPlan filters rows and projects the selected query shape. Relationship selections work when rows already contain nested object/array values. */
  private applyPlan(rows: readonly Record<string, unknown>[], plan: TaoQueryPlan): Record<string, unknown>[] {
    let out = [...rows]
    for (const predicate of plan.where) {
      out = out.filter(row => evaluateTaoQueryPredicate(row, predicate))
    }
    return out.map(row => projectTaoQueryRow(row, plan.select))
  }

  private notifyBucket(key: string): void {
    const set = this.listeners.get(key)
    if (!set) {
      return
    }
    for (const fn of set) {
      fn()
    }
  }
}

registerTaoDataProvider('Memory', () => new MemoryTaoData())
