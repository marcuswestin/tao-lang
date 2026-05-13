export type TaoQueryCardinality = 'many' | 'one'
export type TaoQueryOrderDirection = 'asc' | 'desc'
export type TaoQueryComparisonOperator =
  | 'is'
  | 'isNot'
  | '='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'in'
  | 'contains'
  | 'startsWith'
  | 'endsWith'

export type TaoQueryPredicate =
  | { kind: 'compare'; path: string[]; op: TaoQueryComparisonOperator; value: unknown; ignoreCase?: boolean }
  | { kind: 'and' | 'or'; left: TaoQueryPredicate; right: TaoQueryPredicate }
  | { kind: 'not'; predicate: TaoQueryPredicate }

export type TaoQueryOrder = { path: string[]; direction: TaoQueryOrderDirection }

/** TaoQueryPlan is the provider-facing structured read IR emitted by compiled Tao `query` declarations. */
export type TaoQueryPlan = {
  schema: string
  collection: string
  cardinality: TaoQueryCardinality
  where: TaoQueryPredicate[]
  order: TaoQueryOrder[]
  includes: string[][]
}

/** TaoQueryResult mirrors the { data, isLoading, error } contract consumed by guards and for-loops. */
export type TaoQueryResult = {
  data: unknown
  isLoading: boolean
  error: unknown
}

type RuntimeExprLike = {
  evaluate?: () => { jsValue: unknown }
  useReactiveHandle?: () => unknown
}

type QueryValueEvaluator = (value: unknown) => unknown

/** evaluateQueryValue converts a possible Tao runtime expression to a plain JS value. */
export function evaluateQueryValue(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const expr = value as RuntimeExprLike
    if (typeof expr.evaluate === 'function') {
      return expr.evaluate().jsValue
    }
  }
  return value
}

/** evaluateQueryPlan converts expression-valued query params such as `where Age > MinAge` to plain JS. */
export function evaluateQueryPlan(plan: TaoQueryPlan): TaoQueryPlan {
  return {
    ...plan,
    where: plan.where.map(predicate => evaluateQueryPredicate(predicate)),
  }
}

/** useReactiveQueryPlan subscribes expression-valued query params before converting them to plain JS. */
export function useReactiveQueryPlan(plan: TaoQueryPlan): TaoQueryPlan {
  return {
    ...plan,
    where: plan.where.map(predicate => evaluateQueryPredicate(predicate, useReactiveQueryValue)),
  }
}

/** taoQueryIdentity returns a deterministic JSON identity keyed by all plan inputs. Callers should pass an already-evaluated plan (via {@link evaluateQueryPlan}) to avoid redundant expression evaluation. */
export function taoQueryIdentity(plan: TaoQueryPlan): string {
  return JSON.stringify(plan)
}

/** buildQueryResult constructs a TaoQueryResult from plain provider state. */
export function buildQueryResult(
  data: unknown,
  isLoading: boolean,
  error: unknown,
): TaoQueryResult {
  return {
    data,
    isLoading,
    error,
  }
}

function evaluateQueryPredicate(
  predicate: TaoQueryPredicate,
  evaluateValue: QueryValueEvaluator = evaluateQueryValue,
): TaoQueryPredicate {
  if (predicate.kind === 'compare') {
    return { ...predicate, value: evaluateValue(predicate.value) }
  }
  if (predicate.kind === 'not') {
    return { ...predicate, predicate: evaluateQueryPredicate(predicate.predicate, evaluateValue) }
  }
  return {
    ...predicate,
    left: evaluateQueryPredicate(predicate.left, evaluateValue),
    right: evaluateQueryPredicate(predicate.right, evaluateValue),
  }
}

function useReactiveQueryValue(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const expr = value as RuntimeExprLike
    if (typeof expr.useReactiveHandle === 'function') {
      expr.useReactiveHandle()
    }
  }
  return evaluateQueryValue(value)
}
