import type { ValidationChecks } from 'langium'
import * as AST from '../_gen-tao-parser/ast'

export const validator: ValidationChecks<AST.TaoLangAstType> = {
  Declaration(node, _accept) {
    if (node.type === 'app') {
      if (node.appStatements.length === 0) {
        _accept('error', 'App must have at least one statement.', { node: node, property: 'appStatements' })
      }
    }
  },
}
