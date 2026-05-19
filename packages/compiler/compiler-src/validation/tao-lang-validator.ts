import { isKnownTaoAppDataProviderName, unknownTaoAppDataProviderMessage } from '@compiler'
import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { Assert, switch_safe } from '@shared'
import { stringTemplateTextOnlyLiteral } from '../design/design-strings'
import {
  isViewLikeDeclaration,
  resolveVariantTargetView,
  variantHasCycle,
} from '../design/variant-resolution'
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
import { layoutValidationMessages, layoutValidator, validateViewDeclarationLayoutClause } from './LayoutValidator'
import { typeSystemValidationMessages, typeSystemValidator } from './TypeSystemValidator'
import { makeValidater, type Reporter } from './ValidationReporter'

/** validationMessages are the exact diagnostics for TaoFile and Block placement rules, merged with type-system messages. */
export const validationMessages = {
  viewBody: 'Only ui/frame/layout/alias/state/action/inject statements are allowed in a UI body.',
  actionBody: 'Only state/action/inject and set (state update) statements are allowed in an action body.',
  topLevel:
    'Only alias/state/ui/frame/layout/variant/action/data/query/inject/use statements are allowed at file level.',
  duplicateAppProvider: 'App can only have one provider declaration.',
  duplicateAppProviderRelated: 'Another provider declaration here.',
  duplicateAppDesign: 'App can only have one design block.',
  duplicateAppDesignRelated: 'Another design block here.',
  unknownAppDataProvider: unknownTaoAppDataProviderMessage,
  designStringMustBePlain: 'V1 design descriptions must be plain strings without interpolation.',
  variantMustReferenceView: '`variant` must target a ui, frame, layout, or another variant.',
  variantCycle: '`variant` target chain cannot contain a cycle.',
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
  missingChildrenSplice: (kind: string, name: string) =>
    `${kind} '${name}' must place exactly one static @@children splice.`,
  duplicateChildrenSplice: 'Only one static @@children splice is allowed in a frame/layout declaration.',
  childrenSpliceInUi: '`@@children` is only allowed in frame and layout declarations, not ui declarations.',
  childrenSpliceMustBeStatic: '`@@children` must be placed statically, outside loops and guards.',
  childrenSpliceNeedsHost: '`@@children` must be directly inside a render host block.',
  uiCallCannotHaveChildren: 'ui declarations do not accept unnamed caller children.',
  uiCallCannotHaveContainerLayout: 'ui declarations do not accept caller container layout specs.',
  declarationLayoutConflictsWithRoot: (key: string) =>
    `Declaration-line layout '${key}' conflicts with the public render root layout. Put the overridable value on the declaration line or the private value on the render root, not both.`,
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
    validateViewDeclarationLayoutClause(decl, report)
    validateViewDeclarationRenderRoot(decl, report)
    validateViewDeclarationChildrenSplice(decl, report)
    validateViewDeclarationContainerLayout(decl, report)
    validateViewDeclarationPublicLayoutConflict(decl, report)
  }),

  VariantDeclaration: makeValidater((decl, report) => {
    validateVariantDeclaration(decl, report)
  }),

  AppDesignDescription: makeValidater((node, report) => {
    if (stringTemplateTextOnlyLiteral(node.value) === undefined) {
      report.error(validationMessages.designStringMustBePlain, { node, property: 'value' })
    }
  }),

  DesignSpec: makeValidater((node, report) => {
    if (stringTemplateTextOnlyLiteral(node.description) === undefined) {
      report.error(validationMessages.designStringMustBePlain, { node, property: 'description' })
    }
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
    const designBlocks = declaration.appStatements.filter(AST.isAppDesignBlock)

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

    if (designBlocks.length > 1) {
      const first = designBlocks[0]!
      report.error(validationMessages.duplicateAppDesign, first, {
        alsoCheck: () =>
          removeItemFrom(first, designBlocks).map((n) => ({
            node: n,
            message: validationMessages.duplicateAppDesignRelated,
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
      if (ref !== undefined && !isViewLikeDeclaration(ref)) {
        report.error('App ui must reference a ui, frame, layout, or variant declaration.', {
          node: stmt,
          property: 'ui',
        })
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
    validateViewRender(node, accept)
    runViewRenderChecks(typeSystemValidator.ViewRender, node, accept, services)
    runViewRenderChecks(layoutValidator.ViewRender, node, accept, services)
  },

  ChildrenSplice: makeValidater((node, report) => {
    validateChildrenSplice(node, report)
  }),
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
  validateRenderHostChildrenAndContainerLayout(node, report)
})

function validateViewDeclarationRenderRoot(decl: AST.ViewDeclaration, report: Reporter<AST.ViewDeclaration>): void {
  if (decl.block === undefined) {
    return
  }
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

function validateViewDeclarationChildrenSplice(decl: AST.ViewDeclaration, report: Reporter<AST.ViewDeclaration>): void {
  if (decl.block === undefined) {
    return
  }
  const splices = childrenSplicesInDeclaration(decl)
  const staticSplices = splices.filter(isStaticHostedChildrenSplice)

  if (decl.type === 'ui') {
    return
  }

  if (staticSplices.length === 0) {
    if (viewDeclarationForwardsChildrenThroughInjection(decl)) {
      return
    }
    report.error(validationMessages.missingChildrenSplice(decl.type, decl.name), { node: decl, property: 'block' })
    return
  }

  if (staticSplices.length > 1) {
    const first = staticSplices[0]!
    report.error(validationMessages.duplicateChildrenSplice, first, {
      alsoCheck: () => {
        const message = 'Another @@children splice here.'
        return removeItemFrom(first, staticSplices).map((n) => ({ node: n, message }))
      },
    })
  }
}

function validateViewDeclarationPublicLayoutConflict(
  decl: AST.ViewDeclaration,
  report: Reporter<AST.ViewDeclaration>,
): void {
  if (decl.block === undefined) {
    return
  }
  const declarationEntries = decl.layoutClause?.entries ?? []
  if (declarationEntries.length === 0) {
    return
  }
  const renderRoot = decl.block.statements.find(AST.isRenderStatement)
  if (renderRoot?.layoutClause === undefined) {
    return
  }

  const declarationKeys = new Map<string, AST.LayoutEntry>()
  for (const entry of declarationEntries) {
    const key = publicSelfLayoutConflictKey(entry)
    if (key !== undefined) {
      declarationKeys.set(key, entry)
    }
  }

  for (const entry of renderRoot.layoutClause.entries) {
    const key = publicSelfLayoutConflictKey(entry)
    const declarationEntry = key === undefined ? undefined : declarationKeys.get(key)
    if (key !== undefined && declarationEntry !== undefined) {
      report.error(validationMessages.declarationLayoutConflictsWithRoot(key), declarationEntry)
    }
  }
}

function validateViewDeclarationContainerLayout(
  decl: AST.ViewDeclaration,
  report: Reporter<AST.ViewDeclaration>,
): void {
  if (decl.type !== 'ui') {
    return
  }
  if (layoutClauseHasContainerEntries(decl.layoutClause)) {
    report.error(validationMessages.uiCallCannotHaveContainerLayout, { node: decl, property: 'layoutClause' })
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
  if (!isViewLikeDeclaration(target)) {
    report.error(validationMessages.renderMustReferenceView, { node, property: 'view' })
  }
}

function validateVariantDeclaration(
  node: AST.VariantDeclaration,
  report: Reporter<AST.VariantDeclaration>,
): void {
  const target = node.target.ref
  if (target === undefined) {
    return
  }
  if (!isViewLikeDeclaration(target)) {
    report.error(validationMessages.variantMustReferenceView, { node, property: 'target' })
    return
  }
  if (variantHasCycle(node) || resolveVariantTargetView(node) === undefined) {
    report.error(validationMessages.variantCycle, { node, property: 'target' })
  }
}

function validateChildrenSplice(node: AST.ChildrenSplice, report: Reporter<AST.ChildrenSplice>): void {
  const owner = nearestViewDeclaration(node)
  if (owner === undefined) {
    report.error(validationMessages.childrenSpliceNeedsHost, node)
    return
  }

  if (owner.type === 'ui') {
    report.error(validationMessages.childrenSpliceInUi, node)
  }

  if (!isChildrenSpliceDirectlyHosted(node)) {
    report.error(validationMessages.childrenSpliceNeedsHost, node)
  }

  if (!isStaticChildrenSplice(node, owner)) {
    report.error(validationMessages.childrenSpliceMustBeStatic, node)
  }
}

const validateViewRender = makeValidater((node: AST.ViewRender, report) => {
  validateRenderHostChildrenAndContainerLayout(node, report)
})

function validateRenderHostChildrenAndContainerLayout(
  node: AST.RenderStatement | AST.ViewRender,
  report: Reporter<AST.RenderStatement | AST.ViewRender>,
): void {
  const target = isViewLikeDeclaration(node.view?.ref) ? resolveVariantTargetView(node.view.ref) : undefined
  if (!AST.isViewDeclaration(target) || target.type !== 'ui') {
    return
  }
  if (hasUnnamedCallerChildren(node)) {
    report.error(validationMessages.uiCallCannotHaveChildren, node.block!)
  }
  if (layoutClauseHasContainerEntries(node.layoutClause)) {
    report.error(validationMessages.uiCallCannotHaveContainerLayout, { node, property: 'layoutClause' })
  }
}

function hasUnnamedCallerChildren(node: AST.RenderStatement | AST.ViewRender): boolean {
  return node.block !== undefined && node.block.statements.length > 0
}

function layoutClauseHasContainerEntries(clause: AST.LayoutClause | undefined): boolean {
  return clause?.entries.some((entry) => {
    const head = entry.terms[0]
    const value = head === undefined ? undefined : layoutTermText(head)
    return value === 'items' || value === 'gap'
  }) ?? false
}

function publicSelfLayoutConflictKey(entry: AST.LayoutEntry): string | undefined {
  const head = entry.terms[0]
  const value = head === undefined ? undefined : layoutTermText(head)
  switch (value) {
    case 'items':
    case 'gap':
      return undefined
    case 'aligned':
    case 'stretched':
      return 'alignSelf'
    case 'fill':
    case 'hug':
      return 'size'
    case 'grow':
    case 'compress':
    case 'rigid':
      return 'pressure'
    case 'width':
    case 'height':
    case 'pad':
      return value
  }
  return value
}

function layoutTermText(term: AST.LayoutTerm): string | undefined {
  if (AST.isLayoutWord(term)) {
    return term.value
  }
  return undefined
}

function viewDeclarationForwardsChildrenThroughInjection(decl: AST.ViewDeclaration): boolean {
  const roots = decl.block.statements.filter(AST.isRenderStatement)
  const injection = roots.length === 1 ? roots[0]?.injection : undefined
  return injection !== undefined && injectionForwardsViewPropsChildren(injection)
}

function injectionForwardsViewPropsChildren(injection: AST.Injection): boolean {
  const code = injection.tsCodeBlock
  return /\b_ViewProps\s*\.\s*children\b/.test(code)
    || /\.\.\s*_ViewProps\b/.test(code)
    || /\(\s*_ViewProps\s*\)/.test(code)
}

function childrenSplicesInDeclaration(decl: AST.ViewDeclaration): AST.ChildrenSplice[] {
  const splices: AST.ChildrenSplice[] = []
  for (const stmt of decl.block.statements) {
    collectChildrenSplices(stmt, splices)
  }
  return splices
}

function collectChildrenSplices(stmt: AST.Statement, splices: AST.ChildrenSplice[]): void {
  if (AST.isChildrenSplice(stmt)) {
    splices.push(stmt)
    return
  }
  if (AST.isDeclaration(stmt)) {
    return
  }
  if (AST.isRenderStatement(stmt) || AST.isViewRender(stmt) || AST.isGuardStatement(stmt) || AST.isForStatement(stmt)) {
    for (const child of stmt.block?.statements ?? []) {
      collectChildrenSplices(child, splices)
    }
  }
}

function isStaticHostedChildrenSplice(node: AST.ChildrenSplice): boolean {
  const owner = nearestViewDeclaration(node)
  return owner !== undefined && isChildrenSpliceDirectlyHosted(node) && isStaticChildrenSplice(node, owner)
}

function isChildrenSpliceDirectlyHosted(node: AST.ChildrenSplice): boolean {
  const block = node.$container
  if (!AST.isBlock(block)) {
    return false
  }
  const host = block.$container
  return AST.isRenderStatement(host) || AST.isViewRender(host)
}

function isStaticChildrenSplice(node: AST.ChildrenSplice, owner: AST.ViewDeclaration): boolean {
  let current = node.$container as AST.Node | undefined
  while (current !== undefined && current !== owner) {
    if (AST.isForStatement(current) || AST.isGuardStatement(current)) {
      return false
    }
    if (AST.isViewDeclaration(current) && current !== owner) {
      return false
    }
    current = current.$container as AST.Node | undefined
  }
  return current === owner
}

function nearestViewDeclaration(node: AST.Node): AST.ViewDeclaration | undefined {
  let current = node.$container as AST.Node | undefined
  while (current !== undefined) {
    if (AST.isViewDeclaration(current)) {
      return current
    }
    current = current.$container as AST.Node | undefined
  }
  return undefined
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
    NavigatorDeclaration: () => 'navigator',
    VariantDeclaration: () => 'variant',
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
