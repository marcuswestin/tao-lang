import {
  type Compiled,
  compileIndentedNodeList,
  compileNode,
  refResolved,
} from '@compiler/codegen/codegen-util'
import { AST } from '@parser/parser'
import { Assert, switch_safe } from '@shared'
import {
  collectionSlugFromPlural,
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
    source: node.source.$type,
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
  const where = node.steps.filter(AST.isQueryWhereStep)
  const order = node.steps.filter(AST.isQueryOrderStep)
  const includes = node.steps.filter(AST.isQueryIncludeStep).flatMap(step => step.paths)
  return compileNode(node)`{
    schema: ${JSON.stringify(schema)},
    collection: ${JSON.stringify(collection)},
    cardinality: ${JSON.stringify(queryDeclarationCardinality(node))},
    where: [
      ${compileIndentedNodeList(where, step => queryWhereStep(step, entity, compileExpression))}
    ],
    order: [
      ${compileIndentedNodeList(order, step => queryOrderStep(step, entity))}
    ],
    includes: [
      ${compileIndentedNodeList(includes, path => queryPathArray(path, entity))}
    ],
  }`
}

function queryWhereStep(
  step: AST.QueryWhereStep,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  return compileNode(step)`${queryPredicate(step.predicate, entity, compileExpression)},`
}

function queryOrderStep(step: AST.QueryOrderStep, entity: AST.DataEntityDeclaration): Compiled {
  return compileNode(step)`{ path: ${queryPathArray(step.path, entity)}, direction: ${
    JSON.stringify(step.direction)
  } },`
}

function queryPredicate(
  predicate: AST.QueryPredicate,
  entity: AST.DataEntityDeclaration,
  compileExpression: TaoExpressionCompiler,
): Compiled {
  return switch_safe.type(predicate, {
    QueryComparisonPredicate: node => {
      const op = queryComparisonOperator(node)
      const ignoreCase = node.ignoreCase ? 'ignoreCase: true,' : ''
      return compileNode(node)`{
        kind: 'compare',
        path: ${queryPathArray(node.path, entity)},
        op: ${JSON.stringify(op)},
        value: ${compileExpression(node.value)},
        ${ignoreCase}
      }`
    },
    QueryLogicalPredicate: node =>
      compileNode(node)`{
      kind: ${JSON.stringify(node.op)},
      left: ${queryPredicate(node.left, entity, compileExpression)},
      right: ${queryPredicate(node.right, entity, compileExpression)},
    }`,
    QueryNotPredicate: node =>
      compileNode(node)`{
      kind: 'not',
      predicate: ${queryPredicate(node.operand, entity, compileExpression)},
    }`,
  })
}

function queryComparisonOperator(node: AST.QueryComparisonPredicate): string {
  if (node.op) {
    return node.op
  }
  if (node.membership) {
    return 'in'
  }
  if (node.stringOperator) {
    return queryStringOperatorName(node.stringOperator)
  }
  return node.not ? 'isNot' : 'is'
}

function queryPathArray(path: AST.QueryFieldPath, entity: AST.DataEntityDeclaration): Compiled {
  return compileNode(path)`[${
    normalizedQueryFieldPathSegments(path, entity).map(segment => JSON.stringify(segment)).join(', ')
  }]`
}

function queryStringOperatorName(op: string): 'contains' | 'startsWith' | 'endsWith' {
  if (op.startsWith('starts')) {
    return 'startsWith'
  }
  if (op.startsWith('ends')) {
    return 'endsWith'
  }
  return 'contains'
}
