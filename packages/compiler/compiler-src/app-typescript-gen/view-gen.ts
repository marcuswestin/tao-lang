import {
  Compiled,
  compileList,
  compileNode,
  compileNodeListProperty,
  genNodePropertyRef,
} from '@compiler/compiler-utils'
import { AST } from '@compiler/grammar'
import * as ast from '@parser/ast'
import { switchItemType_Exhaustive } from '@shared/TypeSafety'
import { compileAliasDeclaration } from './alias-gen'
import { compileExpression } from './expression-gen'
import { compileInjection } from './injection-gen'

export function compileViewDeclaration(declaration: AST.ViewDeclaration): Compiled {
  const preambleStatements = declaration.viewStatements.filter(
    n => ast.isAliasDeclaration(n) || ast.isInjection(n) || ast.isViewDeclaration(n),
  )
  const renderStatements = declaration.viewStatements.filter(ast.isViewRenderStatement)
  return compileNode(declaration)`
    export function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
      ${compileList(declaration, preambleStatements, compileViewStatement)}
      return <>${compileList(declaration, renderStatements, compileViewRenderStatement)}</>
    }
  `
}

function compileParameterList(parameterList?: AST.ParameterList): Compiled {
  if (!parameterList) {
    return undefined
  }
  return compileNode(parameterList)`
    props: {${
    compileNodeListProperty(parameterList, 'parameters', param => {
      return compileNode(param)`${param.name}: ${param.type}`
    })
  }}
  `
}

function compileViewRenderStatement(node: AST.ViewRenderStatement): Compiled {
  return genNodePropertyRef(node, 'view', view =>
    compileNode(view)`
      <${view.name} ${compileArgsListToProps(node.args)}>
        ${compileNodeListProperty(node, 'viewStatements', compileViewStatement)}
      </${view.name}>
    `)
}

function compileViewStatement(statement: AST.ViewStatement): Compiled {
  return switchItemType_Exhaustive(statement, {
    ViewRenderStatement: (n) => compileViewRenderStatement(n),
    AliasDeclaration: (n) => compileAliasDeclaration(n),
    Injection: (n) => compileInjection(n),
    ViewDeclaration: (n) => compileViewDeclaration(n),
  })
}

function compileArgsListToProps(args?: AST.ArgsList): Compiled {
  if (!args) {
    return undefined
  }
  return compileNodeListProperty(args, 'args', argument => {
    return compileNode(argument)`
      ${argument.name} = {${compileExpression(argument.value)}}
    `
  })
}
