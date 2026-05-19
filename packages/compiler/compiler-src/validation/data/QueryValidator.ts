import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import {
  dataFieldPrimitiveType,
  dataFieldTargetEntity,
  dataRowHandleForReference,
  normalizedQueryFieldPathSegments,
  queryDeclarationCardinality,
  queryDeclarationEntity,
} from '../../query/query-model'
import { makeValidater, type Reporter } from '../ValidationReporter'
import {
  directLiteralPrimitive,
  isUnderViewDeclaration,
  validateDuplicateIdentifier,
  validateUppercaseIdentifierName,
} from './validation-utils'

export const queryValidationMessages = {
  queryNotInViewOrFile: '`query` may only appear at file level or directly inside a view body.',
  queryOneNeedsUniqueWhere: '`Data.Singular` queries must filter by `id` or a `unique` field with `=`.',
  queryTargetMustBeSingularOrPlural: (target: string, singular: string, plural: string) =>
    `Query target '${target}' must be '${singular}' or '${plural}'.`,
  queryPathUnknownField: (field: string, entity: string) => `Unknown query field '${field}' on entity '${entity}'.`,
  queryPathCannotTraverseScalar: (field: string) => `Query path cannot traverse through scalar field '${field}'.`,
  queryScalarCannotHaveSelectionBlock: (field: string) =>
    `Scalar field '${field}' cannot have a nested query selection block.`,
  queryRelationshipPredicateOperator: (field: string) =>
    `Relationship predicate '${field}' only supports '=' and '!=' identity comparisons.`,
  queryRelationshipPredicateValue: (field: string) =>
    `Relationship predicate '${field}' must compare to a data row handle.`,
  queryRelationshipPredicateValueEntity: (field: string, expected: string, actual: string) =>
    `Relationship predicate '${field}' expects a '${expected}' row handle, not '${actual}'.`,
  queryNestedRelationshipPath: (path: string) =>
    `Query path '${path}' traverses a relationship; use a nested selection block instead.`,
  queryDuplicateProjection: (path: string) => `Duplicate query projection '${path}'.`,
  queryBareWherePredicate: (path: string) =>
    `where predicate '${path}' must use a comparison, 'exists', or 'missing'. Boolean fields require '= true' or '= false'.`,
  queryUnknownExistenceOperator: (op: string, path: string) =>
    `Query predicate '${path}' must use 'exists' or 'missing', not '${op}'.`,
  queryOrderDuplicate: 'Only one `order by` clause is allowed in a query selection block.',
  queryOrderUnknownField: (field: string, entity: string) => `Unknown order field '${field}' on entity '${entity}'.`,
  queryOrderMustBeScalar: (field: string) => `order by '${field}' must target a direct scalar field.`,
  queryOrderMustBeIndexed: (field: string) => `order by '${field}' requires the field to be indexed or unique.`,
  queryPredicateLiteralType: (field: string, expected: string, actual: string) =>
    `Predicate '${field}' expects ${expected}, not ${actual}.`,
  queryDateLiteralUnsupported: (field: string) =>
    `Date field '${field}' does not accept direct literals yet; use 'exists' or 'missing' for now.`,
} as const

export const queryValidator: Pick<langium.ValidationChecks<AST.TaoLangAstType>, 'QueryDeclaration'> = {
  QueryDeclaration: makeValidater((node, report) => {
    validateDuplicateIdentifier(node, report)
    validateUppercaseIdentifierName(node, report)
    validateQueryPlacement(node, report)
    validateQueryTargetName(node, report)
    validateQuerySelectionBlock(node.selection, queryDeclarationEntity(node), report)
    validateGetOneHasUniqueWhere(node, report)
  }),
}

type QueryPathResolution = {
  readonly normalizedPath: readonly string[]
  readonly relationshipPrefixes: readonly string[][]
  readonly finalField: AST.DataFieldDeclaration | undefined
  readonly finalTarget: AST.DataEntityDeclaration | undefined
  readonly error?: { readonly message: string; readonly node: AST.QueryFieldPath }
}

/** validateQueryPlacement allows top-level queries or queries inside a view body (not inside actions/apps). */
function validateQueryPlacement(node: AST.QueryDeclaration, report: Reporter<AST.QueryDeclaration>): void {
  if (AST.isTaoFile(node.$container) || isUnderViewDeclaration(node)) {
    return
  }
  report.error(queryValidationMessages.queryNotInViewOrFile, node)
}

