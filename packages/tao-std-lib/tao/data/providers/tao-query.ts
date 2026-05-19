export type TaoQueryCardinality = 'many' | 'one'
export type TaoQueryComparisonOperator = '=' | '!=' | '<' | '<=' | '>' | '>='
export type TaoQueryExistenceOperator = 'exists' | 'missing'
export type TaoQueryPredicateOperator = TaoQueryComparisonOperator | TaoQueryExistenceOperator
export type TaoQueryOrderDirection = 'asc' | 'desc'

export type TaoQueryPredicate = {
  path: string[]
  op: TaoQueryPredicateOperator
  value?: unknown
  compareField?: string
  clientOnly?: boolean
}

export type TaoQueryFilter =
  | { kind: 'predicate'; predicate: TaoQueryPredicate }
  | { kind: 'and' | 'or'; filters: TaoQueryFilter[] }

export type TaoQueryOrdering = {
  path: string[]
  direction: TaoQueryOrderDirection
  clientOnly?: boolean
}

export type TaoQuerySelection = {
  path: string[]
  select?: TaoQuerySelection[]
  where?: TaoQueryPredicate[]
  filter?: TaoQueryFilter
  orderBy?: TaoQueryOrdering
}

/** TaoQueryPlan is the provider-facing structured read IR emitted by compiled Tao `query` declarations. */
export type TaoQueryPlan = {
  schema: string
  collection: string
  cardinality: TaoQueryCardinality
  select: TaoQuerySelection[]
  where: TaoQueryPredicate[]
  filter?: TaoQueryFilter
  orderBy?: TaoQueryOrdering
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

/** evaluateQueryPlan converts expression-valued query params such as `Rating > MinRating` to plain JS. */
export function evaluateQueryPlan(plan: TaoQueryPlan): TaoQueryPlan {
  return evaluatePlanWith(plan, evaluateQueryValue)
}

/** useReactiveQueryPlan subscribes expression-valued query params before converting them to plain JS. */
export function useReactiveQueryPlan(plan: TaoQueryPlan): TaoQueryPlan {
  return evaluatePlanWith(plan, useReactiveQueryValue)
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

function evaluatePlanWith(plan: TaoQueryPlan, evaluateValue: QueryValueEvaluator): TaoQueryPlan {
  return {
    ...plan,
    where: plan.where.map(predicate => evaluateQueryPredicate(predicate, evaluateValue)),
    filter: evaluateQueryFilter(plan.filter, evaluateValue),
    orderBy: plan.orderBy,
    select: plan.select.map(selection => evaluateQuerySelection(selection, evaluateValue)),
  }
}

function evaluateQuerySelection(
  selection: TaoQuerySelection,
  evaluateValue: QueryValueEvaluator,
): TaoQuerySelection {
  return {
    ...selection,
    where: selection.where?.map(predicate => evaluateQueryPredicate(predicate, evaluateValue)),
    filter: evaluateQueryFilter(selection.filter, evaluateValue),
    orderBy: selection.orderBy,
    select: selection.select?.map(child => evaluateQuerySelection(child, evaluateValue)),
  }
}

function evaluateQueryFilter(
  filter: TaoQueryFilter | undefined,
  evaluateValue: QueryValueEvaluator,
): TaoQueryFilter | undefined {
  if (!filter) {
    return undefined
  }
  if (filter.kind === 'predicate') {
    return {
      kind: 'predicate',
      predicate: evaluateQueryPredicate(filter.predicate, evaluateValue),
    }
  }
  return {
    kind: filter.kind,
    filters: filter.filters.map(child => evaluateQueryFilter(child, evaluateValue)!),
  }
}

function evaluateQueryPredicate(
  predicate: TaoQueryPredicate,
  evaluateValue: QueryValueEvaluator,
): TaoQueryPredicate {
  if (!('value' in predicate)) {
    return { ...predicate }
  }
  return { ...predicate, value: evaluateValue(predicate.value) }
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
