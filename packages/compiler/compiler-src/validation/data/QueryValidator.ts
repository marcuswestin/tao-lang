import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import {
  dataFieldTargetEntity,
  normalizedQueryFieldPathSegments,
  queryDeclarationCardinality,
  queryDeclarationEntity,
} from '../../query/query-model'
import { makeValidater, type Reporter } from '../ValidationReporter'
import {
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
  queryNestedRelationshipPath: (path: string) =>
    `Query path '${path}' traverses a relationship; use a nested selection block instead.`,
  queryDuplicateProjection: (path: string) => `Duplicate query projection '${path}'.`,
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
  const projected = new Set<string>()
  for (const entry of block.entries) {
    const resolved = resolveQueryFieldPath(entity, entry.path)
    if (resolved.error) {
      report.error(resolved.error.message, resolved.error.node)
      continue
    }
    const pathLabel = resolved.normalizedPath.join('.')
    const isPredicate = entry.op !== undefined
    const isRelationship = resolved.finalTarget !== undefined

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

    if (isRelationship) {
      if (!isPredicate) {
        addProjection(projected, pathLabel, entry.path, report)
      } else if (entry.op !== '=' && entry.op !== '!=') {
        report.error(queryValidationMessages.queryRelationshipPredicateOperator(pathLabel), entry.path)
      }
      continue
    }

    addProjection(projected, pathLabel, entry.path, report)
  }
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
    const fieldName = resolved.normalizedPath[0]
    if (
      resolved.normalizedPath.length === 1
      && !resolved.finalTarget
      && (fieldName === 'id' || resolved.finalField?.metadata.some(m => m.kind === 'unique') === true)
    ) {
      return true
    }
  }
  return false
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