/** validateQueryTargetName rejects schema entity spellings other than the declared singular or plural. */
function validateQueryTargetName(node: AST.QueryDeclaration, report: Reporter<AST.QueryDeclaration>): void {
  const entity = queryDeclarationEntity(node)
  if (!entity) {
    return
  }
  const target = node.target.$refText
  if (target === entity.name || target === entity.pluralName) {
    return
  }
  report.error(queryValidationMessages.queryTargetMustBeSingularOrPlural(target, entity.name, entity.pluralName), {
    node,
    property: 'target',
  })
}

/** validateGetOneHasUniqueWhere enforces singleton reads to target `id` or a unique field. */
function validateGetOneHasUniqueWhere(
  node: AST.QueryDeclaration,
  report: Reporter<AST.QueryDeclaration>,
): void {
  if (queryDeclarationCardinality(node) !== 'one') {
    return
  }
  const entity = queryDeclarationEntity(node)
  if (!entity) {
    return
  }
  if (queryHasUniqueEqualityPredicate(node.selection, entity)) {
    return
  }
  report.error(queryValidationMessages.queryOneNeedsUniqueWhere, node)
}

/** validateQuerySelectionBlock checks projection and predicate entries recursively against the current entity. */
function validateQuerySelectionBlock(
  block: AST.QuerySelectionBlock | undefined,
  entity: AST.DataEntityDeclaration | undefined,
  report: Reporter<AST.QueryDeclaration>,
): void {
  if (!entity || !block) {
    return
  }
  validateQueryOrderClauses(block, entity, report)
  for (const whereClause of block.whereClauses) {
    validateQueryFilterExpression(whereClause.expression, entity, report)
  }
  const projected = new Set<string>()
  for (const entry of block.entries) {
    const resolved = resolveQueryFieldPath(entity, entry.path)
    if (resolved.error) {
      report.error(resolved.error.message, resolved.error.node)
      continue
    }
    const pathLabel = resolved.normalizedPath.join('.')
    const isPredicate = entry.op !== undefined || entry.existence !== undefined
    const isRelationship = resolved.finalTarget !== undefined

    if (entry.existence && !validateExistenceOperator(entry.existence, pathLabel, entry, report)) {
      continue
    }

    if (
      resolved.relationshipPrefixes.length > 0
      && resolved.relationshipPrefixes[0]!.length < resolved.normalizedPath.length
    ) {
      report.error(queryValidationMessages.queryNestedRelationshipPath(pathLabel), entry.path)
      continue
    }

    if (entry.selection) {
      if (!resolved.finalTarget) {
        report.error(
          queryValidationMessages.queryScalarCannotHaveSelectionBlock(resolved.finalField?.name ?? pathLabel),
          entry.path,
        )
        continue
      }
      addProjection(projected, pathLabel, entry.path, report)
      validateQuerySelectionBlock(entry.selection, resolved.finalTarget, report)
      continue
    }

    if (entry.existence) {
      addProjection(projected, pathLabel, entry.path, report)
      continue
    }

    if (isRelationship) {
      if (!isPredicate) {
        addProjection(projected, pathLabel, entry.path, report)
      } else if (entry.op !== '=' && entry.op !== '!=') {
        report.error(queryValidationMessages.queryRelationshipPredicateOperator(pathLabel), entry.path)
      } else {
        validateRelationshipPredicateValue(pathLabel, resolved.finalTarget, entry.value, report)
      }
      continue
    }

    if (entry.op !== undefined) {
      validateScalarPredicateValue(pathLabel, resolved, entry.value, report)
    }
    addProjection(projected, pathLabel, entry.path, report)
  }
}

