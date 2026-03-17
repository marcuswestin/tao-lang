import { AST } from '@parser'
import type * as langium from 'langium'
import { makeValidater } from './ValidationReporter'

export const validator: langium.ValidationChecks<AST.TaoLangAstType> = {
  AliasDeclaration: makeValidater((alias, report) => {
    const duplicates = getDuplicateIdentifiers(alias)
    if (duplicates.length > 0) {
      const message = `Duplicate identifier '${alias.name}'.`
      report.error(message, { node: alias, property: 'name' }, {
        alsoCheck: () => duplicates.map(node => ({ node, message })),
      })
    }
  }),

  AppDeclaration: makeValidater((declaration, report) => {
    const uiDeclarations = declaration.appStatements.filter(stmt => stmt.type === 'ui')

    if (uiDeclarations.length === 0) {
      report.error('App must have a UI declaration.', { node: declaration, property: 'appStatements' })
    }

    uiDeclarations.forEach(node => {
      if (node.ui?.ref && !AST.isViewDeclaration(node.ui.ref)) {
        report.error('App ui must be a view.', { node, property: 'ui' })
      }
      if (uiDeclarations.length > 1) {
        report.error('App can only have one UI declaration.', node, {
          alsoCheck: () => {
            const message = 'Another ui declaration here.'
            return removeItemFrom(node, uiDeclarations).map(node => ({ node, message }))
          },
        })
      }
    })
  }),
}

/** getDuplicateIdentifiers returns parameters and sibling declarations that conflict with the binding name. */
function getDuplicateIdentifiers(binding: AST.Referenceable): langium.AstNode[] {
  const siblingAliases = getDuplicateSiblingDeclarations(binding)
  const viewDecl = findContainingViewDecl(binding)
  const matchingParams = viewDecl?.parameterList?.parameters.filter(
    p => p !== binding && p.name === binding.name,
  ) ?? []

  return [...matchingParams, ...siblingAliases]
}

/** getSiblingStatements returns sibling nodes in the view, render, or top-level scope of the binding. */
function getSiblingStatements(binding: AST.Referenceable): langium.AstNode[] {
  const container = binding.$container
  if (AST.isViewDeclaration(container) || AST.isViewRenderStatement(container)) {
    return container.viewStatements
  }
  if (AST.isTopLevelDeclaration(container) && AST.isTaoFile(container.$container)) {
    return container.$container.topLevelStatements
      .filter((s: AST.TopLevelStatement): s is AST.TopLevelDeclaration => AST.isTopLevelDeclaration(s))
      .map((s: AST.TopLevelDeclaration) => s.declaration)
  }
  return []
}

/** getDuplicateSiblingDeclarations returns same-scope declarations with the same name as the binding. */
function getDuplicateSiblingDeclarations(binding: AST.Referenceable): AST.Declaration[] {
  return getSiblingStatements(binding).filter(
    (node): node is AST.Declaration => {
      return AST.isDeclaration(node) && node !== binding && node.name === binding.name
    },
  )
}

/** findContainingViewDecl returns the nearest enclosing ViewDeclaration, if any. */
function findContainingViewDecl(binding: AST.Referenceable): AST.ViewDeclaration | undefined {
  let current: langium.AstNode | undefined = binding.$container
  while (current) {
    if (AST.isViewDeclaration(current)) {
      return current
    }
    current = current.$container
  }
  return undefined
}

/** removeItemFrom returns a copy of the array without the first matching item reference. */
function removeItemFrom<T>(item: T, array: T[]): T[] {
  return array.filter(itemB => itemB !== item)
}
