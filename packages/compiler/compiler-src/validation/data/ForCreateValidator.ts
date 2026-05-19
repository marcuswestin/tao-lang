import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import {
  dataFieldPrimitiveType,
  dataFieldTarget,
  dataRowHandleForReference,
  queryDeclarationAliasName,
} from '../../query/query-model'
import { parameterResolvedType } from '../../tao-type-shapes'
import { makeValidater, type Reporter } from '../ValidationReporter'
import { directLiteralPrimitive, isUnderViewDeclaration } from './validation-utils'

/** forCreateMessages are diagnostics for `for` and `create` data statements. */
export const forCreateMessages = {
  forOnlyInView: '`for` may only appear directly inside a view body (not at file level or inside actions).',
  forCollectionNotListQuery: '`for` may only iterate a collection query (use `query Data.Plurals as Alias { ... }`).',
  forCollectionNotQuery: '`for` `in` must reference a query alias declared on this file or in the same view.',
  forBodyNoQuery: '`query` is not allowed inside a `for` block (queries call React hooks; hooks may not run in loops).',
  forBodyNoGuard: '`guard` is not allowed inside a `for` block — declare it directly under the view body.',
  createOnlyInAction: '`create` may only appear inside an action body.',
  createUnknownField: (field: string) => `Unknown field '${field}' for this entity.`,
  createDuplicateField: (field: string) => `Duplicate field '${field}' in create block.`,
  updateOnlyInAction: '`update` may only appear inside an action body.',
  updateTargetMustBeRowHandle: '`update` target must be an in-scope data row handle.',
  updateUnknownField: (field: string) => `Unknown field '${field}' for update target entity.`,
  updateDuplicateField: (field: string) => `Duplicate field '${field}' in update block.`,
  updateRelationshipNeedsRowHandle: (field: string) =>
    `Relationship field '${field}' must be assigned a data row handle.`,
  updateRelationshipWrongEntity: (field: string, expected: string, actual: string) =>
    `Relationship field '${field}' expects a '${expected}' row handle, not '${actual}'.`,
  updateToManyRelationshipDeferred: (field: string) =>
    `To-many relationship replacement for '${field}' is deferred; use a single-link relationship field.`,
  updateScalarLiteralType: (field: string, expected: string, actual: string) =>
    `Field '${field}' expects ${expected}, not ${actual}.`,
  dateFieldLiteralUnsupported: (field: string) =>
    `Date field '${field}' does not accept direct literals yet; use a row value or helper once date values are supported.`,
  createShorthandNeedsValue: (field: string) =>
    `Create shorthand '${field}' requires an in-scope value named '${field}'.`,
  updateShorthandNeedsValue: (field: string) =>
    `Update shorthand '${field}' requires an in-scope value named '${field}'.`,
  updateRequiresField: '`update` requires at least one field assignment.',
} as const

/** isUnderActionBody returns true when `node` is nested under a named or inline action body. */
export function isUnderActionBody(node: AST.Node): boolean {
  let c: AST.Node | undefined = node.$container
  while (c) {
    if (AST.isActionDeclaration(c) || AST.isActionExpression(c)) {
      return true
    }
    if (AST.isViewDeclaration(c) || AST.isTaoFile(c) || AST.isAppDeclaration(c)) {
      return false
    }
    c = c.$container
  }
  return false
}

/** isForStatementPlacementOk allows `for` only inside a view body (not file-level or in actions). */
export function isForStatementPlacementOk(node: AST.ForStatement): boolean {
  if (AST.isTaoFile(node.$container)) {
    return false
  }
  return isUnderViewDeclaration(node)
}

/** ForBodyHookViolation is one descendant `query` / `guard` under a `for` that would force hooks inside a loop. */
type ForBodyHookViolation = { node: AST.Node; message: string }

/** findForBodyHookViolations returns descendant `query` / `guard` nodes nested under `for` (illegal — would emit React hooks inside a loop). */
export function findForBodyHookViolations(node: AST.ForStatement): ForBodyHookViolation[] {
  const out: ForBodyHookViolation[] = []
  for (const descendant of AST.Utils.streamAllContents(node)) {
    if (AST.isQueryDeclaration(descendant)) {
      out.push({ node: descendant, message: forCreateMessages.forBodyNoQuery })
    } else if (AST.isGuardStatement(descendant)) {
      out.push({ node: descendant, message: forCreateMessages.forBodyNoGuard })
    }
  }
  return out
}

