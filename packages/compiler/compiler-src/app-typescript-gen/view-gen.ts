import {
  Compiled,
  compileList,
  compileNode,
  compileNodeListProperty,
  genNodePropertyRef,
} from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchType_Exhaustive } from '@shared/TypeSafety'
import * as LangiumGen from 'langium/generate'
import { compileAliasDeclaration } from './alias-gen'
import { compileExpression } from './expression-gen'
import { compileInjection } from './injection-gen'

/** compileViewDeclaration emits a React function component from the view AST. */
export function compileViewDeclaration(declaration: AST.ViewDeclaration): Compiled {
  const preambleStatements = declaration.viewStatements.filter(
    n => AST.isAliasDeclaration(n) || AST.isInjection(n) || AST.isViewDeclaration(n),
  )
  const renderStatements = declaration.viewStatements.filter(AST.isViewRenderStatement)
  return compileNode(declaration)`
    export function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
      ${compileList(declaration, preambleStatements, compileViewStatement)}
      return <>${compileList(declaration, renderStatements, compileViewRenderStatement)}</>
    }
  `
}

/** compileParameterList emits props destructuring types for view parameters. */
function compileParameterList(parameterList?: AST.ParameterList): Compiled {
  if (!parameterList) {
    return new LangiumGen.CompositeGeneratorNode('props: any')
  }
  return compileNode(parameterList)`
    props: {${
    compileNodeListProperty(parameterList, 'parameters', param => {
      return compileNode(param)`${param.name}: ${param.type}`
    })
  }}
  `
}

/** compileViewRenderStatement emits child view JSX with args and nested statements. */
function compileViewRenderStatement(node: AST.ViewRenderStatement): Compiled {
  return genNodePropertyRef(node, 'view', view =>
    compileNode(view)`
      <${view.name} ${compileArgsListToProps(node.args)}>
        ${compileNodeListProperty(node, 'viewStatements', compileViewStatement)}
      </${view.name}>
    `)
}

/** compileViewStatement dispatches render, alias, injection, or nested view codegen. */
function compileViewStatement(statement: AST.ViewStatement): Compiled {
  return switchType_Exhaustive(statement, {
    ViewRenderStatement: (n) => compileViewRenderStatement(n),
    AliasDeclaration: (n) => compileAliasDeclaration(n),
    Injection: (n) => compileInjection(n),
    ViewDeclaration: (n) => compileViewDeclaration(n),
  })
}

/** compileArgsListToProps emits JSX prop assignments from an args list. */
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
