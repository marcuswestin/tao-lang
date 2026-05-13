import { describe, expect, test } from 'bun:test'
import { evaluateQueryPlan, type TaoQueryPlan, type TaoQueryPredicate, useReactiveQueryPlan } from './tao-query'

describe('tao query runtime helpers:', () => {
  test('useReactiveQueryPlan subscribes expression-valued predicate values before evaluating them', () => {
    const calls: string[] = []
    const plan = makePlan({
      kind: 'and',
      left: {
        kind: 'compare',
        path: ['Age'],
        op: '>',
        value: makeRuntimeExpression(calls, 30),
      },
      right: {
        kind: 'not',
        predicate: {
          kind: 'compare',
          path: ['Name'],
          op: '=',
          value: 'Ada',
        },
      },
    })

    const normalized = useReactiveQueryPlan(plan)

    expect(calls).toEqual(['reactive', 'evaluate'])
    expect(compareLeft(normalized.where[0]).value).toBe(30)
  })

  test('evaluateQueryPlan does not subscribe predicate values for non-reactive reads', () => {
    const calls: string[] = []
    const plan = makePlan({
      kind: 'compare',
      path: ['Age'],
      op: '>',
      value: makeRuntimeExpression(calls, 30),
    })

    const normalized = evaluateQueryPlan(plan)

    expect(calls).toEqual(['evaluate'])
    expect(compare(normalized.where[0]).value).toBe(30)
  })
})

function makePlan(predicate: TaoQueryPredicate): TaoQueryPlan {
  return {
    schema: 'Data',
    collection: 'People',
    cardinality: 'many',
    where: [predicate],
    order: [],
    includes: [],
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

function compare(predicate: TaoQueryPredicate): Extract<TaoQueryPredicate, { kind: 'compare' }> {
  expect(predicate.kind).toBe('compare')
  return predicate as Extract<TaoQueryPredicate, { kind: 'compare' }>
}

function compareLeft(predicate: TaoQueryPredicate): Extract<TaoQueryPredicate, { kind: 'compare' }> {
  expect(predicate.kind).toBe('and')
  return compare((predicate as Extract<TaoQueryPredicate, { kind: 'and' }>).left)
}
