import { Compiled, compileNode } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { compileExpression } from './expression-gen'

/** compileAliasDeclaration emits a const binding from the alias value expression. */
export function compileAliasDeclaration(node: AST.AliasDeclaration): Compiled {
  return compileNode(node)`
    const ${node.name} = ${compileExpression(node.value)};
  `
}
