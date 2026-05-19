import { AST } from '@parser/parser'
import { primitiveBaseOfDeclaredType, resolveTypeExpression } from '../tao-type-shapes'

export type TaoQueryCardinality = 'many' | 'one'

export type DataRowHandleResolution = {
  readonly entity: AST.DataEntityDeclaration
  readonly sourceKind: 'singleton-query' | 'query-row' | 'action-parameter'
}

export type QueryRowPathKind =
  | { readonly kind: 'primitive'; readonly primitive: AST.PrimitiveType }
  | { readonly kind: 'object' }
  | { readonly kind: 'unknown'; readonly field: string; readonly index: number }
  | { readonly kind: 'unselected'; readonly field: string; readonly index: number; readonly queryName: string }
  | { readonly kind: 'cannotTraverse'; readonly field: string; readonly index: number }
  | { readonly kind: 'unresolved' }

/** queryDeclarationAliasName returns the binding name exposed by a query, including V1 default aliases. */
export function queryDeclarationAliasName(node: AST.QueryDeclaration): string {
  if (node.name) {
    return node.name
  }
  const targetRef = node.target
  if (!targetRef) {
    return '<invalid-query>'
  }
  const target = targetRef.ref
  if (!target) {
    return targetRef.$refText
  }
  return queryDeclarationCardinality(node) === 'many' ? target.pluralName : target.name
}

/** queryDeclarationCardinality returns whether a query produces many rows or one nullable row.
 *
 * Cardinality is discriminated by the spelling the author wrote (`Data.People` vs `Data.Person`),
 * because the grammar reuses one `target` reference for both singular and plural entity names via
 * the `'both'` scope (see `TaoScopeProvider.getDataSchemaEntityScope`). When the reference fails
 * to resolve, callers either skip this check entirely (validation) or fall back to `'one'` — the
 * codegen path is gated on a separate `entity` Assert that fires first. */
export function queryDeclarationCardinality(node: AST.QueryDeclaration): TaoQueryCardinality {
  const target = node.target?.ref
  return target && node.target.$refText === target.pluralName ? 'many' : 'one'
}

/** queryDeclarationEntity resolves the entity targeted by a selection-block query. */
export function queryDeclarationEntity(node: AST.QueryDeclaration): AST.DataEntityDeclaration | undefined {
  return node.target?.ref
}

/** dataEntityNamedInFile finds a data entity visible from the Tao file that contains `anchor`.
 * V1 row-handle shorthand does not resolve data entities across files. */
export function dataEntityNamedInFile(anchor: AST.Node, name: string): AST.DataEntityDeclaration | undefined {
  const root = AST.Utils.findRootNode(anchor)
  if (!AST.isTaoFile(root)) {
    return undefined
  }
  for (const dataDecl of root.statements.filter(AST.isDataDeclaration)) {
    const entity = dataDecl.dataStatements
      .filter(AST.isDataEntityDeclaration)
      .find(e => e.name === name)
    if (entity) {
      return entity
    }
  }
  return undefined
}

/** actionParameterDataRowHandleEntity resolves the V1 shorthand `action X Rsvp { ... }` row-handle form. */
export function actionParameterDataRowHandleEntity(
  param: AST.ParameterDeclaration,
): AST.DataEntityDeclaration | undefined {
  if (param.type || param.localSuperType) {
    return undefined
  }
  let current: AST.Node | undefined = param.$container
  while (current) {
    if (AST.isActionDeclaration(current)) {
      return dataEntityNamedInFile(param, param.name)
    }
    if (AST.isViewDeclaration(current) || AST.isTaoFile(current)) {
      return undefined
    }
    current = current.$container
  }
  return undefined
}

