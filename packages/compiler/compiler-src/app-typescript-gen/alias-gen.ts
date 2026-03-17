import { Compiled, compileNode } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { compileExpression } from './expression-gen'

export function compileAliasDeclaration(node: AST.AliasDeclaration): Compiled {
  return compileNode(node)`
    const ${node.name} = ${compileExpression(node.value)};
  `
}
