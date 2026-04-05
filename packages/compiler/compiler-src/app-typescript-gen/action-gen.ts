import { Compiled, compileNode, compileNodeListProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchType_Exhaustive } from '@shared/TypeSafety'
import { compileInjection } from './injection-gen'
import { compileParameterList } from './shared-gen'

/** compileActionDeclaration emits a plain or exported function for an action AST node. */
export function compileActionDeclaration(
  declaration: AST.ActionDeclaration,
): Compiled {
  return compileNode(declaration)`
    function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
      ${compileNodeListProperty(declaration, 'actionStatements', compileActionStatement)}
    }
  `
}

/** compileActionStatement emits one statement from an action body. */
function compileActionStatement(statement: AST.ActionStatement): Compiled {
  return switchType_Exhaustive(statement, {
    Injection: (n) => compileInjection(n),
  })
}
