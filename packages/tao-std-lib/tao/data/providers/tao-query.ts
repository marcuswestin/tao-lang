export type TaoQueryCardinality = 'many' | 'one'
export type TaoQueryComparisonOperator = '=' | '!=' | '<' | '<=' | '>' | '>='

export type TaoQueryPredicate = {
  path: string[]
  op: TaoQueryComparisonOperator
  value: unknown
  compareField?: string
  clientOnly?: boolean
}

export type TaoQuerySelection = {
  path: string[]
  select?: TaoQuerySelection[]
  where?: TaoQueryPredicate[]
}

/** TaoQueryPlan is the provider-facing structured read IR emitted by compiled Tao `query` declarations. */
export type TaoQueryPlan = {
  schema: string
  collection: string
  cardinality: TaoQueryCardinality
  select: TaoQuerySelection[]
  where: TaoQueryPredicate[]
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
    where: plan.where.map(predicate => ({ ...predicate, value: evaluateValue(predicate.value) })),
    select: plan.select.map(selection => evaluateQuerySelection(selection, evaluateValue)),
  }
}

function evaluateQuerySelection(
  selection: TaoQuerySelection,
  evaluateValue: QueryValueEvaluator,
): TaoQuerySelection {
  return {
    ...selection,
    where: selection.where?.map(predicate => ({ ...predicate, value: evaluateValue(predicate.value) })),
    select: selection.select?.map(child => evaluateQuerySelection(child, evaluateValue)),
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
