import { Compiled } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { RuntimeGen } from './runtime-gen'

export function compileStateDeclaration(declaration: AST.AssignmentDeclaration): Compiled {
  return RuntimeGen.Declaration(declaration)
  //   return compileNode(declaration)`
  //     ${RuntimeGen.declareName(declaration, RuntimeGen.newState(declaration.value))}
  //   `
}

export function compileStateUpdateStatement(statement: AST.StateUpdate): Compiled {
  return RuntimeGen.updateState(statement)
  //   return compileNode(statement)`
  //     ${RuntimeGen.updateState(statement.stateRef, statement.op, statement.value)}
  //   `
}
