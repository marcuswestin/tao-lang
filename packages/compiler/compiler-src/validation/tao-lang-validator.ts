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
import { layoutValidationMessages, layoutValidator } from './LayoutValidator'
import { typeSystemValidationMessages, typeSystemValidator } from './TypeSystemValidator'
import { makeValidater, type Reporter } from './ValidationReporter'

/** validationMessages are the exact diagnostics for TaoFile and Block placement rules, merged with type-system messages. */
export const validationMessages = {
  viewBody: 'Only ui/frame/layout/alias/state/action/inject statements are allowed in a UI body.',
  actionBody: 'Only state/action/inject and set (state update) statements are allowed in an action body.',
  topLevel: 'Only alias/state/ui/frame/layout/action/inject/use statements are allowed at file level.',
  duplicateAppProvider: 'App can only have one provider declaration.',
  duplicateAppProviderRelated: 'Another provider declaration here.',
  unknownAppDataProvider: unknownTaoAppDataProviderMessage,
  duplicateObjectProperty: (name: string) => `Duplicate object property '${name}'.`,
  setTargetMustBeState: (kind: string) => `'set' can only target a state binding, not a '${kind}'.`,
  legacyIDBInjection:
    '`IDB` is no longer available in injected TypeScript; use compiled data/query/create statements or getTaoData instead.',
  parameterShorthandNotAType: (name: string) =>
    `Parameter shorthand '${name}' must match a local type declaration in this file/scope. Use '<name> <type>' for explicit type references (including imported types).`,
  missingRenderRoot: (kind: string, name: string) =>
    `${kind} '${name}' must declare exactly one top-level render statement.`,
  duplicateRenderRoot: 'Only one top-level render statement is allowed in a ui/frame/layout declaration.',
  nestedRenderRoot: '`render` is only allowed as a top-level statement inside a ui/frame/layout declaration.',
  renderMustReferenceView: '`render` must target a ui, frame, or layout declaration.',
  ...identifierValidationMessages,
  ...layoutValidationMessages,
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

  ViewDeclaration: makeValidater((decl, report) => {
    validateViewDeclarationRenderRoot(decl, report)
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
        report.error('App ui must reference a ui, frame, or layout declaration.', { node: stmt, property: 'ui' })
      }
    }
  }),

  ...typeSystemValidator,
  ...dataSchemaValidator,
  ...queryGuardOnValidator,
  ...forCreateValidator,
  ...queryValidator,

  RenderStatement: (node, accept, services) => {
    validateRenderStatement(node, accept)
    runRenderStatementChecks(typeSystemValidator.RenderStatement, node, accept, services)
    runRenderStatementChecks(layoutValidator.RenderStatement, node, accept, services)
  },

  ViewRender: (node, accept, services) => {
    runViewRenderChecks(typeSystemValidator.ViewRender, node, accept, services)
    runViewRenderChecks(layoutValidator.ViewRender, node, accept, services)
  },
}

type RenderStatementCheckFn = (node: AST.RenderStatement, accept: AST.ValidationAcceptor, services: unknown) => void
type ViewRenderCheckFn = (node: AST.ViewRender, accept: AST.ValidationAcceptor, services: unknown) => void

function runRenderStatementChecks(
  checks: langium.ValidationChecks<AST.TaoLangAstType>['RenderStatement'],
  node: AST.RenderStatement,
  accept: AST.ValidationAcceptor,
  services: unknown,
): void {
  if (checks === undefined) {
    return
  }
  for (const check of Array.isArray(checks) ? checks : [checks]) {
    const runCheck = check as RenderStatementCheckFn
    runCheck(node, accept, services)
  }
}

function runViewRenderChecks(
  checks: langium.ValidationChecks<AST.TaoLangAstType>['ViewRender'],
  node: AST.ViewRender,
  accept: AST.ValidationAcceptor,
  services: unknown,
): void {
  if (checks === undefined) {
    return
  }
  for (const check of Array.isArray(checks) ? checks : [checks]) {
    const runCheck = check as ViewRenderCheckFn
    runCheck(node, accept, services)
  }
}

const validateRenderStatement = makeValidater((node: AST.RenderStatement, report) => {
  validateRenderStatementPlacement(node, report)
  validateRenderStatementTarget(node, report)
})

function validateViewDeclarationRenderRoot(decl: AST.ViewDeclaration, report: Reporter<AST.ViewDeclaration>): void {
  const renderRoots = decl.block.statements.filter(AST.isRenderStatement)
  if (renderRoots.length === 0) {
    report.error(validationMessages.missingRenderRoot(decl.type, decl.name), { node: decl, property: 'block' })
    return
  }
  if (renderRoots.length > 1) {
    const first = renderRoots[0]!
    report.error(validationMessages.duplicateRenderRoot, first, {
      alsoCheck: () => {
        const message = 'Another render statement here.'
        return removeItemFrom(first, renderRoots).map((n) => ({ node: n, message }))
      },
    })
  }
}

function validateRenderStatementPlacement(
  node: AST.RenderStatement,
  report: Reporter<AST.RenderStatement>,
): void {
  const block = node.$container
  if (!AST.isBlock(block) || !AST.isViewDeclaration(block.$container)) {
    report.error(validationMessages.nestedRenderRoot, node)
  }
}

function validateRenderStatementTarget(
  node: AST.RenderStatement,
  report: Reporter<AST.RenderStatement>,
): void {
  const target = node.view?.ref
  if (target === undefined) {
    return
  }
  if (!AST.isViewDeclaration(target)) {
    report.error(validationMessages.renderMustReferenceView, { node, property: 'view' })
  }
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
  if (AST.isViewDeclaration(ref)) {
    return ref.type
  }
  return switch_safe(ref.$type, {
    ParameterDeclaration: () => 'parameter',
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
    || AST.isRenderStatement(parent)
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
