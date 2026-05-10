import { AST } from '@parser/parser'
import { switch_safe } from '@shared'

export type TaoQueryCardinality = 'many' | 'one'

/** queryDeclarationAliasName returns the binding name exposed by a query, including V1 default aliases. */
export function queryDeclarationAliasName(node: AST.QueryDeclaration): string {
  if (node.name) {
    return node.name
  }
  return switch_safe.type(node.source, {
    QueryCollectionSource: source => source.collection.ref?.pluralName ?? source.collection.$refText,
    QueryOneSource: source => source.entity.ref?.name ?? source.entity.$refText,
    QueryLegacySource: source => source.entity.ref?.name ?? source.entity.$refText,
  })
}

/** queryDeclarationCardinality returns whether a query produces many rows or one nullable row. */
export function queryDeclarationCardinality(node: AST.QueryDeclaration): TaoQueryCardinality {
  return switch_safe.type(node.source, {
    QueryCollectionSource: () => 'many',
    QueryOneSource: () => 'one',
    QueryLegacySource: source => source.first ? 'one' : 'many',
  })
}

/** queryDeclarationEntity resolves the entity targeted by any supported query source. */
export function queryDeclarationEntity(node: AST.QueryDeclaration): AST.DataEntityDeclaration | undefined {
  return switch_safe.type(node.source, {
    QueryCollectionSource: source => source.collection.ref,
    QueryOneSource: source => source.entity.ref,
    QueryLegacySource: source => source.entity.ref,
  })
}

/** queryDeclarationSourceText returns the source token text used when the entity reference is unresolved. */
export function queryDeclarationSourceText(node: AST.QueryDeclaration): string {
  return switch_safe.type(node.source, {
    QueryCollectionSource: source => source.collection.$refText,
    QueryOneSource: source => source.entity.$refText,
    QueryLegacySource: source => source.entity.$refText,
  })
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

/** collectionSlugFromPlural maps entity plural names (e.g. `People`) to provider collection keys (e.g. `people`). */
export function collectionSlugFromPlural(pluralName: string): string {
  if (pluralName.length === 0) {
    return pluralName
  }
  return pluralName.charAt(0).toLowerCase() + pluralName.slice(1)
}
