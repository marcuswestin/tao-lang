import { AST } from '@parser/parser'

export const BOOLEAN_OPERATORS = new Set<AST.BinaryExpression['op']>(['=', '!=', '<=', '>=', '<', '>'])

/** functionReturnStatementsFromRef resolves a function reference and returns all statically nested return statements. */
export function functionReturnStatementsFromRef(
  ref: AST.FunctionCallExpression['function'],
): AST.ReturnStatement[] {
  const fn = ref.ref
  return fn === undefined ? [] : functionReturnStatements(fn)
}

/** functionReturnStatements returns every return statement nested directly under a pure Tao function's control flow. */
export function functionReturnStatements(fn: AST.FunctionDeclaration): AST.ReturnStatement[] {
  const out: AST.ReturnStatement[] = []
  const stack = [...fn.block.statements]
  while (stack.length > 0) {
    const stmt = stack.pop()!
    if (AST.isReturnStatement(stmt)) {
      out.push(stmt)
    } else if (AST.isIfStatement(stmt)) {
      stack.push(...stmt.thenBlock.statements, ...(stmt.elseBlock?.statements ?? []))
    }
  }
  return out
}
