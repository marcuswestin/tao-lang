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
type QuerySelectionBlockPlan = { select: Compiled; where: Compiled; filter: Compiled; orderBy: Compiled }

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
    ${selection.filter}
    ${selection.orderBy}
  }`
}

function querySelectionBlock(
  block: AST.QuerySelectionBlock | undefined,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): QuerySelectionBlockPlan {
  if (!block) {
    return {
      select: queryDefaultEntitySelections(entity),
      where: compileNoop(),
      filter: compileNoop(),
      orderBy: compileNoop(),
    }
  }
  if (block.entries.length === 0) {
    return {
      select: queryDefaultEntitySelections(entity),
      where: compileNoop(),
      filter: queryFilter(block, entity, compileExpression),
      orderBy: queryOrderBy(block),
    }
  }
  const projected = block.entries.filter(entry => queryEntryProjects(entry, entity))
  const predicates = block.entries.filter(entry => entry.op !== undefined || entry.existence !== undefined)
  return {
    select: compileIndentedNodeList(projected, entry => querySelectionEntry(entry, entity, compileExpression)),
    where: compileIndentedNodeList(predicates, entry => queryPredicate(entry, entity, compileExpression)),
    filter: queryFilter(block, entity, compileExpression),
    orderBy: queryOrderBy(block),
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
      ${nested.filter}
      ${nested.orderBy}
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
  const op = entry.op ?? entry.existence
  Assert(op, 'Query predicate entry must have an operator.', { path: entry.path.segments.join('.') })
  if (entry.op !== undefined) {
    Assert(entry.value, 'Query predicate entry must have a value.', { path: entry.path.segments.join('.') })
  }
  const relationshipIdentity = entry.op !== undefined && queryEntryTargetEntity(entry, entity) !== undefined
  // Relationship identity uses provider `id` today. If the language compares to RHS values keyed by a
  // declared `unique` field (not `id`), emit schema-driven `compareField` here instead of hardcoding `id`.
  return compileNode(entry)`{
    path: ${queryPathArray(entry.path, entity)},
    op: ${JSON.stringify(op)},
    ${queryPredicateValue(entry, entry.value, compileExpression)}
    ${relationshipIdentity ? 'compareField: "id",' : ''}
    ${relationshipIdentity ? 'clientOnly: true,' : ''}
  },`
}

function queryFilter(
  block: AST.QuerySelectionBlock,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  if (block.whereClauses.length === 0) {
    return compileNoop()
  }
  return compileNode(block)`filter: ${queryBlockFilterExpression(block, entity, compileExpression)},`
}

function queryBlockFilterExpression(
  block: AST.QuerySelectionBlock,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  if (block.whereClauses.length === 1) {
    return queryFilterExpression(block.whereClauses[0]!.expression, entity, compileExpression)
  }
  const filters = compileIndentedNodeList(block.whereClauses, clause => {
    return compileNode(clause)`${queryFilterExpression(clause.expression, entity, compileExpression)},`
  })
  return compileNode(block)`{
    kind: "and",
    filters: [
      ${filters}
    ],
  }`
}

function queryFilterExpression(
  expr: AST.QueryFilterExpression,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  if (AST.isQueryLogicalExpression(expr)) {
    return compileNode(expr)`{
      kind: ${JSON.stringify(expr.op)},
      filters: [
        ${queryFilterExpression(expr.left, entity, compileExpression)},
        ${queryFilterExpression(expr.right, entity, compileExpression)},
      ],
    }`
  }
  if (AST.isQueryGroupedFilterExpression(expr)) {
    return queryFilterExpression(expr.expression, entity, compileExpression)
  }
  if (AST.isQueryFieldPredicateExpression(expr)) {
    return queryFilterPredicate(expr, entity, compileExpression)
  }
  return compileNoop()
}

function queryFilterPredicate(
  expr: AST.QueryFieldPredicateExpression,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  const op = expr.op ?? expr.existence
  Assert(op, 'Query where predicate must have an operator.', { path: expr.path.segments.join('.') })
  if (expr.op !== undefined) {
    Assert(expr.value, 'Query where predicate must have a value.', { path: expr.path.segments.join('.') })
  }
  const relationshipIdentity = expr.op !== undefined && queryPathTargetEntity(expr.path, entity) !== undefined
  return compileNode(expr)`{
    kind: "predicate",
    predicate: {
      path: ${queryPathArray(expr.path, entity)},
      op: ${JSON.stringify(op)},
      ${queryPredicateValue(expr, expr.value, compileExpression)}
      ${relationshipIdentity ? 'compareField: "id",' : ''}
      ${relationshipIdentity ? 'clientOnly: true,' : ''}
    },
  }`
}

function queryPredicateValue(
  node: AST.QuerySelectionEntry | AST.QueryFieldPredicateExpression,
  value: AST.Expression | undefined,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  return value ? compileNode(node)`value: ${compileExpression(value)},` : compileNoop()
}

function queryOrderBy(block: AST.QuerySelectionBlock): Compiled {
  const orderBy = block.orderByClauses[0]
  if (!orderBy) {
    return compileNoop()
  }
  return compileNode(orderBy)`orderBy: {
    path: [${JSON.stringify(orderBy.field)}],
    direction: ${JSON.stringify(orderBy.direction ?? 'asc')},
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
  return queryPathTargetEntity(entry.path, entity)
}

function queryPathTargetEntity(
  pathNode: AST.QueryFieldPath,
  entity: AST.DataEntityDeclaration,
): AST.DataEntityDeclaration | undefined {
  const path = normalizedQueryFieldPathSegments(pathNode, entity)
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
