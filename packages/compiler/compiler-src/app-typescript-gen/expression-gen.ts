import { switchItemType_Exhaustive } from '@tao-compiler/@shared/TypeSafety'
import { Compiled, compileNode } from '@tao-compiler/compiler-utils'
import { AST } from '@tao-compiler/grammar'

export function compileExpression(expression: AST.Expression): Compiled {
  return switchItemType_Exhaustive(expression, {
    'StringLiteral': compileStringLiteral,
    'NumberLiteral': compileNumberLiteral,
    'NamedReference': compileNamedReference,
  })
}

function compileStringLiteral(node: AST.StringLiteral): Compiled {
  return compileNode(node)`${JSON.stringify(node.string)}`
}

function compileNumberLiteral(node: AST.NumberLiteral): Compiled {
  return compileNode(node)`${JSON.stringify(node.number)}`
}

function compileNamedReference(node: AST.NamedReference): Compiled {
  return compileNode(node)`${node.referenceName.$refText}`
}
