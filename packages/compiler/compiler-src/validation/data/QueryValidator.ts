import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import {
  normalizedQueryFieldPathSegments,
  queryDeclarationEntity,
  queryFieldPathSegments,
} from '../../query/query-model'
import { makeValidater, type Reporter } from '../ValidationReporter'
import {
  isUnderViewDeclaration,
  validateDuplicateIdentifier,
  validateUppercaseIdentifierName,
} from './validation-utils'

export const queryValidationMessages = {
  queryNotInViewOrFile: '`query` may only appear at file level or directly inside a view body.',
  queryOneNeedsUniqueWhere: '`get one` queries must filter by `id` or a `unique` field with `is` / `=`.',
  queryPathUnknownField: (field: string, entity: string) => `Unknown query field '${field}' on entity '${entity}'.`,
  queryPathCannotTraverseScalar: (field: string) => `Query path cannot traverse through scalar field '${field}'.`,
  queryIncludeMustTargetRelationship: (path: string) =>
    `Query include '${path}' must target a relationship field, not a scalar field.`,
  queryNestedRelationshipNeedsInclude: (path: string, include: string) =>
    `Query path '${path}' traverses a relationship; add '> include ${include}'.`,
  queryOrderPathTooDeep: (path: string) =>
    `Query order path '${path}' has multiple segments; only single-field ordering is currently supported.`,
} as const

export const queryValidator: Pick<langium.ValidationChecks<AST.TaoLangAstType>, 'QueryDeclaration'> = {
  QueryDeclaration: makeValidater((node, report) => {
    validateDuplicateIdentifier(node, report)
    validateUppercaseIdentifierName(node, report)
    validateQueryPlacement(node, report)
    validateGetOneHasUniqueWhere(node, report)
    validateQueryPaths(node, report)
    validateQueryOrderDepth(node, report)
  }),
}

