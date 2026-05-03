import * as React from 'react'
import {
  evaluateRecordFields,
  registerTaoDataProvider,
  type TaoDataClient,
  type TaoDataProviderParams,
  type TaoDatasetShape,
  type TaoQueryOpts,
  type TaoQueryResult,
} from '../tao-data-client'

/** randomRowId returns a v4 UUID using whichever `crypto` API the host exposes (RN polyfills `getRandomValues`; modern Node/web give `randomUUID`). */
function randomRowId(): string {
  const c = typeof crypto !== 'undefined' ? (crypto as Crypto & { randomUUID?: () => string }) : undefined
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

  /** useLiveQuery subscribes to in-memory row updates for one collection — must run only inside a React component. */
  useLiveQuery(collection: string, opts: TaoQueryOpts): TaoQueryResult {
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
    }, [collection])
    return this.snapshot(collection, opts)
  }

  peekQuery(collection: string, opts: TaoQueryOpts): TaoQueryResult {
    return this.snapshot(collection, opts)
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

  private snapshot(collection: string, opts: TaoQueryOpts): TaoQueryResult {
    if (!this.initialized) {
      return opts.first
        ? { data: null, isLoading: true, error: null }
        : { data: [], isLoading: true, error: null }
    }
    const list = this.rows.get(collection) ?? []
    if (opts.first) {
      return { data: list[0] ?? null, isLoading: false, error: null }
    }
    return { data: [...list], isLoading: false, error: null }
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
