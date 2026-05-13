import { AST } from '@parser/parser'

export type TaoQueryCardinality = 'many' | 'one'

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

/** collectionSlugFromPlural maps entity plural names (e.g. `People`) to provider collection keys (e.g. `people`). */
export function collectionSlugFromPlural(pluralName: string): string {
  if (pluralName.length === 0) {
    return pluralName
  }
  return pluralName.charAt(0).toLowerCase() + pluralName.slice(1)
}
