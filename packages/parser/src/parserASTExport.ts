import * as LGM from 'langium'
import * as LGMGen from 'langium/generate'
import * as ASTGen from './_gen-tao-parser/ast'

import { TaoLangGeneratedModule, TaoLangGeneratedSharedModule } from './_gen-tao-parser/module'

// Extend generated AST types with additional langium types
export * from './_gen-tao-parser/ast'
export type Node = LGM.AstNode
export type Document = LGM.LangiumDocument<ASTGen.TaoFile>
export type CompositeGeneratorNode = LGMGen.CompositeGeneratorNode
export type ModuleDeclaration = ASTGen.ModuleDeclaration
export type NodeDescription = LGM.AstNodeDescription
export type DiagnosticInfo<NodeT extends Node> = LGM.DiagnosticInfo<NodeT>
export type DocumentSegment = LGM.DocumentSegment
export type ValidationAcceptor = LGM.ValidationAcceptor
export type Reference<T extends Node> = LGM.Reference<T>

export type NodePropName<N extends Node> = keyof Omit<N, keyof Node | number | symbol>

/** isSharedModuleDeclaration returns true for a `ModuleDeclaration` whose `visibility` is `'share'`. */
export function isSharedModuleDeclaration(node: unknown): node is ModuleDeclaration {
  return ASTGen.isModuleDeclaration(node) && node.visibility === 'share'
}

export const isNode = LGM.isAstNode
export const isReference = LGM.isReference

export {
  TaoLangGeneratedModule as GeneratedModule,
  TaoLangGeneratedSharedModule as GeneratedSharedModule,
}

export const Utils = {
  ...LGM.AstUtils,
  getDiagnosticRange: LGM.getDiagnosticRange,
  toStringAndTrace: LGMGen.toStringAndTrace,
}
