import { assertNever, Compiled, compileNode, compileNodeListProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchType_Exhaustive } from '@shared/TypeSafety'
import { compileInjection } from './injection-gen'
import { RuntimeGen } from './runtime-gen'
import { compileParameterList, compileTODO } from './shared-gen'

/** compileStatement emits codegen for a statement. */
export function compileStatement(statement: AST.Statement): Compiled {
  return switchType_Exhaustive(statement, {
    Injection: (n) => compileInjection(n),
    StateUpdate: (n) => compileTODO(n),
    ModuleDeclaration: (n) => RuntimeGen.moduleDeclaration(n),
    UseStatement: (n) => RuntimeGen.useStatement(n),
    AppDeclaration: (n) => RuntimeGen.Declaration(n),
    AssignmentDeclaration: (n) => RuntimeGen.Declaration(n),
    ViewDeclaration: (n) => RuntimeGen.Declaration(n),
    ActionDeclaration: (n) => RuntimeGen.Declaration(n),
    ViewRender: (n) => compileTODO(n),
  })
}

/** compileActionDeclaration emits a plain or exported function for an action AST node. */
export function compileActionDeclaration(
  declaration: AST.ActionDeclaration,
): Compiled {
  return compileNode(declaration)`
    function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
      ${compileNodeListProperty(declaration.block, 'statements', compileStatement)}
    }
  `
}

/** compileAppDeclaration emits all app statements for one app declaration. */
export function compileAppDeclaration(declaration: AST.AppDeclaration): Compiled {
  return compileNodeListProperty(declaration, 'appStatements', compileAppStatement)
}

/** compileAppStatement emits codegen for app statements (currently only ui → AppUIView). */
function compileAppStatement(statement: AST.AppStatement): Compiled {
  if (!AST.isAppStatement(statement)) {
    assertNever(statement)
  }
  return compileNode(statement)`
    function _AppUIView() {
      return <${statement.ui.ref!.name} />
    }
    export const AppUIView = _AppUIView
  `
}
