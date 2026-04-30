import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { Assert, switch_safe } from '@shared'
import { resolveShorthandParameterType } from '../tao-type-shapes'
import { typeSystemValidationMessages, typeSystemValidator } from './TypeSystemValidator'
import { makeValidater, type Reporter } from './ValidationReporter'

/** validationMessages are the exact diagnostics for TaoFile and Block placement rules, merged with type-system messages. */
export const validationMessages = {
  viewBody: 'Only view/alias/state/action/inject statements are allowed in a view body.',
  actionBody: 'Only state/action/inject and set (state update) statements are allowed in an action body.',
  topLevel: 'Only alias/state/view/action/inject/use statements are allowed at file level.',
  duplicateObjectProperty: (name: string) => `Duplicate object property '${name}'.`,
  setTargetMustBeState: (kind: string) => `'set' can only target a state binding, not a '${kind}'.`,
  nameMustBeUppercase: (name: string) => `Name '${name}' must begin with an uppercase letter.`,
  parameterShorthandNotAType: (name: string) =>
    `Parameter shorthand '${name}' must match a local type declaration in this file/scope. Use '<name> <type>' for explicit type references (including imported types).`,
  ...typeSystemValidationMessages,
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
    validateUppercaseIdentifierName(decl, report)
  }),

  ParameterDeclaration: makeValidater((param, report) => {
    validateDuplicateIdentifier(param, report)
    validateUppercaseIdentifierName(param, report)
    validateParameterShorthandType(param, report)
  }),

  ObjectLiteral: makeValidater((node, report) => {
    validateDuplicateObjectPropertyNames(node, report)
  }),

  StateUpdate: makeValidater((node, report) => {
    validateSetTargetsState(node, report)
  }),

  StructFieldDeclaration: makeValidater((field, report) => {
    validateUppercaseIdentifierName(field, report)
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

  ...typeSystemValidator,
}

/** validateDuplicateObjectPropertyNames reports when an object literal repeats the same property name. */
function validateDuplicateObjectPropertyNames(node: AST.ObjectLiteral, report: Reporter<AST.ObjectLiteral>): void {
  const seen = new Set<string>()
  for (const prop of node.properties) {
    if (seen.has(prop.name)) {
      report.error(validationMessages.duplicateObjectProperty(prop.name), { node: prop, property: 'name' })
    }
    seen.add(prop.name)
  }
}

/** validateSetTargetsState reports when `set` references something other than a `state` binding. Returns early when the parser failed to produce a target (parse error already reported). */
function validateSetTargetsState(node: AST.StateUpdate, report: Reporter<AST.StateUpdate>): void {
  const ref = node.target?.root?.ref
  if (ref === undefined) {
    return
  }
  if (AST.isAssignmentDeclaration(ref)) {
    if (ref.type === 'state') {
      return
    }
    report.error(validationMessages.setTargetMustBeState('alias'), { node, property: 'target' })
    return
  }
  const kind = getStateUpdateTargetKind(ref)
  report.error(validationMessages.setTargetMustBeState(kind), { node, property: 'target' })
}

/** getStateUpdateTargetKind returns the kind of binding targeted by `set` (caller must pass a non-assignment reference). */
function getStateUpdateTargetKind(ref: Exclude<AST.Referenceable, AST.AssignmentDeclaration>) {
  return switch_safe(ref.$type, {
    ParameterDeclaration: () => 'parameter',
    ViewDeclaration: () => 'view',
    ActionDeclaration: () => 'action',
    AppDeclaration: () => 'app',
    TypeDeclaration: () => 'type',
  })
}

/** getBlockStatementContext returns whether `block` is nested under view-like or action-like syntax. */
function getBlockStatementContext(block: AST.Block): 'view' | 'action' | null {
  const parent = block.$container
  if (AST.isViewDeclaration(parent) || AST.isViewRender(parent)) {
    return 'view'
  } else if (
    AST.isActionDeclaration(parent)
    || AST.isActionExpression(parent)
    || AST.isActionRender(parent)
  ) {
    return 'action'
  }
  Assert.never(parent)
}

/** validateParameterShorthandType rejects shorthand parameters (`Title` with no explicit type) when `name`
 * doesn't resolve to a `TypeDeclaration`. */
function validateParameterShorthandType(
  param: AST.ParameterDeclaration,
  report: Reporter<AST.ParameterDeclaration>,
): void {
  if (param.type !== undefined || param.localSuperType !== undefined) {
    return
  }
  const resolved = resolveShorthandParameterType(param)
  if (resolved === undefined) {
    report.error(
      validationMessages.parameterShorthandNotAType(param.name),
      { node: param, property: 'name' },
    )
  }
}

/** validateUppercaseIdentifierName reports when a declaration / parameter name does not start with an
 * uppercase letter. Tao keywords are matched by dedicated grammar rules (not `name=ID`) so they are
 * naturally excluded. */
function validateUppercaseIdentifierName<NodeT extends AST.Node & { name?: string }>(
  node: NodeT,
  report: Reporter<NodeT>,
): void {
  const name = node.name
  if (name === undefined) {
    return
  }
  const first = name.charAt(0)
  if (first && first === first.toLowerCase() && first !== first.toUpperCase()) {
    report.error(
      validationMessages.nameMustBeUppercase(name),
      { node, property: 'name' as AST.NodePropName<NodeT> },
    )
  }
}

/** validateDuplicateIdentifier reports when another binding in scope shares the same name. */
function validateDuplicateIdentifier<NodeT extends AST.Referenceable>(
  binding: NodeT,
  report: Reporter<NodeT>,
): void {
  const duplicates = getDuplicateIdentifiers(binding)
  if (duplicates.length > 0) {
    const message = `Duplicate identifier '${binding.name}'.`
    const property = 'name' as AST.NodePropName<NodeT>
    report.error(message, { node: binding, property }, {
      alsoCheck: () => duplicates.map(node => ({ node, message })),
    })
  }
}

/** getDuplicateIdentifiers returns parameters and sibling declarations that conflict with the binding name. */
function getDuplicateIdentifiers(binding: AST.Referenceable): AST.Node[] {
  const siblingAliases = getDuplicateSiblingDeclarations(binding)
  const paramOwner = findParameterizedDeclaration(binding)
  const matchingParams = paramOwner?.parameterList?.parameters.filter(
    p => p !== binding && p.name === binding.name,
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
  return getSiblingStatements(binding).filter(node => {
    return AST.isReferenceable(node) && node.name === binding.name && node !== binding
  })
}

/** findParameterizedDeclaration returns the nearest enclosing view or action that may own parameters. */
function findParameterizedDeclaration(
  binding: AST.Referenceable,
): AST.ViewDeclaration | AST.ActionDeclaration | undefined {
  let current: AST.Node | undefined = binding.$container
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