function validateQueryOrderClauses(
  block: AST.QuerySelectionBlock,
  entity: AST.DataEntityDeclaration,
  report: Reporter<AST.QueryDeclaration>,
): void {
  for (let i = 1; i < block.orderByClauses.length; i++) {
    report.error(queryValidationMessages.queryOrderDuplicate, block.orderByClauses[i]!)
  }
  for (const orderBy of block.orderByClauses) {
    if (orderBy.field === 'id') {
      continue
    }
    const field = entity.fields.find(f => f.name === orderBy.field)
    if (!field) {
      report.error(queryValidationMessages.queryOrderUnknownField(orderBy.field, entity.name), {
        node: orderBy,
        property: 'field',
      })
      continue
    }
    if (dataFieldTargetEntity(field) || !dataFieldPrimitiveType(field)) {
      report.error(queryValidationMessages.queryOrderMustBeScalar(orderBy.field), { node: orderBy, property: 'field' })
      continue
    }
    if (!field.metadata.some(m => m.kind === 'indexed' || m.kind === 'unique')) {
      report.error(queryValidationMessages.queryOrderMustBeIndexed(orderBy.field), { node: orderBy, property: 'field' })
    }
  }
}

function validateQueryFilterExpression(
  expr: AST.QueryFilterExpression,
  entity: AST.DataEntityDeclaration,
  report: Reporter<AST.QueryDeclaration>,
): void {
  if (AST.isQueryLogicalExpression(expr)) {
    validateQueryFilterExpression(expr.left, entity, report)
    validateQueryFilterExpression(expr.right, entity, report)
    return
  }
  if (AST.isQueryGroupedFilterExpression(expr)) {
    validateQueryFilterExpression(expr.expression, entity, report)
    return
  }
  if (AST.isQueryFieldPredicateExpression(expr)) {
    validateQueryFieldPredicateExpression(expr, entity, report)
  }
}

function validateQueryFieldPredicateExpression(
  expr: AST.QueryFieldPredicateExpression,
  entity: AST.DataEntityDeclaration,
  report: Reporter<AST.QueryDeclaration>,
): void {
  const resolved = resolveQueryFieldPath(entity, expr.path)
  if (resolved.error) {
    report.error(resolved.error.message, resolved.error.node)
    return
  }
  const pathLabel = resolved.normalizedPath.join('.')

  if (
    resolved.relationshipPrefixes.length > 0
    && resolved.relationshipPrefixes[0]!.length < resolved.normalizedPath.length
  ) {
    report.error(queryValidationMessages.queryNestedRelationshipPath(pathLabel), expr.path)
    return
  }

  if (expr.op === undefined && expr.existence === undefined) {
    report.error(queryValidationMessages.queryBareWherePredicate(pathLabel), expr.path)
    return
  }

  if (expr.existence !== undefined) {
    validateExistenceOperator(expr.existence, pathLabel, expr, report)
    return
  }

  if (resolved.finalTarget) {
    if (expr.op !== '=' && expr.op !== '!=') {
      report.error(queryValidationMessages.queryRelationshipPredicateOperator(pathLabel), expr.path)
      return
    }
    validateRelationshipPredicateValue(pathLabel, resolved.finalTarget, expr.value, report)
    return
  }

  validateScalarPredicateValue(pathLabel, resolved, expr.value, report)
}

function validateRelationshipPredicateValue(
  pathLabel: string,
  targetEntity: AST.DataEntityDeclaration,
  value: AST.Expression | undefined,
  report: Reporter<AST.QueryDeclaration>,
): void {
  if (!value || !AST.isMemberAccessExpression(value) || value.properties.length > 0) {
    report.error(queryValidationMessages.queryRelationshipPredicateValue(pathLabel), value ?? targetEntity)
    return
  }
  const actualEntity = dataRowHandleForReference(value.root.ref)?.entity
  if (!actualEntity) {
    report.error(queryValidationMessages.queryRelationshipPredicateValue(pathLabel), value)
    return
  }
  if (actualEntity !== targetEntity) {
    report.error(
      queryValidationMessages.queryRelationshipPredicateValueEntity(pathLabel, targetEntity.name, actualEntity.name),
      value,
    )
  }
}

function validateScalarPredicateValue(
  pathLabel: string,
  resolved: QueryPathResolution,
  value: AST.Expression | undefined,
  report: Reporter<AST.QueryDeclaration>,
): void {
  if (!value) {
    return
  }
  const primitive = resolved.normalizedPath[0] === 'id'
    ? 'text'
    : resolved.finalField
    ? dataFieldPrimitiveType(resolved.finalField)
    : undefined
  const actual = directLiteralPrimitive(value)
  if (!primitive || !actual) {
    return
  }
  if (primitive === 'date') {
    report.error(queryValidationMessages.queryDateLiteralUnsupported(pathLabel), value)
    return
  }
  if (actual !== 'null' && actual !== primitive) {
    report.error(queryValidationMessages.queryPredicateLiteralType(pathLabel, primitive, actual), value)
  }
}

