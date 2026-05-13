import {
  type Compiled,
  compileIndentedNodeList,
  compileNode,
  compileNoop,
  refResolved,
} from '@compiler/codegen/codegen-util'
import { AST } from '@parser/parser'
import { Assert } from '@shared'
import {
  collectionSlugFromPlural,
  dataFieldTargetEntity,
  normalizedQueryFieldPathSegments,
  queryDeclarationAliasName,
  queryDeclarationCardinality,
  queryDeclarationEntity,
} from '../../query/query-model'

type TaoExpressionCompiler = (expression: AST.Expression) => Compiled

/** compileQueryDeclaration emits the provider-facing query binding for a Tao `query` declaration. */
export function compileQueryDeclaration(
  node: AST.QueryDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  const schema = refResolved(node.schema, 'QueryDeclaration.schema')
  const entity = queryDeclarationEntity(node)
  Assert(entity, 'QueryDeclaration entity must resolve after validation.', {
    target: node.target.$refText,
  })
  const alias = queryDeclarationAliasName(node)
  const collection = collectionSlugFromPlural(entity.pluralName)
  const schemaLit = JSON.stringify(schema.name)
  const plan = queryPlan(node, schema.name, collection, entity, compileExpression)
  if (AST.isTaoFile(node.$container)) {
    return compileNode(node)`
      _Scope.${alias} = getTaoData(${schemaLit}).peekQuery(${plan})
    `
  }
  return compileNode(node)`
    _Scope.${alias} = getTaoData(${schemaLit}).useLiveQuery(${plan})
  `
}

/** compileQueryMemberAccessExpression unwraps query result data before applying Tao member access. */
export function compileQueryMemberAccessExpression(
  node: AST.MemberAccessExpression,
  query: AST.QueryDeclaration,
): Compiled {
  const alias = queryDeclarationAliasName(query)
  if (node.properties.length === 0) {
    return compileNode(node)`TR.QueryData(_Scope.${alias})`
  }
  const pathList = node.properties.map(p => `'${p}'`).join(', ')
  return compileNode(node)`TR.MemberAccess(TR.QueryData(_Scope.${alias}), [${pathList}])`
}

function queryPlan(
  node: AST.QueryDeclaration,
  schema: string,
  collection: string,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  const selection = querySelectionBlock(node.selection, entity, compileExpression)
  return compileNode(node)`{
    schema: ${JSON.stringify(schema)},
    collection: ${JSON.stringify(collection)},
    cardinality: ${JSON.stringify(queryDeclarationCardinality(node))},
    select: [
      ${selection.select}
    ],
    where: [
      ${selection.where}
    ],
  }`
}

function querySelectionBlock(
  block: AST.QuerySelectionBlock | undefined,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): { select: Compiled; where: Compiled } {
  if (!block || block.entries.length === 0) {
    return {
      select: queryDefaultEntitySelections(entity),
      where: compileNoop(),
    }
  }
  const projected = block.entries.filter(entry => queryEntryProjects(entry, entity))
  const predicates = block.entries.filter(entry => entry.op !== undefined)
  return {
    select: compileIndentedNodeList(projected, entry => querySelectionEntry(entry, entity, compileExpression)),
    where: compileIndentedNodeList(predicates, entry => queryPredicate(entry, entity, compileExpression)),
  }
}

function querySelectionEntry(
  entry: AST.QuerySelectionEntry,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  const target = queryEntryTargetEntity(entry, entity)
  const path = queryPathArray(entry.path, entity)
  if (entry.selection && target) {
    const nested = querySelectionBlock(entry.selection, target, compileExpression)
    return compileNode(entry)`{
      path: ${path},
      select: [
        ${nested.select}
      ],
      where: [
        ${nested.where}
      ],
    },`
  }
  if (!entry.op && target) {
    return compileNode(entry)`{
      path: ${path},
      select: [
        ${queryDefaultEntitySelections(target)}
      ],
      where: [],
    },`
  }
  return compileNode(entry)`{ path: ${path} },`
}

function queryPredicate(
  entry: AST.QuerySelectionEntry,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  const { op, value } = entry
  Assert(op, 'Query predicate entry must have an operator.', { path: entry.path.segments.join('.') })
  Assert(value, 'Query predicate entry must have a value.', { path: entry.path.segments.join('.') })
  const relationshipIdentity = queryEntryTargetEntity(entry, entity) !== undefined
  // Relationship identity uses provider `id` today. If the language compares to RHS values keyed by a
  // declared `unique` field (not `id`), emit schema-driven `compareField` here instead of hardcoding `id`.
  return compileNode(entry)`{
    path: ${queryPathArray(entry.path, entity)},
    op: ${JSON.stringify(op)},
    value: ${compileExpression(value)},
    ${relationshipIdentity ? 'compareField: "id",' : ''}
    ${relationshipIdentity ? 'clientOnly: true,' : ''}
  },`
}

function queryEntryProjects(entry: AST.QuerySelectionEntry, entity: AST.DataEntityDeclaration): boolean {
  if (entry.selection) {
    return true
  }
  return entry.op === undefined || queryEntryTargetEntity(entry, entity) === undefined
}

function queryEntryTargetEntity(
  entry: AST.QuerySelectionEntry,
  entity: AST.DataEntityDeclaration,
): AST.DataEntityDeclaration | undefined {
  const path = normalizedQueryFieldPathSegments(entry.path, entity)
  if (path.length !== 1) {
    return undefined
  }
  const field = entity.fields.find(f => f.name === path[0])
  return field ? dataFieldTargetEntity(field) : undefined
}

function queryPathArray(path: AST.QueryFieldPath, entity: AST.DataEntityDeclaration): Compiled {
  return compileNode(path)`[${
    normalizedQueryFieldPathSegments(path, entity).map(segment => JSON.stringify(segment)).join(', ')
  }]`
}

function queryDefaultEntitySelections(entity: AST.DataEntityDeclaration): Compiled {
  const scalarFields = entity.fields.filter(field => dataFieldTargetEntity(field) === undefined)
  return compileIndentedNodeList(scalarFields, field => {
    return compileNode(field)`{ path: [${JSON.stringify(field.name)}] },`
  })
}