export const forCreateValidator: Pick<
  langium.ValidationChecks<AST.TaoLangAstType>,
  'CreateStatement' | 'UpdateStatement'
> = {
  CreateStatement: makeValidater((node, report) => {
    if (AST.isTaoFile(node.$container) || !isUnderActionBody(node)) {
      report.error(forCreateMessages.createOnlyInAction, node)
    }
    const entity = node.entity.ref
    if (!entity) {
      return
    }
    const seen = new Set<string>()
    for (const f of node.fields) {
      if (seen.has(f.field)) {
        report.error(forCreateMessages.createDuplicateField(f.field), { node: f, property: 'field' })
      }
      seen.add(f.field)
      const ok = entity.fields.some(df => df.name === f.field)
      if (!ok) {
        report.error(forCreateMessages.createUnknownField(f.field), { node: f, property: 'field' })
      }
      const field = entity.fields.find(df => df.name === f.field)
      if (field) {
        validateFieldAssignmentValue(f, field, report, 'create')
      }
    }
  }),

  UpdateStatement: makeValidater((node, report) => {
    if (AST.isTaoFile(node.$container) || !isUnderActionBody(node)) {
      report.error(forCreateMessages.updateOnlyInAction, node)
    }
    const entity = updateTargetEntity(node)
    if (!entity) {
      report.error(forCreateMessages.updateTargetMustBeRowHandle, { node, property: 'target' })
      return
    }
    if (node.fields.length === 0) {
      report.error(forCreateMessages.updateRequiresField, node)
    }
    const seen = new Set<string>()
    for (const f of node.fields) {
      if (seen.has(f.field)) {
        report.error(forCreateMessages.updateDuplicateField(f.field), { node: f, property: 'field' })
      }
      seen.add(f.field)
      const field = entity.fields.find(df => df.name === f.field)
      if (!field) {
        report.error(forCreateMessages.updateUnknownField(f.field), { node: f, property: 'field' })
        continue
      }
      validateFieldAssignmentValue(f, field, report, 'update')
    }
  }),
}

function validateFieldAssignmentValue(
  assignment: AST.CreateFieldAssignment,
  field: AST.DataFieldDeclaration,
  report: Reporter<AST.CreateStatement> | Reporter<AST.UpdateStatement>,
  mode: 'create' | 'update',
): void {
  const relationship = dataFieldTarget(field)
  if (relationship) {
    validateRelationshipAssignmentValue(assignment, relationship, report, mode)
    return
  }
  const primitive = dataFieldPrimitiveType(field)
  if (!assignment.value) {
    validateScalarShorthandAssignment(assignment, primitive, report, mode)
    return
  }
  const actual = assignment.value ? directLiteralPrimitive(assignment.value) : undefined
  if (!primitive || !actual) {
    return
  }
  if (primitive === 'date') {
    report.error(forCreateMessages.dateFieldLiteralUnsupported(assignment.field), assignment.value)
    return
  }
  if (actual !== 'null' && actual !== primitive) {
    report.error(forCreateMessages.updateScalarLiteralType(assignment.field, primitive, actual), assignment.value)
  }
}

function validateRelationshipAssignmentValue(
  assignment: AST.CreateFieldAssignment,
  relationship: { readonly entity: AST.DataEntityDeclaration; readonly many: boolean },
  report: Reporter<AST.CreateStatement> | Reporter<AST.UpdateStatement>,
  mode: 'create' | 'update',
): void {
  if (relationship.many && mode === 'update') {
    report.error(forCreateMessages.updateToManyRelationshipDeferred(assignment.field), {
      node: assignment,
      property: 'field',
    })
    return
  }
  if (!assignment.value) {
    validateRelationshipShorthandAssignment(assignment, relationship, report, mode)
    return
  }
  if (!AST.isMemberAccessExpression(assignment.value) || assignment.value.properties.length > 0) {
    report.error(forCreateMessages.updateRelationshipNeedsRowHandle(assignment.field), assignment.value)
    return
  }
  const actual = dataRowHandleForReference(assignment.value.root.ref)?.entity
  if (!actual) {
    report.error(forCreateMessages.updateRelationshipNeedsRowHandle(assignment.field), assignment.value)
    return
  }
  if (actual !== relationship.entity) {
    report.error(
      forCreateMessages.updateRelationshipWrongEntity(assignment.field, relationship.entity.name, actual.name),
      assignment.value,
    )
  }
}