/** dataRowHandleForReference resolves references that are guaranteed to denote one data row handle in V1. */
export function dataRowHandleForReference(
  ref: AST.Referenceable | undefined,
): DataRowHandleResolution | undefined {
  if (AST.isQueryDeclaration(ref)) {
    if (queryDeclarationCardinality(ref) !== 'one') {
      return undefined
    }
    const entity = queryDeclarationEntity(ref)
    return entity ? { entity, sourceKind: 'singleton-query' } : undefined
  }
  if (AST.isForStatement(ref)) {
    const query = ref.collection.ref
    const entity = AST.isQueryDeclaration(query) ? queryDeclarationEntity(query) : undefined
    return entity ? { entity, sourceKind: 'query-row' } : undefined
  }
  if (AST.isParameterDeclaration(ref)) {
    const entity = actionParameterDataRowHandleEntity(ref)
    return entity ? { entity, sourceKind: 'action-parameter' } : undefined
  }
  return undefined
}

/** queryDeclarationSourceText returns the source token text used when the entity reference is unresolved. */
export function queryDeclarationSourceText(node: AST.QueryDeclaration): string {
  return `${node.schema?.$refText ?? '<invalid-schema>'}.${node.target?.$refText ?? '<invalid-target>'}`
}

/** queryFieldPathSegments returns a plain segment array for a query field path. */
export function queryFieldPathSegments(path: AST.QueryFieldPath): readonly string[] {
  return path.segments
}

/** normalizedQueryFieldPathSegments strips an optional root entity name from a query path. */
export function normalizedQueryFieldPathSegments(
  path: AST.QueryFieldPath,
  entity: AST.DataEntityDeclaration,
): readonly string[] {
  const segments = queryFieldPathSegments(path)
  return segments[0] === entity.name || segments[0] === entity.pluralName ? segments.slice(1) : segments
}

/** dataFieldTargetEntity returns the data entity referenced by a relationship-like field. */
export function dataFieldTargetEntity(field: AST.DataFieldDeclaration): AST.DataEntityDeclaration | undefined {
  return dataFieldTarget(field)?.entity
}

/** dataFieldTarget returns the entity targeted by a relationship-like field plus whether the field is to-many. */
export function dataFieldTarget(
  field: AST.DataFieldDeclaration,
): { readonly entity: AST.DataEntityDeclaration; readonly many: boolean } | undefined {
  const dataDecl = field.$container.$container
  if (!AST.isDataDeclaration(dataDecl)) {
    return undefined
  }
  const fieldType = field.type
  const arrayTarget = fieldType?.arrayRef?.ref
  if (AST.isDataEntityDeclaration(arrayTarget)) {
    return { entity: arrayTarget, many: true }
  }
  const namedTarget = fieldType?.namedRef?.ref
  if (AST.isDataEntityDeclaration(namedTarget)) {
    return { entity: namedTarget, many: false }
  }
  if (!fieldType) {
    const target = dataDecl.dataStatements
      .filter(AST.isDataEntityDeclaration)
      .find(entity => entity.name === field.name)
    return target ? { entity: target, many: false } : undefined
  }
  return undefined
}

/** dataFieldPrimitiveType returns the Tao primitive carried by a scalar data field, including data-scoped
 * type aliases and shorthand fields that name a data-scoped type. Relationship fields return undefined. */
export function dataFieldPrimitiveType(field: AST.DataFieldDeclaration): AST.PrimitiveType | undefined {
  const fieldType = field.type
  if (fieldType?.primitiveType !== undefined) {
    return fieldType.primitiveType
  }

  const namedTarget = fieldType?.namedRef?.ref
  if (AST.isDataTypeDeclaration(namedTarget)) {
    return dataTypePrimitiveType(namedTarget)
  }
  if (AST.isTypeDeclaration(namedTarget)) {
    return primitiveBaseOfDeclaredType(namedTarget)
  }

  if (!fieldType) {
    const dataDecl = field.$container.$container
    if (!AST.isDataDeclaration(dataDecl)) {
      return undefined
    }
    const dataType = dataDecl.dataStatements
      .filter(AST.isDataTypeDeclaration)
      .find(typeDecl => typeDecl.name === field.name)
    return dataType ? dataTypePrimitiveType(dataType) : undefined
  }

  return undefined
}

