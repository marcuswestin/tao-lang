import { assertNever } from '@compiler/compiler-utils'
import { AST, type NodePropName } from '@parser'
import type * as langium from 'langium'
import { makeValidater, type Reporter } from './ValidationReporter'

/** validationMessages are the exact diagnostics for TaoFile and Block placement rules. */
export const validationMessages = {
  viewBody: 'Only view/alias/state/action/inject statements are allowed in a view body.',
  actionBody: 'Only state/action/inject/set statements are allowed in an action body.',
  topLevel: 'Only alias/state/view/action/inject/use statements are allowed at file level.',
} as const

export const validator: langium.ValidationChecks<AST.TaoLangAstType> = {
  TaoFile: makeValidater((file, report) => {
    for (const stmt of file.statements) {
      if (AST.isModuleDeclaration(stmt) || AST.isTopLevelStatement(stmt)) {
        continue
      }
      report.error(validationMessages.topLevel, stmt)
    }
  }),

  Block: makeValidater((block, report) => {
    const ctx = getBlockStatementContext(block)
    const checkFn = ctx === 'view' ? AST.isViewStatement : AST.isActionStatement
    const message = ctx === 'view'
      ? validationMessages.viewBody
      : validationMessages.actionBody
    for (const stmt of block.statements) {
      if (!checkFn(stmt)) {
        report.error(message, stmt)
      }
    }
  }),

  Declaration: makeValidater((decl, report) => {
    validateDuplicateIdentifier(decl, report)
  }),

  ParameterDeclaration: makeValidater((param, report) => {
    validateDuplicateIdentifier(param, report)
  }),

  AppDeclaration: makeValidater((declaration, report) => {
    validateDuplicateIdentifier(declaration, report)
    const uiStatements = declaration.appStatements.filter(AST.isAppStatement)

    if (uiStatements.length === 0) {
      report.error('App must have a UI declaration.', { node: declaration, property: 'appStatements' })
    }

    if (uiStatements.length > 1) {
      const first = uiStatements[0]!
      report.error('App can only have one UI declaration.', { node: first, property: 'type' }, {
        alsoCheck: () => {
          const message = 'Another ui declaration here.'
          return removeItemFrom(first, uiStatements).map((n) => ({ node: n, message }))
        },
      })
    }

    for (const stmt of uiStatements) {
      const ref = stmt.ui.ref
      if (ref !== undefined && !AST.isViewDeclaration(ref)) {
        report.error('App ui must be a view.', { node: stmt, property: 'ui' })
      }
    }
  }),
}

/** getBlockStatementContext returns whether `block` is nested under view-like or action-like syntax. */
function getBlockStatementContext(block: AST.Block): 'view' | 'action' | null {
  const parent = block.$container
  if (AST.isViewDeclaration(parent) || AST.isViewRender(parent)) {
    return 'view'
  } else if (AST.isActionDeclaration(parent)) {
    return 'action'
  }
  assertNever(parent)
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
    if (AST.isBlockDeclaration(parent)) {
      return parent.block.statements
    }
    return []
  }
  if (AST.isModuleDeclaration(container)) {
    const taoFile = container.$container
    if (AST.isTaoFile(taoFile)) {
      return flattenTopLevelDeclarations(taoFile.statements)
    }
    return []
  }
  if (AST.isTaoFile(container)) {
    return flattenTopLevelDeclarations(container.statements)
  }
  if (AST.isBlock(container)) {
    return container.statements
  }
  return []
}

/** flattenTopLevelDeclarations returns file-level declaration nodes (unwraps `ModuleDeclaration`). */
function flattenTopLevelDeclarations(statements: readonly AST.Statement[]): langium.AstNode[] {
  const out: langium.AstNode[] = []
  for (const s of statements) {
    if (AST.isModuleDeclaration(s)) {
      out.push(s.declaration)
    } else {
      out.push(s)
    }
  }
  return out
}

/** getDuplicateSiblingDeclarations returns same-scope declarations with the same name as the binding. */
function getDuplicateSiblingDeclarations(binding: AST.Referenceable): langium.AstNode[] {
  return getSiblingStatements(binding).filter(node => {
    return AST.isReferenceable(node) && node.name === binding.name && node !== binding
  })
}

/** findParameterizedDeclaration returns the nearest enclosing view or action that may own parameters. */
function findParameterizedDeclaration(
  binding: AST.Referenceable,
): AST.ViewDeclaration | AST.ActionDeclaration | undefined {
  let current: langium.AstNode | undefined = binding.$container
  while (current) {
    if (AST.isBlockDeclaration(current)) {
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
