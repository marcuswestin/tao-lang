import { switch_Exhaustive } from '../../../../tao-runtime/runtime-utils'
import type {
  TaoQueryFilter,
  TaoQueryOrdering,
  TaoQueryPlan,
  TaoQueryPredicate,
  TaoQueryPredicateOperator,
} from '../../tao-query'
import {
  evaluateTaoQueryFilter,
  evaluateTaoQueryPredicate,
  projectTaoQueryRow,
  sortTaoQueryRows,
  taoQueryComparableValue,
  taoQueryIsRecord,
} from '../../tao-query-projection'

/** instantQueryShape lowers server-safe Tao query pieces into InstaQL. */
export function instantQueryShape(plan: TaoQueryPlan): Record<string, unknown> {
  // V1 serializes Tao relationships as Instant attributes (`any`), not links.
  // Projection and relationship identity predicates run client-side over those returned attributes.
  const body: Record<string, unknown> = {}
  const queryOptions: Record<string, unknown> = {}
  const where = instantWhere(plan.where, plan.filter)
  if (where) {
    queryOptions['where'] = where
  }
  const order = instantOrder(plan.orderBy)
  if (order) {
    queryOptions['order'] = order
  }
  if (Object.keys(queryOptions).length > 0) {
    body['$'] = queryOptions
  }
  return { [plan.collection]: body }
}

/**
 * instantResultRows loads the collection from Instant, applies the complete Tao filter/order plan in JS,
 * then projects. InstaQL receives only direct-field server-safe pieces, so this remains the semantic fallback.
 */
export function instantResultRows(data: unknown, plan: TaoQueryPlan): Record<string, unknown>[] {
  const rows = getCollectionRows(data, plan.collection)
    .filter(taoQueryIsRecord)
    .filter(row => plan.where.every(predicate => evaluateTaoQueryPredicate(row, predicate)))
    .filter(row => evaluateTaoQueryFilter(row, plan.filter))
  return sortTaoQueryRows(rows, plan.orderBy)
    .map(row => projectTaoQueryRow(row, plan.select))
}

function getCollectionRows(data: unknown, collection: string): unknown[] {
  if (!data || typeof data !== 'object') {
    return []
  }
  const rows = (data as Record<string, unknown>)[collection]
  return Array.isArray(rows) ? [...rows] : []
}

function instantWhere(predicates: readonly TaoQueryPredicate[], filter: TaoQueryFilter | undefined): unknown {
  const parts: unknown[] = []
  for (const predicate of predicates) {
    const compiled = instantPredicate(predicate)
    if (compiled) {
      parts.push(compiled)
    }
  }
  const compiledFilter = instantFilter(filter)
  if (compiledFilter) {
    parts.push(compiledFilter)
  }
  return instantWhereParts('and', parts)
}

function isInstantServerPredicate(
  predicate: TaoQueryPredicate,
): predicate is TaoQueryPredicate & { op: TaoQueryPredicateOperator } {
  return predicate.clientOnly !== true && predicate.compareField === undefined && predicate.path.length === 1
}

function instantPredicate(predicate: TaoQueryPredicate): Record<string, unknown> | undefined {
  if (!isInstantServerPredicate(predicate)) {
    return undefined
  }
  return { [`${predicate.path.join('.')}`]: instantPredicateValue(predicate) }
}

function instantPredicateValue(predicate: TaoQueryPredicate & { op: TaoQueryPredicateOperator }): unknown {
  const compared = taoQueryComparableValue(predicate.value, predicate.compareField)
  return switch_Exhaustive(predicate.op, {
    '=': () => compared,
    '!=': () => ({ $ne: compared }),
    '<': () => ({ $lt: predicate.value }),
    '<=': () => ({ $lte: predicate.value }),
    '>': () => ({ $gt: predicate.value }),
    '>=': () => ({ $gte: predicate.value }),
    exists: () => ({ $isNull: false }),
    missing: () => ({ $isNull: true }),
  })
}

function instantFilter(filter: TaoQueryFilter | undefined): unknown {
  if (!filter) {
    return undefined
  }
  if (filter.kind === 'predicate') {
    return instantPredicate(filter.predicate)
  }
  const compiled = filter.filters.map(instantFilter)
  if (filter.kind === 'or' && compiled.some(part => part === undefined)) {
    return undefined
  }
  return instantWhereParts(filter.kind, compiled.filter(part => part !== undefined))
}

function instantWhereParts(kind: 'and' | 'or', parts: readonly unknown[]): unknown {
  const flattened = parts.flatMap(part => instantLogicalParts(kind, part) ?? [part])
  if (flattened.length === 0) {
    return undefined
  }
  if (flattened.length === 1) {
    return flattened[0]
  }
  return { [kind]: flattened }
}

function instantLogicalParts(kind: 'and' | 'or', part: unknown): unknown[] | undefined {
  if (!part || typeof part !== 'object') {
    return undefined
  }
  const value = Reflect.get(part, kind)
  return Array.isArray(value) ? value : undefined
}

function instantOrder(orderBy: TaoQueryOrdering | undefined): Record<string, string> | undefined {
  if (!orderBy || orderBy.clientOnly === true || orderBy.path.length !== 1) {
    return undefined
  }
  return { [orderBy.path[0]!]: orderBy.direction }
}
