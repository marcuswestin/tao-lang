import * as AST from './_gen-tao-parser/ast'

export function isSharedModuleDeclaration(node: unknown): node is AST.TopLevelDeclaration {
  return AST.isTopLevelDeclaration(node) && node.visibility === 'share'
}
