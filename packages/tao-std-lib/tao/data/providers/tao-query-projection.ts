import { switch_Exhaustive } from '../../tao-runtime/runtime-utils'
import type { TaoQueryFilter, TaoQueryOrdering, TaoQueryPredicate, TaoQuerySelection } from './tao-query'

/** taoQueryComparableValue normalizes nested row objects: uses `compareField` when set, otherwise a string `id` when present, so identity predicates match provider-shaped values. */
export function taoQueryComparableValue(value: unknown, compareField?: string): unknown {
  if (taoQueryIsRecord(value)) {
    if (compareField) {
      const compared = Reflect.get(value, compareField)
      if (compared !== undefined) {
        return compared
      }
    }
    const id = Reflect.get(value, 'id')
    if (typeof id === 'string') {
      return id
    }
  }
  return value
}

/** evaluateTaoQueryPredicate evaluates one comparison predicate against a flat row map. */
export function evaluateTaoQueryPredicate(row: Record<string, unknown>, predicate: TaoQueryPredicate): boolean {
  const actual = valueAtPath(row, predicate.path)
  const expected = predicate.value
  const comparedActual = taoQueryComparableValue(actual, predicate.compareField)
  const comparedExpected = taoQueryComparableValue(expected, predicate.compareField)
  return switch_Exhaustive(predicate.op, {
    '=': () => taoQueryValuesMatch(actual, expected, predicate.compareField),
    '!=': () => !taoQueryValuesMatch(actual, expected, predicate.compareField),
    '<': () => comparePrimitive(comparedActual, comparedExpected) < 0,
    '<=': () => comparePrimitive(comparedActual, comparedExpected) <= 0,
    '>': () => comparePrimitive(comparedActual, comparedExpected) > 0,
    '>=': () => comparePrimitive(comparedActual, comparedExpected) >= 0,
    exists: () => actual !== null && actual !== undefined,
    missing: () => actual === null || actual === undefined,
  })
}

/** evaluateTaoQueryFilter evaluates a boolean query filter tree against one provider row. */
export function evaluateTaoQueryFilter(
  row: Record<string, unknown>,
  filter: TaoQueryFilter | undefined,
): boolean {
  if (!filter) {
    return true
  }
  if (filter.kind === 'predicate') {
    return evaluateTaoQueryPredicate(row, filter.predicate)
  }
  if (filter.kind === 'and') {
    return filter.filters.every(child => evaluateTaoQueryFilter(row, child))
  }
  return filter.filters.some(child => evaluateTaoQueryFilter(row, child))
}

/** sortTaoQueryRows returns rows ordered by a provider query descriptor without mutating the input rows. */
export function sortTaoQueryRows(
  rows: readonly Record<string, unknown>[],
  orderBy: TaoQueryOrdering | undefined,
): Record<string, unknown>[] {
  const out = [...rows]
  if (!orderBy) {
    return out
  }
  out.sort((a, b) => compareRows(a, b, orderBy))
  return out
}

/** projectTaoQueryRow applies a compiled selection tree to one provider row (nested values when already present). */
export function projectTaoQueryRow(
  row: Record<string, unknown>,
  selections: readonly TaoQuerySelection[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  copyHiddenId(row, out)
  for (const selection of selections) {
    if (selection.path.length !== 1) {
      continue
    }
    const key = selection.path[0]!
    const value = row[key]
    if (key === 'id') {
      Object.defineProperty(out, 'id', { value, enumerable: true, configurable: true })
      continue
    }
    if (selection.select !== undefined) {
      out[key] = projectRelationshipValue(value, selection)
    } else {
      out[key] = value
    }
  }
  return out
}

/** taoQueryIsRecord narrows unknown values to plain object rows for filtering. */
export function taoQueryIsRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function compareRows(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  orderBy: TaoQueryOrdering,
): number {
  const aValue = taoQueryComparableValue(valueAtPath(a, orderBy.path))
  const bValue = taoQueryComparableValue(valueAtPath(b, orderBy.path))
  const result = comparePrimitive(aValue, bValue)
  return orderBy.direction === 'desc' ? -result : result
}

function valueAtPath(row: Record<string, unknown>, path: readonly string[]): unknown {
  let current: unknown = row
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function comparePrimitive(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b)
  }
  return String(a).localeCompare(String(b))
}

function taoQueryValuesMatch(actual: unknown, expected: unknown, compareField: string | undefined): boolean {
  if (Array.isArray(actual)) {
    return actual.some(item => taoQueryValuesMatch(item, expected, compareField))
  }
  if (Array.isArray(expected)) {
    return expected.some(item => taoQueryValuesMatch(actual, item, compareField))
  }
  return Object.is(
    taoQueryComparableValue(actual, compareField),
    taoQueryComparableValue(expected, compareField),
  )
}

function projectRelationshipValue(value: unknown, selection: TaoQuerySelection): unknown {
  const matchesWhere = (row: Record<string, unknown>): boolean =>
    (selection.where?.every(predicate => evaluateTaoQueryPredicate(row, predicate)) ?? true)
    && evaluateTaoQueryFilter(row, selection.filter)
  if (Array.isArray(value)) {
    const rows = value.filter(taoQueryIsRecord).filter(matchesWhere)
    return sortTaoQueryRows(rows, selection.orderBy)
      .map(item => projectTaoQueryRow(item, selection.select ?? []))
  }
  if (!taoQueryIsRecord(value)) {
    return value
  }
  if (!matchesWhere(value)) {
    return null
  }
  return projectTaoQueryRow(value, selection.select ?? [])
}

function copyHiddenId(source: Record<string, unknown>, target: Record<string, unknown>): void {
  const id = Reflect.get(source, 'id')
  if (typeof id !== 'string') {
    return
  }
  Object.defineProperty(target, 'id', {
    value: id,
    enumerable: false,
    configurable: true,
  })
}
