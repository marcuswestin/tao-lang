import type * as langium from 'langium'
import * as AST from '../_gen-tao-parser/ast'
import { makeValidater } from './ValidationReporter'

export const validator: langium.ValidationChecks<AST.TaoLangAstType> = {
  AppDeclaration: makeValidater((declaration, report) => {
    const uiDeclarations = declaration.appStatements.filter(stmt => stmt.type === 'ui')

    if (uiDeclarations.length === 0) {
      report.error('App must have a UI declaration.', { node: declaration, property: 'appStatements' })
    }

    if (uiDeclarations.length > 1) {
      uiDeclarations.forEach(uiDeclaration => {
        report.error('App can only have one UI declaration.', uiDeclaration, {
          alsoCheck: () => {
            return uiDeclarations.filter(alsoNode => alsoNode !== uiDeclaration).map(alsoNode => {
              return {
                node: alsoNode,
                message: 'Another declaraion here.',
              }
            })
          },
        })
      })
    }

    uiDeclarations.forEach(uiDeclaration => {
      if (uiDeclaration.ui?.ref?.$type !== 'ViewDeclaration') {
        report.error('App ui must be a view declaration.', {
          node: uiDeclaration,
          property: 'ui',
        })
      }
    })
  }),
}
