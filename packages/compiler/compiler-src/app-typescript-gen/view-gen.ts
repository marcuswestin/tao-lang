import {
  Compiled,
  compileNode,
  compileNodeList,
  compileNodeListProperty,
  compileNodePropertyRef,
  compileNoop,
} from '@compiler/compiler-utils'
import { AST } from '@parser'
import { Assert } from '@shared/TaoErrors'
import { switchType_Exhaustive } from '@shared/TypeSafety'
import { compileExpression } from './expression-gen'
import { compileInjection } from './injection-gen'
import { RuntimeGen } from './runtime-gen'
import { compileParameterList } from './shared-gen'

/** compileViewDeclaration emits a React function component from the view AST. */
export function compileViewDeclaration(declaration: AST.ViewDeclaration): Compiled {
  const stmts = declaration.block.statements
  const viewBlockStatements = stmts.filter(s => !AST.isViewRender(s))
  const renderStatements = stmts.filter(AST.isViewRender)
  return compileNode(declaration)`
    function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
      ${compileNodeList(viewBlockStatements, compileViewStatement)}
      return <>${compileNodeList(renderStatements, compileViewRender)}</>
    }
  `
}

/** compileViewRender emits child view JSX with args and nested statements. */
function compileViewRender(node: AST.ViewRender): Compiled {
  return compileNodePropertyRef(node, 'view', view => {
    Assert(AST.isViewDeclaration(view), 'ViewRender.view must be a ViewDeclaration')
    return compileNode(view)`
      <${view.name} ${compileArgumentList(node.argumentList)}>
        ${node.block && compileNodeListProperty(node.block, 'statements', compileViewStatement)}
      </${view.name}>`
  })
}

/** compileViewStatement dispatches one view-block statement. */
function compileViewStatement(statement: AST.Statement): Compiled {
  return switchType_Exhaustive(statement, {
    ViewRender: (n) => compileViewRender(n),
    Injection: (n) => compileInjection(n),
    ViewDeclaration: (n) => compileViewDeclaration(n),
    ActionDeclaration: (n) => RuntimeGen.Declaration(n),
    AssignmentDeclaration: (n) => RuntimeGen.Declaration(n),
    AppDeclaration: (n) => RuntimeGen.Declaration(n),
    ModuleDeclaration: (n) => RuntimeGen.moduleDeclaration(n),
    UseStatement: (n) => RuntimeGen.useStatement(n),
    StateUpdate: (n) => RuntimeGen.updateState(n),
  })
}

/** compileArgumentList emits JSX prop assignments from an argument list. */
function compileArgumentList(argumentList?: AST.ArgumentList): Compiled {
  if (!argumentList) {
    return compileNoop()
  }
  return compileNodeListProperty(argumentList, 'arguments', argument => {
    return compileNode(argument)`
      ${argument.name} = {${compileExpression(argument.value)}}
    `
  })
}
