import { Compiled, compileNode } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchType_Exhaustive } from '@shared/TypeSafety'

/** compileExpression emits a string, number, or named reference as a TS expression. */
export function compileExpression(expression: AST.Expression): Compiled {
  return switchType_Exhaustive(expression, {
    StringLiteral: compileStringLiteral,
    NumberLiteral: compileNumberLiteral,
    NamedReference: compileNamedReference,
  })
}

/** compileStringLiteral emits a JSON-quoted string literal. */
export function compileStringLiteral(node: AST.StringLiteral): Compiled {
  return compileNode(node)`${JSON.stringify(node.string)}`
}

/** compileNumberLiteral emits a JSON number literal. */
export function compileNumberLiteral(node: AST.NumberLiteral): Compiled {
  return compileNode(node)`${JSON.stringify(node.number)}`
}

/** compileNamedReference emits reference text as an identifier expression. */
export function compileNamedReference(node: AST.NamedReference): Compiled {
  return compileNode(node)`${node.referenceName.$refText}`
}