function validateExistenceOperator(
  op: string,
  pathLabel: string,
  node: AST.Node,
  report: Reporter<AST.QueryDeclaration>,
): op is 'exists' | 'missing' {
  if (op === 'exists' || op === 'missing') {
    return true
  }
  report.error(queryValidationMessages.queryUnknownExistenceOperator(op, pathLabel), node)
  return false
}

function addProjection(
  projected: Set<string>,
  path: string,
  node: AST.QueryFieldPath,
  report: Reporter<AST.QueryDeclaration>,
): void {
  if (projected.has(path)) {
    report.error(queryValidationMessages.queryDuplicateProjection(path), node)
  }
  projected.add(path)
}

function queryHasUniqueEqualityPredicate(
  block: AST.QuerySelectionBlock | undefined,
  entity: AST.DataEntityDeclaration,
): boolean {
  if (!block) {
    return false
  }
  for (const entry of block.entries) {
    if (entry.op !== '=') {
      continue
    }
    const resolved = resolveQueryFieldPath(entity, entry.path)
    if (isUniqueEqualityPredicate(resolved)) {
      return true
    }
  }
  for (const whereClause of block.whereClauses) {
    if (filterExpressionHasUniqueEqualityPredicate(whereClause.expression, entity)) {
      return true
    }
  }
  return false
}

function filterExpressionHasUniqueEqualityPredicate(
  expr: AST.QueryFilterExpression,
  entity: AST.DataEntityDeclaration,
): boolean {
  if (AST.isQueryLogicalExpression(expr)) {
    if (expr.op === 'and') {
      return filterExpressionHasUniqueEqualityPredicate(expr.left, entity)
        || filterExpressionHasUniqueEqualityPredicate(expr.right, entity)
    }
    return false
  }
  if (AST.isQueryGroupedFilterExpression(expr)) {
    return filterExpressionHasUniqueEqualityPredicate(expr.expression, entity)
  }
  if (AST.isQueryFieldPredicateExpression(expr) && expr.op === '=') {
    return isUniqueEqualityPredicate(resolveQueryFieldPath(entity, expr.path))
  }
  return false
}

function isUniqueEqualityPredicate(resolved: QueryPathResolution): boolean {
  const fieldName = resolved.normalizedPath[0]
  return resolved.normalizedPath.length === 1
    && !resolved.finalTarget
    && (fieldName === 'id' || resolved.finalField?.metadata.some(m => m.kind === 'unique') === true)
}

function resolveQueryFieldPath(
  entity: AST.DataEntityDeclaration,
  pathNode: AST.QueryFieldPath,
): QueryPathResolution {
  const normalizedPath = normalizedQueryFieldPathSegments(pathNode, entity)
  const relationshipPrefixes: string[][] = []
  let current: AST.DataEntityDeclaration | undefined = entity
  let finalField: AST.DataFieldDeclaration | undefined
  let finalTarget: AST.DataEntityDeclaration | undefined

  function makeError(message: string): QueryPathResolution {
    return {
      normalizedPath,
      relationshipPrefixes,
      finalField,
      finalTarget,
      error: { message, node: pathNode },
    }
  }

  for (let i = 0; i < normalizedPath.length; i++) {
    const segment = normalizedPath[i]!
    if (!current) {
      return makeError(queryValidationMessages.queryPathCannotTraverseScalar(segment))
    }
    const field = current.fields.find(f => f.name === segment)
    if (!field && segment === 'id') {
      finalField = undefined
      finalTarget = undefined
      if (i < normalizedPath.length - 1) {
        return makeError(queryValidationMessages.queryPathCannotTraverseScalar(segment))
      }
      continue
    }
    if (!field) {
      return makeError(queryValidationMessages.queryPathUnknownField(segment, current.name))
    }
    finalField = field
    finalTarget = dataFieldTargetEntity(field)
    const hasMore = i < normalizedPath.length - 1
    if (finalTarget) {
      relationshipPrefixes.push(normalizedPath.slice(0, i + 1))
      current = finalTarget
    } else if (hasMore) {
      current = undefined
    }
  }

  return { normalizedPath, relationshipPrefixes, finalField, finalTarget }
}