function updateTargetEntity(node: AST.UpdateStatement): AST.DataEntityDeclaration | undefined {
  return dataRowHandleForReference(node.target.ref)?.entity
}

function validateScalarShorthandAssignment(
  assignment: AST.CreateFieldAssignment,
  primitive: AST.PrimitiveType | undefined,
  report: Reporter<AST.CreateStatement> | Reporter<AST.UpdateStatement>,
  mode: 'create' | 'update',
): void {
  const ref = findShorthandValueReference(assignment, assignment.field)
  const actual = ref ? referencePrimitiveType(ref) : undefined
  if (!ref || !primitive || !actual) {
    report.error(shorthandNeedsValueMessage(mode, assignment.field), { node: assignment, property: 'field' })
    return
  }
  if (primitive === 'date') {
    return
  }
  if (actual !== primitive) {
    report.error(forCreateMessages.updateScalarLiteralType(assignment.field, primitive, actual), {
      node: assignment,
      property: 'field',
    })
  }
}

function validateRelationshipShorthandAssignment(
  assignment: AST.CreateFieldAssignment,
  relationship: { readonly entity: AST.DataEntityDeclaration; readonly many: boolean },
  report: Reporter<AST.CreateStatement> | Reporter<AST.UpdateStatement>,
  mode: 'create' | 'update',
): void {
  const ref = findShorthandValueReference(assignment, assignment.field)
  const actual = dataRowHandleForReference(ref)?.entity
  if (!actual) {
    report.error(forCreateMessages.updateRelationshipNeedsRowHandle(assignment.field), {
      node: assignment,
      property: 'field',
    })
    return
  }
  if (actual !== relationship.entity) {
    report.error(
      forCreateMessages.updateRelationshipWrongEntity(assignment.field, relationship.entity.name, actual.name),
      { node: assignment, property: 'field' },
    )
  }
}

function shorthandNeedsValueMessage(mode: 'create' | 'update', field: string): string {
  return mode === 'create'
    ? forCreateMessages.createShorthandNeedsValue(field)
    : forCreateMessages.updateShorthandNeedsValue(field)
}

function findShorthandValueReference(
  anchor: AST.CreateFieldAssignment,
  name: string,
): AST.Referenceable | undefined {
  let current: AST.Node | undefined = anchor.$container
  while (current) {
    if (AST.isForStatement(current) && current.name === name) {
      return current
    }
    if (AST.isActionDeclaration(current) || AST.isViewDeclaration(current)) {
      const param = current.parameterList?.parameters.find(p => p.name === name)
      if (param) {
        return param
      }
    }
    if (AST.isBlock(current)) {
      const local = current.statements.find(stmt => referenceableValueName(stmt) === name)
      if (AST.isReferenceable(local)) {
        return local
      }
    }
    if (AST.isTaoFile(current)) {
      const topLevel = current.statements.find(stmt => referenceableValueName(stmt) === name)
      if (AST.isReferenceable(topLevel)) {
        return topLevel
      }
    }
    current = current.$container
  }
  return undefined
}

function referenceableValueName(ref: AST.Node | undefined): string | undefined {
  if (!ref) {
    return undefined
  }
  if (AST.isAssignmentDeclaration(ref)) {
    return ref.name
  }
  if (AST.isQueryDeclaration(ref)) {
    return queryDeclarationAliasName(ref)
  }
  if (AST.isForStatement(ref) || AST.isParameterDeclaration(ref)) {
    return ref.name
  }
  return undefined
}

function referencePrimitiveType(ref: AST.Referenceable): AST.PrimitiveType | undefined {
  if (AST.isParameterDeclaration(ref)) {
    const resolved = parameterResolvedType(ref)
    return resolved.kind === 'primitive' ? resolved.primitive : undefined
  }
  if (AST.isAssignmentDeclaration(ref) && ref.value && !AST.isObjectLiteral(ref.value)) {
    const primitive = directLiteralPrimitive(ref.value)
    return primitive === 'null' ? undefined : primitive
  }
  return undefined
}