type QueryPathResolution = {
  readonly path: readonly string[]
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

/** validateGetOneHasUniqueWhere enforces singleton reads to target `id` or a unique field. */
function validateGetOneHasUniqueWhere(
  node: AST.QueryDeclaration,
  report: Reporter<AST.QueryDeclaration>,
): void {
  if (!AST.isQueryOneSource(node.source)) {
    return
  }
  const entity = queryDeclarationEntity(node)
  if (!entity) {
    return
  }
  if (queryHasUniqueEqualityPredicate(node, entity)) {
    return
  }
  report.error(queryValidationMessages.queryOneNeedsUniqueWhere, node)
}

/** validateQueryPaths checks query paths and requires includes for nested relationship traversal. */
function validateQueryPaths(node: AST.QueryDeclaration, report: Reporter<AST.QueryDeclaration>): void {
  const entity = queryDeclarationEntity(node)
  if (!entity) {
    return
  }
  const includeKeys = new Set<string>()
  for (const step of node.steps.filter(AST.isQueryIncludeStep)) {
    for (const path of step.paths) {
      const resolved = resolveQueryFieldPath(entity, path)
      if (resolved.error) {
        report.error(resolved.error.message, resolved.error.node)
        continue
      }
      if (!resolved.finalTarget) {
        report.error(queryValidationMessages.queryIncludeMustTargetRelationship(path.segments.join('.')), path)
        continue
      }
      includeKeys.add(pathKey(resolved.normalizedPath))
    }
  }

  for (const step of node.steps) {
    if (AST.isQueryIncludeStep(step)) {
      continue
    }
    const paths = queryStepFieldPaths(step)
    for (const path of paths) {
      const resolved = resolveQueryFieldPath(entity, path)
      if (resolved.error) {
        report.error(resolved.error.message, resolved.error.node)
        continue
      }
      const required = requiredIncludeForPath(resolved)
      if (required && !includeKeys.has(pathKey(required))) {
        report.error(
          queryValidationMessages.queryNestedRelationshipNeedsInclude(path.segments.join('.'), required.join('.')),
          path,
        )
      }
    }
  }
}

/** validateQueryOrderDepth warns when normalized order paths have multiple segments (not yet supported by providers). */
function validateQueryOrderDepth(node: AST.QueryDeclaration, report: Reporter<AST.QueryDeclaration>): void {
  const entity = queryDeclarationEntity(node)
  if (!entity) {
    return
  }
  for (const step of node.steps.filter(AST.isQueryOrderStep)) {
    const segments = normalizedQueryFieldPathSegments(step.path, entity)
    if (segments.length > 1) {
      report.warning(queryValidationMessages.queryOrderPathTooDeep(segments.join('.')), {
        node: step,
        property: 'path',
      })
    }
  }
}

function queryStepFieldPaths(step: AST.QueryPipelineStep): AST.QueryFieldPath[] {
  if (AST.isQueryOrderStep(step)) {
    return [step.path]
  }
  if (AST.isQueryWhereStep(step)) {
    return queryPredicateFieldPaths(step.predicate)
  }
  return []
}

function queryPredicateFieldPaths(predicate: AST.QueryPredicate): AST.QueryFieldPath[] {
  if (AST.isQueryComparisonPredicate(predicate)) {
    return [predicate.path]
  }
  if (AST.isQueryLogicalPredicate(predicate)) {
    return [...queryPredicateFieldPaths(predicate.left), ...queryPredicateFieldPaths(predicate.right)]
  }
  if (AST.isQueryNotPredicate(predicate)) {
    return queryPredicateFieldPaths(predicate.operand)
  }
  return []
}

function queryHasUniqueEqualityPredicate(node: AST.QueryDeclaration, entity: AST.DataEntityDeclaration): boolean {
  for (const where of node.steps.filter(AST.isQueryWhereStep)) {
    if (queryPredicateHasUniqueEquality(where.predicate, entity)) {
      return true
    }
  }
  return false
}

/** queryPredicateHasUniqueEquality checks whether the predicate guarantees at most one row. Only `and` branches are traversed; `or` is conservatively rejected because `A or B` can match multiple rows even when both arms target unique fields with different values. */
function queryPredicateHasUniqueEquality(predicate: AST.QueryPredicate, entity: AST.DataEntityDeclaration): boolean {
  if (AST.isQueryComparisonPredicate(predicate)) {
    if (!isEqualityPredicate(predicate)) {
      return false
    }
    const resolved = resolveQueryFieldPath(entity, predicate.path)
    const fieldName = resolved.normalizedPath[0]
    return resolved.normalizedPath.length === 1
      && (fieldName === 'id' || resolved.finalField?.metadata.some(m => m.kind === 'unique') === true)
  }
  if (AST.isQueryLogicalPredicate(predicate)) {
    return predicate.op === 'and'
      && (
        queryPredicateHasUniqueEquality(predicate.left, entity)
        || queryPredicateHasUniqueEquality(predicate.right, entity)
      )
  }
  if (AST.isQueryNotPredicate(predicate)) {
    return false
  }
  return false
}

function isEqualityPredicate(predicate: AST.QueryComparisonPredicate): boolean {
  if (predicate.not || predicate.membership || predicate.stringOperator) {
    return false
  }
  return predicate.is || predicate.op === '='
}

function resolveQueryFieldPath(
  entity: AST.DataEntityDeclaration,
  pathNode: AST.QueryFieldPath,
): QueryPathResolution {
  const path = queryFieldPathSegments(pathNode)
  const normalizedPath = normalizedQueryFieldPathSegments(pathNode, entity)
  const relationshipPrefixes: string[][] = []
  let current: AST.DataEntityDeclaration | undefined = entity
  let finalField: AST.DataFieldDeclaration | undefined
  let finalTarget: AST.DataEntityDeclaration | undefined

  function makeError(message: string): QueryPathResolution {
    return {
      path,
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

  return { path, normalizedPath, relationshipPrefixes, finalField, finalTarget }
}

function requiredIncludeForPath(resolved: QueryPathResolution): readonly string[] | undefined {
  if (resolved.relationshipPrefixes.length === 0) {
    return undefined
  }
  if (resolved.normalizedPath.length === 1 && resolved.finalTarget) {
    return undefined
  }
  return resolved.relationshipPrefixes[0]
}

function dataFieldTargetEntity(field: AST.DataFieldDeclaration): AST.DataEntityDeclaration | undefined {
  const dataDecl = field.$container.$container
  if (!AST.isDataDeclaration(dataDecl)) {
    return undefined
  }
  const fieldType = field.type
  const target = fieldType?.namedRef?.ref ?? fieldType?.arrayRef?.ref
  if (AST.isDataEntityDeclaration(target)) {
    return target
  }
  if (!fieldType) {
    return dataDecl.dataStatements
      .filter(AST.isDataEntityDeclaration)
      .find(entity => entity.name === field.name)
  }
  return undefined
}

function pathKey(path: readonly string[]): string {
  return path.join('.')
}
