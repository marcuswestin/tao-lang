import { describe, expect, test } from 'bun:test'
import {
  evaluateQueryPlan,
  taoQueryIdentity,
  type TaoQueryPlan,
  type TaoQueryPredicate,
  useReactiveQueryPlan,
} from './tao-query'

describe('tao query runtime helpers:', () => {
  test('useReactiveQueryPlan subscribes expression-valued predicate values before evaluating them', () => {
    const calls: string[] = []
    const plan = makePlan({ path: ['Age'], op: '>', value: makeRuntimeExpression(calls, 30) })

    const normalized = useReactiveQueryPlan(plan)

    expect(calls).toEqual(['reactive', 'evaluate'])
    expect(normalized.where[0]?.value).toBe(30)
  })

  test('evaluateQueryPlan does not subscribe predicate values for non-reactive reads', () => {
    const calls: string[] = []
    const plan = makePlan({
      path: ['Age'],
      op: '>',
      value: makeRuntimeExpression(calls, 30),
    })

    const normalized = evaluateQueryPlan(plan)

    expect(calls).toEqual(['evaluate'])
    expect(normalized.where[0]?.value).toBe(30)
  })

  test('nested selection predicates are evaluated', () => {
    const calls: string[] = []
    const plan: TaoQueryPlan = {
      schema: 'Data',
      collection: 'People',
      cardinality: 'many',
      where: [],
      select: [{
        path: ['Friends'],
        where: [{ path: ['Age'], op: '>', value: makeRuntimeExpression(calls, 18) }],
        select: [{ path: ['Name'] }],
      }],
    }

    const normalized = evaluateQueryPlan(plan)

    expect(calls).toEqual(['evaluate'])
    expect(normalized.select[0]?.where?.[0]?.value).toBe(18)
  })

  test('filter trees and order descriptors are normalized into query identity', () => {
    const calls: string[] = []
    const plan: TaoQueryPlan = {
      schema: 'Data',
      collection: 'People',
      cardinality: 'many',
      where: [],
      filter: {
        kind: 'and',
        filters: [
          { kind: 'predicate', predicate: { path: ['Age'], op: '>', value: makeRuntimeExpression(calls, 30) } },
          { kind: 'predicate', predicate: { path: ['Email'], op: 'exists' } },
        ],
      },
      orderBy: { path: ['Age'], direction: 'desc' },
      select: [{
        path: ['Friends'],
        filter: {
          kind: 'predicate',
          predicate: { path: ['Age'], op: '>', value: makeRuntimeExpression(calls, 18) },
        },
        orderBy: { path: ['Age'], direction: 'asc' },
        select: [{ path: ['Name'] }],
      }],
    }

    const normalized = evaluateQueryPlan(plan)

    expect(calls).toEqual(['evaluate', 'evaluate'])
    expect(normalized.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'predicate', predicate: { path: ['Age'], op: '>', value: 30 } },
        { kind: 'predicate', predicate: { path: ['Email'], op: 'exists' } },
      ],
    })
    expect(normalized.orderBy).toEqual({ path: ['Age'], direction: 'desc' })
    expect(normalized.select[0]?.filter).toEqual({
      kind: 'predicate',
      predicate: { path: ['Age'], op: '>', value: 18 },
    })
    expect(taoQueryIdentity(normalized)).toContain('"orderBy":{"path":["Age"],"direction":"desc"}')
  })
})

function makePlan(predicate: TaoQueryPredicate): TaoQueryPlan {
  return {
    schema: 'Data',
    collection: 'People',
    cardinality: 'many',
    where: [predicate],
    select: [],
  }
}

function makeRuntimeExpression(calls: string[], value: unknown) {
  return {
    useReactiveHandle() {
      calls.push('reactive')
      return this
    },
    evaluate() {
      calls.push('evaluate')
      return { jsValue: value }
    },
  }
}
