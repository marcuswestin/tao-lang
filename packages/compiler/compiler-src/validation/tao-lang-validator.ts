import { isKnownTaoAppDataProviderName, unknownTaoAppDataProviderMessage } from '@compiler'
import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { Assert, switch_safe } from '@shared'
import { queryDeclarationCardinality } from '../query/query-model'
import { resolveShorthandParameterType } from '../tao-type-shapes'
import {
  dataSchemaValidationMessages,
  dataSchemaValidator,
  findForBodyHookViolations,
  forCreateMessages,
  forCreateValidator,
  identifierValidationMessages,
  isForStatementPlacementOk,
  queryGuardOnValidator,
  queryValidationMessages,
  queryValidator,
  validateDuplicateIdentifier,
  validateUppercaseIdentifierName,
} from './data'
import { typeSystemValidationMessages, typeSystemValidator } from './TypeSystemValidator'
import { makeValidater, type Reporter } from './ValidationReporter'

/** validationMessages are the exact diagnostics for TaoFile and Block placement rules, merged with type-system messages. */
export const validationMessages = {
  viewBody: 'Only view/alias/state/action/inject statements are allowed in a view body.',
  actionBody: 'Only state/action/inject and set (state update) statements are allowed in an action body.',
  topLevel: 'Only alias/state/view/action/inject/use statements are allowed at file level.',
  duplicateAppProvider: 'App can only have one provider declaration.',
  duplicateAppProviderRelated: 'Another provider declaration here.',
  unknownAppDataProvider: unknownTaoAppDataProviderMessage,
  duplicateObjectProperty: (name: string) => `Duplicate object property '${name}'.`,
  setTargetMustBeState: (kind: string) => `'set' can only target a state binding, not a '${kind}'.`,
  legacyIDBInjection:
    '`IDB` is no longer available in injected TypeScript; use compiled data/query/create statements or getTaoData instead.',
  parameterShorthandNotAType: (name: string) =>
    `Parameter shorthand '${name}' must match a local type declaration in this file/scope. Use '<name> <type>' for explicit type references (including imported types).`,
  ...identifierValidationMessages,
  ...typeSystemValidationMessages,
  ...dataSchemaValidationMessages,
  ...queryValidationMessages,
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

  ForStatement: makeValidater((node, report) => {
    validateDuplicateIdentifier(node, report)
    validateUppercaseIdentifierName(node, report)
    if (!isForStatementPlacementOk(node)) {
      report.error(forCreateMessages.forOnlyInView, node)
    }
    const coll = node.collection.ref
    if (!coll) {
      return
    }
    if (!AST.isQueryDeclaration(coll)) {
      report.error(forCreateMessages.forCollectionNotQuery, { node, property: 'collection' })
      return
    }
    if (queryDeclarationCardinality(coll) === 'one') {
      report.error(forCreateMessages.forCollectionNotListQuery, { node, property: 'collection' })
    }
    for (const v of findForBodyHookViolations(node)) {
      report.error(v.message, v.node)
    }
  }),

  ObjectLiteral: makeValidater((node, report) => {
    validateDuplicateObjectPropertyNames(node, report)
  }),

  Injection: makeValidater((node, report) => {
    if (injectionReferencesLegacyIDB(node)) {
      report.error(validationMessages.legacyIDBInjection, { node, property: 'tsCodeBlock' })
    }
  }),

  StateUpdate: makeValidater((node, report) => {
    validateSetTargetsState(node, report)
  }),

  StructFieldDeclaration: makeValidater((field, report) => {
    validateUppercaseIdentifierName(field, report)
  }),

  AppDeclaration: makeValidater((declaration, report) => {
    validateDuplicateIdentifier(declaration, report)
    const uiStatements = declaration.appStatements.filter(AST.isAppUiStatement)
    const providerStatements = declaration.appStatements.filter(AST.isAppProviderStatement)

    if (uiStatements.length === 0) {
      report.error('App must have a UI declaration.', { node: declaration, property: 'appStatements' })
    }

    if (uiStatements.length > 1) {
      const first = uiStatements[0]!
      report.error('App can only have one UI declaration.', { node: first, property: 'ui' }, {
        alsoCheck: () => {
          const message = 'Another ui declaration here.'
          return removeItemFrom(first, uiStatements).map((n) => ({ node: n, message }))
        },
      })
    }

    if (providerStatements.length > 1) {
      const first = providerStatements[0]!
      report.error(validationMessages.duplicateAppProvider, { node: first, property: 'provider' }, {
        alsoCheck: () =>
          removeItemFrom(first, providerStatements).map((n) => ({
            node: n,
            message: validationMessages.duplicateAppProviderRelated,
          })),
      })
    }

    for (const stmt of providerStatements) {
      if (!isKnownTaoAppDataProviderName(stmt.provider)) {
        report.error(validationMessages.unknownAppDataProvider(stmt.provider), { node: stmt, property: 'provider' })
      }
    }

    for (const stmt of uiStatements) {
      const ref = stmt.ui.ref
      if (ref !== undefined && !AST.isViewDeclaration(ref)) {
        report.error('App ui must be a view.', { node: stmt, property: 'ui' })
      }
    }
  }),

  ...typeSystemValidator,
  ...dataSchemaValidator,
  ...queryGuardOnValidator,
  ...forCreateValidator,
  ...queryValidator,
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

/** injectionReferencesLegacyIDB returns true when injected TS references the removed generated `IDB` binding. */
function injectionReferencesLegacyIDB(node: AST.Injection): boolean {
  return /\bIDB\b/.test(node.tsCodeBlock ?? '')
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
    DataDeclaration: () => 'data',
    QueryDeclaration: () => 'query',
    ForStatement: () => 'for iterator',
  })
}

/** getBlockStatementContext returns whether `block` is nested under view-like or action-like syntax. */
function getBlockStatementContext(block: AST.Block): 'view' | 'action' | null {
  const parent = block.$container
  if (
    AST.isViewDeclaration(parent)
    || AST.isViewRender(parent)
    || AST.isGuardStatement(parent)
    || AST.isForStatement(parent)
  ) {
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

/** removeItemFrom returns a copy of the array without the first matching item reference. */
function removeItemFrom<T>(item: T, array: T[]): T[] {
  return array.filter(itemB => itemB !== item)
}
