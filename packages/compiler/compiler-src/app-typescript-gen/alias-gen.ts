import { Compiled, compileNode } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { compileExpression } from './expression-gen'

/** compileAliasDeclaration emits a const binding from an `alias` assignment declaration. */
export function compileAliasDeclaration(node: AST.AssignmentDeclaration): Compiled {
  return compileNode(node)`
    const ${node.name} = ${compileExpression(node.value)};
  `
}
