import { Compiled, compileNode } from '@tao-compiler/compiler-utils'
import { AST } from '@tao-compiler/grammar'
import { compileExpression } from './expression-gen'

export function compileAliasDeclaration(node: AST.AliasDeclaration): Compiled {
  return compileNode(node)`
    const ${node.name} = ${compileExpression(node.value)};
  `
}
