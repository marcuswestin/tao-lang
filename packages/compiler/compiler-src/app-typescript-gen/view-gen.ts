import {
  Compiled,
  compileNode,
  compileNodeList,
  compileNodeListProperty,
  genNodePropertyRef,
} from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchType_Exhaustive } from '@shared/TypeSafety'
import { compileActionDeclaration } from './action-gen'
import { compileAliasDeclaration } from './alias-gen'
import { compileExpression } from './expression-gen'
import { compileInjection } from './injection-gen'
import { compileParameterList } from './shared-gen'

/** compileViewDeclaration emits a React function component from the view AST. */
export function compileViewDeclaration(declaration: AST.ViewDeclaration): Compiled {
  const viewBlockStatements = declaration.viewStatements.filter(AST.isViewBlockStatement)
  const renderStatements = declaration.viewStatements.filter(AST.isViewRenderStatement)
  return compileNode(declaration)`
    export function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
      ${compileNodeList(viewBlockStatements, compileViewStatement)}
      return <>${compileNodeList(renderStatements, compileViewRenderStatement)}</>
    }
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
    ActionDeclaration: (n) => compileActionDeclaration(n),
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
