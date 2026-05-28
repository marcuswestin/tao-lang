import { AST } from '@parser/parser'
import { queryDeclarationAliasName } from '../../query/query-model'
import type { Reporter } from '../ValidationReporter'

export const identifierValidationMessages = {
  nameMustBeUppercase: (name: string) => `Name '${name}' must begin with an uppercase letter.`,
} as const

/** isUnderViewDeclaration returns true when `node` sits under a `view` declaration (including inside `guard`). */
export function isUnderViewDeclaration(node: AST.Node): boolean {
  let c: AST.Node | undefined = node.$container
  while (c) {
    if (AST.isViewDeclaration(c)) {
      return true
    }
    if (AST.isActionDeclaration(c) || AST.isActionExpression(c) || AST.isAppDeclaration(c)) {
      return false
    }
    c = c.$container
  }
  return false
}

/** directLiteralPrimitive returns the primitive kind of a direct literal expression used in data validators. */
export function directLiteralPrimitive(expr: AST.Expression): AST.PrimitiveType | 'null' | undefined {
  if (AST.isStringTemplateExpression(expr)) {
    return 'text'
  }
  if (AST.isNumberLiteral(expr)) {
    return 'number'
  }
  if (AST.isBooleanLiteral(expr)) {
    return 'boolean'
  }
  if (AST.isNullLiteral(expr)) {
    return 'null'
  }
  return undefined
}

/** validateUppercaseIdentifierName reports when a declaration / parameter name does not start with an uppercase letter. Tao keywords are matched by dedicated grammar rules (not `name=ID`) so they are naturally excluded. */
export function validateUppercaseIdentifierName<NodeT extends AST.Node & { name?: string }>(
  node: NodeT,
  report: Reporter<NodeT>,
): void {
  const name = bindingName(node)
  if (name === undefined) {
    return
  }
  const first = name.charAt(0)
  if (first && first === first.toLowerCase() && first !== first.toUpperCase()) {
    report.error(
      identifierValidationMessages.nameMustBeUppercase(name),
      { node, property: 'name' as AST.NodePropName<NodeT> },
    )
  }
}

/** validateDuplicateIdentifier reports when another binding in scope shares the same name. */
export function validateDuplicateIdentifier<NodeT extends AST.Referenceable>(
  binding: NodeT,
  report: Reporter<NodeT>,
): void {
  const duplicates = getDuplicateIdentifiers(binding)
  const name = bindingName(binding)
  if (duplicates.length > 0) {
    const message = `Duplicate identifier '${name}'.`
    const property = 'name' as AST.NodePropName<NodeT>
    const info = AST.isQueryDeclaration(binding) && binding.name === undefined
      ? binding
      : { node: binding, property }
    report.error(message, info, { alsoCheck: () => duplicates.map(node => ({ node, message })) })
  }
}

/** getDuplicateIdentifiers returns parameters and sibling declarations that conflict with the binding name. */
function getDuplicateIdentifiers(binding: AST.Referenceable): AST.Node[] {
  const name = bindingName(binding)
  const siblingAliases = getDuplicateSiblingDeclarations(binding)
  const paramOwner = findParameterizedDeclaration(binding)
  const matchingParams = paramOwner?.parameterList?.parameters.filter(
    p => p !== binding && p.name === name,
  ) ?? []

  return [...matchingParams, ...siblingAliases]
}

/** getSiblingStatements returns sibling nodes in the appropriate scope of the binding. */
function getSiblingStatements(binding: AST.Referenceable): AST.Node[] {
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
function flattenTopLevelDeclarations(statements: readonly AST.Statement[]): AST.Node[] {
  const out: AST.Node[] = []
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
function getDuplicateSiblingDeclarations(binding: AST.Referenceable): AST.Node[] {
  const name = bindingName(binding)
  return getSiblingStatements(binding).filter(node => {
    return AST.isReferenceable(node) && bindingName(node) === name && node !== binding
  })
}

function bindingName(node: AST.Node & { name?: string }): string | undefined {
  return AST.isQueryDeclaration(node) ? queryDeclarationAliasName(node) : node.name
}

/** findParameterizedDeclaration returns the nearest enclosing callable declaration that may own parameters. */
function findParameterizedDeclaration(
  binding: AST.Referenceable,
): AST.ViewDeclaration | AST.ActionDeclaration | AST.FunctionDeclaration | undefined {
  let current: AST.Node | undefined = binding.$container
  while (current) {
    if (AST.isCallableDeclaration(current)) {
      return current
    }
    current = current.$container
  }
  return undefined
}
