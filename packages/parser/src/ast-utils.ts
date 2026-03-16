import type { AstNode } from 'langium'

import * as AST from './_gen-tao-parser/ast'

/** NodePropName restricts to AST node property names (excludes AstNode base and index/symbol keys). */
export type NodePropName<N extends AstNode> = keyof Omit<N, keyof AstNode | number | symbol>

export function isSharedModuleDeclaration(node: unknown): node is AST.TopLevelDeclaration {
  return AST.isTopLevelDeclaration(node) && node.visibility === 'share'
}
