import { describe, expect, test } from 'bun:test'
import type { TaoQueryPlan } from '../../tao-query'
import { instantQueryShape, instantResultRows } from './instant-query'
import {
  instantInsertChunk,
  instantStrictUpdateChunk,
  instantStrictUpdateOptions,
} from './instant-write'
import { InstantDBTaoClient } from './InstantDBTaoClient'

describe('InstantDBTaoClient query planning:', () => {
  test('lowers server-safe where and order while preserving JS fallback semantics', () => {
    const currentUser = { id: 'person-1' }
    const data = {
      events: [
        {
          id: 'event-1',
          Title: 'Sooner',
          Ordering: 1,
          Cancelled: false,
          Status: 'open',
          Host: { id: 'person-1' },
        },
        {
          id: 'event-2',
          Title: 'Later',
          Ordering: 2,
          Cancelled: false,
          Summary: undefined,
          Status: 'closed',
          Host: { id: 'person-1' },
        },
        {
          id: 'event-3',
          Ordering: 3,
          Cancelled: false,
          Status: 'open',
          Host: { id: 'person-1' },
        },
        {
          id: 'event-4',
          Title: 'Other Host',
          Ordering: 4,
          Cancelled: false,
          Status: 'open',
          Host: { id: 'person-2' },
        },
      ],
    }
    const plan = makePlan(currentUser)

    expect(instantQueryShape(plan)).toEqual({
      events: {
        $: {
          where: {
            and: [
              { Title: { $isNull: false } },
              { Cancelled: false },
              { or: [{ Status: 'open' }, { Summary: { $isNull: true } }] },
            ],
          },
          order: { Ordering: 'desc' },
        },
      },
    })
    expect(JSON.stringify(instantQueryShape(plan))).not.toContain('Host')
    expect(rowTitles(instantResultRows(data, plan))).toEqual(['Later', 'Sooner'])
  })

  test('lowers ascending order explicitly', () => {
    const plan = makePlan({ id: 'person-1' })
    plan.where = []
    plan.filter = undefined
    plan.orderBy = { path: ['Ordering'], direction: 'asc' }

    expect(instantQueryShape(plan)).toEqual({
      events: {
        $: {
          order: { Ordering: 'asc' },
        },
      },
    })
  })

  test('does not lower mixed or filters when one branch is client-only', () => {
    const currentUser = { id: 'person-1' }
    const plan = makePlan(currentUser)
    plan.where = []
    plan.filter = {
      kind: 'or',
      filters: [
        { kind: 'predicate', predicate: { path: ['Status'], op: '=', value: 'open' } },
        {
          kind: 'predicate',
          predicate: { path: ['Host'], op: '=', value: currentUser, compareField: 'id', clientOnly: true },
        },
      ],
    }
    plan.orderBy = undefined

    expect(instantQueryShape(plan)).toEqual({ events: {} })
    expect(rowTitles(instantResultRows({
      events: [
        { id: 'event-1', Title: 'Open', Status: 'open', Host: { id: 'person-2' } },
        { id: 'event-2', Title: 'Mine', Status: 'closed', Host: { id: 'person-1' } },
        { id: 'event-3', Title: 'Other', Status: 'closed', Host: { id: 'person-2' } },
      ],
    }, plan))).toEqual(['Open', 'Mine'])
  })

  test('uses strict update options only for InstantDB row-handle updates', () => {
    const calls: unknown[] = []
    const db = {
      tx: {
        rsvps: {
          'rsvp-1': {
            update: (payload: Record<string, unknown>, options?: unknown) => {
              calls.push({ payload, options })
              return { payload, options }
            },
          },
        },
      },
    }

    expect(instantInsertChunk(db, 'rsvps', 'rsvp-1', { Status: 'going' })).toEqual({
      payload: { Status: 'going' },
      options: undefined,
    })
    expect(instantStrictUpdateChunk(db, 'rsvps', 'rsvp-1', { Status: 'no' })).toEqual({
      payload: { Status: 'no' },
      options: instantStrictUpdateOptions,
    })
    expect(calls).toEqual([
      { payload: { Status: 'going' }, options: undefined },
      { payload: { Status: 'no' }, options: { upsert: false } },
    ])
    expect(instantStrictUpdateOptions).toEqual({ upsert: false })
  })

  test('accepts only Unix millisecond numbers for Tao date values', () => {
    const { db, calls } = instantDbMock('events')
    const client = new InstantDBTaoClient()
    client.declareDataset({
      entities: {
        events: { StartsAt: { type: 'date' } },
      },
      links: {},
    })
    const writableClient = client as unknown as { db: unknown }
    writableClient.db = db

    expect(() => client.insert('events', { StartsAt: new Date(0) }))
      .toThrow('expected Unix millisecond date')
    expect(calls).toHaveLength(0)

    client.insert('events', { StartsAt: 0 })
    expect(calls).toHaveLength(1)
    expect(typeof calls[0]?.rowId).toBe('string')
    expect(calls[0]?.payload).toEqual({ StartsAt: 0 })
    expect(calls[0]?.options).toBeUndefined()
  })
})

function makePlan(currentUser: Record<string, unknown>): TaoQueryPlan {
  return {
    schema: 'Data',
    collection: 'events',
    cardinality: 'many',
    where: [
      { path: ['Title'], op: 'exists' },
      { path: ['Host'], op: '=', value: currentUser, compareField: 'id', clientOnly: true },
    ],
    filter: {
      kind: 'and',
      filters: [
        { kind: 'predicate', predicate: { path: ['Cancelled'], op: '=', value: false } },
        {
          kind: 'or',
          filters: [
            { kind: 'predicate', predicate: { path: ['Status'], op: '=', value: 'open' } },
            { kind: 'predicate', predicate: { path: ['Summary'], op: 'missing' } },
          ],
        },
      ],
    },
    orderBy: { path: ['Ordering'], direction: 'desc' },
    select: [{ path: ['Title'] }],
  }
}

function rowTitles(data: unknown): string[] {
  return (data as Record<string, unknown>[]).map(row => row['Title'] as string)
}

type InstantDbMutationCall = {
  readonly rowId: string
  readonly payload: Record<string, unknown>
  readonly options: unknown
}

function instantDbMock(collection: string): { readonly db: unknown; readonly calls: InstantDbMutationCall[] } {
  const calls: InstantDbMutationCall[] = []
  const rows = new Proxy<Record<string, { update: (payload: Record<string, unknown>, options?: unknown) => unknown }>>(
    {},
    {
      get: (_target, rowId) => {
        if (typeof rowId !== 'string') {
          return undefined
        }
        return {
          update: (payload: Record<string, unknown>, options?: unknown) => {
            const call = { rowId, payload, options }
            calls.push(call)
            return call
          },
        }
      },
    },
  )
  return {
    calls,
    db: {
      tx: { [collection]: rows },
      transact: (_chunk: unknown) => undefined,
    },
  }
}
