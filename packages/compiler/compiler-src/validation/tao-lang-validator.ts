import { AST, type NodePropName } from '@parser'
import type * as langium from 'langium'
import { makeValidater, type Reporter } from './ValidationReporter'

export const validator: langium.ValidationChecks<AST.TaoLangAstType> = {
  AliasDeclaration: makeValidater((alias, report) => {
    validateDuplicateIdentifier(alias, report)
  }),

  ParameterDeclaration: makeValidater((param, report) => {
    validateDuplicateIdentifier(param, report)
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

/** validateDuplicateIdentifier reports when another binding in scope shares the same name. */
function validateDuplicateIdentifier<NodeT extends AST.Referenceable>(
  binding: NodeT,
  report: Reporter<NodeT>,
): void {
  const duplicates = getDuplicateIdentifiers(binding)
  if (duplicates.length > 0) {
    const message = `Duplicate identifier '${binding.name}'.`
    const property = 'name' as NodePropName<NodeT>
    report.error(message, { node: binding, property }, {
      alsoCheck: () => duplicates.map(node => ({ node, message })),
    })
  }
}

/** getDuplicateIdentifiers returns parameters and sibling declarations that conflict with the binding name. */
function getDuplicateIdentifiers(binding: AST.Referenceable): langium.AstNode[] {
  const siblingAliases = getDuplicateSiblingDeclarations(binding)
  const paramOwner = findParameterizedDeclaration(binding)
  const matchingParams = paramOwner?.parameterList?.parameters.filter(
    p => p !== binding && p.name === binding.name,
  ) ?? []

  return [...matchingParams, ...siblingAliases]
}

/** getSiblingStatements returns sibling nodes in the appropriate scope of the binding. */
function getSiblingStatements(binding: AST.Referenceable): langium.AstNode[] {
  const container = binding.$container
  if (AST.isParameterList(container)) {
    const parent = container.$container
    if (AST.isViewDeclaration(parent)) {
      return parent.viewStatements
    }
    if (AST.isActionDeclaration(parent)) {
      return parent.actionStatements
    }
    return []
  }
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

/** findParameterizedDeclaration returns the nearest enclosing view or action that may own parameters. */
function findParameterizedDeclaration(
  binding: AST.Referenceable,
): AST.ViewDeclaration | AST.ActionDeclaration | undefined {
  let current: langium.AstNode | undefined = binding.$container
  while (current) {
    if (AST.isNodeWithParameters(current)) {
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