/** queryRowPathKind classifies a member path rooted at a `for` row binding. */
export function queryRowPathKind(forStatement: AST.ForStatement, path: readonly string[]): QueryRowPathKind {
  const query = forStatement.collection.ref
  if (!AST.isQueryDeclaration(query)) {
    return { kind: 'unresolved' }
  }
  const entity = queryDeclarationEntity(query)
  if (!entity) {
    return { kind: 'unresolved' }
  }
  return querySelectionPathKind(query.selection, entity, path, queryDeclarationAliasName(query), 0)
}

function dataTypePrimitiveType(decl: AST.DataTypeDeclaration): AST.PrimitiveType | undefined {
  const resolved = resolveTypeExpression(decl.base)
  return resolved.kind === 'primitive' ? resolved.primitive : undefined
}

function querySelectionPathKind(
  block: AST.QuerySelectionBlock | undefined,
  entity: AST.DataEntityDeclaration,
  path: readonly string[],
  queryName: string,
  offset: number,
): QueryRowPathKind {
  if (path.length === 0) {
    return { kind: 'object' }
  }

  const fieldName = path[0]!
  const rest = path.slice(1)
  if (fieldName === 'id') {
    return rest.length === 0
      ? { kind: 'primitive', primitive: 'text' }
      : { kind: 'cannotTraverse', field: rest[0]!, index: offset + 1 }
  }

  const field = entity.fields.find(f => f.name === fieldName)
  if (!field) {
    return { kind: 'unknown', field: fieldName, index: offset }
  }

  const selection = selectedQueryEntryForField(block, entity, fieldName)
  if (selection === undefined && !queryDefaultsSelectField(block, field)) {
    return { kind: 'unselected', field: fieldName, index: offset, queryName }
  }

  const target = dataFieldTarget(field)
  if (target !== undefined) {
    if (rest.length === 0) {
      return { kind: 'object' }
    }
    if (target.many) {
      return { kind: 'cannotTraverse', field: rest[0]!, index: offset + 1 }
    }
    return querySelectionPathKind(selection?.selection, target.entity, rest, queryName, offset + 1)
  }

  const primitive = dataFieldPrimitiveType(field)
  if (rest.length > 0) {
    return { kind: 'cannotTraverse', field: rest[0]!, index: offset + 1 }
  }
  return primitive ? { kind: 'primitive', primitive } : { kind: 'object' }
}

function selectedQueryEntryForField(
  block: AST.QuerySelectionBlock | undefined,
  entity: AST.DataEntityDeclaration,
  fieldName: string,
): AST.QuerySelectionEntry | undefined {
  if (!block || block.entries.length === 0) {
    return undefined
  }
  return block.entries.find(entry =>
    normalizedQueryFieldPathSegments(entry.path, entity)[0] === fieldName
    && queryEntryProjects(entry, entity)
  )
}

function queryEntryProjects(entry: AST.QuerySelectionEntry, entity: AST.DataEntityDeclaration): boolean {
  if (entry.selection) {
    return true
  }
  const fieldName = normalizedQueryFieldPathSegments(entry.path, entity)[0]
  const field = entity.fields.find(f => f.name === fieldName)
  const target = field ? dataFieldTarget(field) : undefined
  return entry.op === undefined || target === undefined
}

function queryDefaultsSelectField(
  block: AST.QuerySelectionBlock | undefined,
  field: AST.DataFieldDeclaration,
): boolean {
  if (block && block.entries.length > 0) {
    return false
  }
  return dataFieldTarget(field) === undefined
}

/** collectionSlugFromPlural maps entity plural names (e.g. `People`) to provider collection keys (e.g. `people`). */
export function collectionSlugFromPlural(pluralName: string): string {
  if (pluralName.length === 0) {
    return pluralName
  }
  return pluralName.charAt(0).toLowerCase() + pluralName.slice(1)
}
