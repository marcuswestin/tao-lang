import type { AstNode } from 'langium'

import * as AST from './_gen-tao-parser/ast'

/** NodePropName restricts keys to each Tao AST node’s own fields (excluding Langium `AstNode` base and numeric keys), which
 * helps type child traversals without index-signature noise. */
export type NodePropName<N extends AstNode> = keyof Omit<N, keyof AstNode | number | symbol>

/** isSharedModuleDeclaration returns true for a `ModuleDeclaration` whose `visibility` is `'share'`. */
export function isSharedModuleDeclaration(node: unknown): node is AST.ModuleDeclaration {
  return AST.isModuleDeclaration(node) && node.visibility === 'share'
}
