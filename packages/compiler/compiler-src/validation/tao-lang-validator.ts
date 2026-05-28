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
import {
  buildTaoNavigationTree,
  findNavigationTarget,
  isNavigationTarget,
  navigationDestinationIcons,
  navigationDestinationParams,
  navigationDestinationPath,
  type TaoNavigationDestination,
} from '../navigation/navigation-tree'
import {
  actionParameterDataRowHandleEntity,
  queryDeclarationCardinality,
} from '../query/query-model'
import { parameterResolvedType, resolveShorthandParameterType } from '../tao-type-shapes'
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
  actionBody:
    'Only state/action/inject, set (state update), create, and navigation statements are allowed in an action body.',
  functionBody: 'Only alias/debugger/if/return statements are allowed in a function body.',
  topLevel:
    'Only alias/state/ui/frame/layout/navigator/variant/action/function/data/query/inject/use statements are allowed at file level.',
  appRootRequired: 'App must have exactly one root entry: ui or navigation.',
  appRootExclusive: 'App can only have one root entry. Choose ui or navigation.',
  duplicateAppUi: 'App can only have one UI declaration.',
  duplicateAppUiRelated: 'Another ui declaration here.',
  duplicateAppNavigation: 'App can only have one navigation declaration.',
  duplicateAppNavigationRelated: 'Another navigation declaration here.',
  appUiMustReferenceView: 'App ui must reference a ui, frame, layout, or variant declaration.',
  appNavigationMustReferenceNavigator: 'App navigation must reference a navigator declaration.',
  appNavigationMustReferenceLocalNavigator:
    'App navigation must reference a navigator declared in the same source file for navigation v1.',
  duplicateAppProvider: 'App can only have one provider declaration.',
  duplicateAppProviderRelated: 'Another provider declaration here.',
  duplicateAppDesign: 'App can only have one design block.',
  duplicateAppDesignRelated: 'Another design block here.',
  unknownAppDataProvider: unknownTaoAppDataProviderMessage,
  designStringMustBePlain: 'V1 design descriptions must be plain strings without interpolation.',
  variantMustReferenceView: '`variant` must target a ui, frame, layout, or another variant.',
  variantCycle: '`variant` target chain cannot contain a cycle.',
  duplicateObjectProperty: (name: string) => `Duplicate object property '${name}'.`,
  duplicateNavigatorDestination: (name: string) => `Navigator destination '${name}' is declared more than once.`,
  duplicateNavigatorDestinationRelated: 'Another destination with this name is declared here.',
  duplicateNavigationActionParam: (name: string) => `Navigation action param '${name}' is provided more than once.`,
  duplicateNavigationDestinationParam: (name: string) => `Navigation param '${name}' is declared more than once.`,
  duplicateNavigationIcon: '`icon` can only be declared once per navigation destination.',
  duplicateNavigationOptionRelated: 'First declaration is here.',
  duplicateNavigationPath: '`path` can only be declared once per navigation destination.',
  duplicateNavigationTitle: '`title` can only be declared once per navigation destination.',
  navigationInitialDestinationParamsUnsupported:
    'The first destination in a navigator cannot require params in navigation v1.',
  navigationIconStackOnly: '`icon` is only supported on tab destinations.',
  navigationPathMustBePlain: 'Navigation paths must be plain strings without interpolation.',
  navigationPathMissingParam: (name: string) => `Navigation path placeholder ':${name}' has no matching param.`,
  navigationParamMissingFromPath: (name: string) => `Navigation param '${name}' must appear in the path.`,
  navigationParamMissingFromTarget: (name: string, target: string) =>
    `Navigation param '${name}' has no matching parameter on target '${target}'.`,
  navigationParamUnsupportedTargetType: (name: string, target: string) =>
    `Navigation target '${target}' param '${name}' must be text, number, or boolean.`,
  navigationTargetMissingParam: (name: string, target: string) =>
    `Navigation target '${target}' requires param '${name}'.`,
  navigationParamTypeMismatch: (name: string, expected: string, actual: string) =>
    `Navigation param '${name}' is '${actual}' but target parameter expects '${expected}'.`,
  navigationTabDestinationParamsUnsupported: 'Tab destinations cannot require params in navigation v1.',
  navigationActionNeedsAppNavigation: 'Navigation actions require app-level navigation in the same source file.',
  navigationActionUnknownTarget: (name: string) => `Navigation action targets unknown destination '${name}'.`,
  navigationActionAmbiguousTarget: (name: string) => `Navigation action target '${name}' is ambiguous.`,
  navigationPushTargetMustBeStack: (name: string) => `navigation push target '${name}' must be a stack destination.`,
  navigationTabTargetMustBeTab: (name: string) => `navigation tab target '${name}' must be a tab destination.`,
  navigationActionTargetMustBeRootDestination: (name: string) =>
    `Navigation action target '${name}' must be declared directly in the app's root navigator.`,
  navigationPopRequiresStack: 'navigation pop requires a reachable stack destination.',
  navigationActionMissingParam: (name: string, target: string) =>
    `Navigation action for '${target}' is missing param '${name}'.`,
  navigationActionExtraParam: (name: string, target: string) =>
    `Navigation action for '${target}' provides unknown param '${name}'.`,
  navigationActionParamUnsupportedExpression: (name: string) =>
    `Navigation action param '${name}' must evaluate to text, number, or boolean.`,
  navigationActionParamTypeMismatch: (name: string, expected: string, actual: string) =>
    `Navigation action param '${name}' is '${actual}' but destination expects '${expected}'.`,
  navigationActionShorthandParamUnknown: (name: string) =>
    `Navigation action shorthand param '${name}' must match a parameter on the enclosing action.`,
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
    const checkFn = getStatementCheckFunction(ctx)
    const message = getBlockStatementMessage(ctx)
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
    const navigationStatements = declaration.appStatements.filter(AST.isAppNavigationStatement)
    const providerStatements = declaration.appStatements.filter(AST.isAppProviderStatement)
    const designBlocks = declaration.appStatements.filter(AST.isAppDesignBlock)

    if (uiStatements.length + navigationStatements.length === 0) {
      report.error(validationMessages.appRootRequired, { node: declaration, property: 'appStatements' })
    }

    if (uiStatements.length > 0 && navigationStatements.length > 0) {
      report.error(validationMessages.appRootExclusive, navigationStatements[0]!, {
        alsoCheck: () => uiStatements.map((n) => ({ node: n, message: 'ui root declared here.' })),
      })
    }

    if (uiStatements.length > 1) {
      const first = uiStatements[0]!
      report.error(validationMessages.duplicateAppUi, { node: first, property: 'ui' }, {
        alsoCheck: () => {
          const message = validationMessages.duplicateAppUiRelated
          return removeItemFrom(first, uiStatements).map((n) => ({ node: n, message }))
        },
      })
    }

    if (navigationStatements.length > 1) {
      const first = navigationStatements[0]!
      report.error(validationMessages.duplicateAppNavigation, { node: first, property: 'navigation' }, {
        alsoCheck: () => {
          const message = validationMessages.duplicateAppNavigationRelated
          return removeItemFrom(first, navigationStatements).map((n) => ({ node: n, message }))
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
        report.error(validationMessages.appUiMustReferenceView, {
          node: stmt,
          property: 'ui',
        })
      }
    }

    for (const stmt of navigationStatements) {
      const ref = stmt.navigation.ref
      if (ref !== undefined && !AST.isNavigatorDeclaration(ref)) {
        report.error(validationMessages.appNavigationMustReferenceNavigator, {
          node: stmt,
          property: 'navigation',
        })
        continue
      }
      if (ref !== undefined && AST.Utils.findRootNode(ref) !== AST.Utils.findRootNode(stmt)) {
        report.error(validationMessages.appNavigationMustReferenceLocalNavigator, {
          node: stmt,
          property: 'navigation',
        })
        continue
      }
      validateAppNavigationTree(stmt, report)
    }
  }),

  NavigatorDeclaration: makeValidater((declaration, report) => {
    validateNavigatorDeclaration(declaration, report)
  }),

  NavigationPushAction: makeValidater((node, report) => {
    validateNavigationPushAction(node, report)
  }),

  NavigationPopAction: makeValidater((node, report) => {
    validateNavigationPopAction(node, report)
  }),

  NavigationTabAction: makeValidater((node, report) => {
    validateNavigationTabAction(node, report)
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

function validateNavigatorDeclaration(
  declaration: AST.NavigatorDeclaration,
  report: Reporter<AST.NavigatorDeclaration>,
): void {
  const { destinations } = declaration.body
  const seen = new Map<string, AST.StackDestination | AST.TabDestination>()
  for (const destination of destinations) {
    const first = seen.get(destination.name)
    if (first !== undefined) {
      report.error(validationMessages.duplicateNavigatorDestination(destination.name), {
        node: destination,
        property: 'name',
      }, {
        alsoCheck: () => ({ node: first, message: validationMessages.duplicateNavigatorDestinationRelated }),
      })
    } else {
      seen.set(destination.name, destination)
    }
  }
  const firstDestination = destinations[0]
  if (firstDestination !== undefined && navigationDestinationParams(firstDestination).length > 0) {
    report.error(validationMessages.navigationInitialDestinationParamsUnsupported, firstDestination)
  }
  for (const destination of destinations) {
    const kind = AST.isStackDestination(destination) ? 'stack' : 'tab'
    if (kind === 'tab' && navigationDestinationParams(destination).length > 0) {
      report.error(validationMessages.navigationTabDestinationParamsUnsupported, destination)
    }
    validateLocalNavigationDestination(declaration, destination, kind, report)
  }
}

function validateLocalNavigationDestination(
  parentNavigator: AST.NavigatorDeclaration,
  node: AST.StackDestination | AST.TabDestination,
  kind: 'stack' | 'tab',
  report: Reporter<AST.NavigatorDeclaration>,
): void {
  const targetName = node.target ?? node.name
  const target = findNavigationTarget(node, targetName)
  if (target === undefined) {
    report.error(`Navigation destination '${node.name}' targets missing declaration '${targetName}'.`, node)
  } else if (!isNavigationTarget(target)) {
    report.error(
      `Navigation destination '${node.name}' must target a ui, frame, layout, variant, or navigator declaration.`,
      node,
    )
  }
  validateNavigationDestination(
    {
      kind,
      name: node.name,
      node,
      params: navigationDestinationParams(node),
      parentNavigator,
      path: navigationDestinationPath(node),
      target: isNavigationTarget(target) ? target : undefined,
      targetName,
    },
    report,
  )
}

function validateAppNavigationTree(
  appNavigation: AST.AppNavigationStatement,
  report: Reporter<AST.AppDeclaration>,
): void {
  const tree = buildTaoNavigationTree(appNavigation)
  for (const issue of tree.issues) {
    report.error(issue.message, issue.node)
  }
  for (const destination of tree.destinations) {
    validateNavigationDestination(destination, report)
  }
}

function validateNavigationDestination(
  destination: TaoNavigationDestination,
  report: Reporter<AST.AppDeclaration | AST.NavigatorDeclaration>,
): void {
  validateNavigationDestinationOptionCardinality(destination, report)
  if (destination.kind === 'stack') {
    for (const icon of navigationDestinationIcons(destination.node)) {
      report.error(validationMessages.navigationIconStackOnly, icon)
    }
  }
  validateNavigationPathParams(destination, report)
  validateNavigationTargetParams(destination, report)
}

function validateNavigationDestinationOptionCardinality(
  destination: TaoNavigationDestination,
  report: Reporter<AST.AppDeclaration | AST.NavigatorDeclaration>,
): void {
  validateSingleNavigationOption(
    destination.node.options?.options.filter(AST.isNavigationTitleOption) ?? [],
    validationMessages.duplicateNavigationTitle,
    report,
  )
  validateSingleNavigationOption(
    destination.node.options?.options.filter(AST.isNavigationPathOption) ?? [],
    validationMessages.duplicateNavigationPath,
    report,
  )
  validateSingleNavigationOption(
    navigationDestinationIcons(destination.node),
    validationMessages.duplicateNavigationIcon,
    report,
  )
  const seenParams = new Map<string, AST.NavigationParamDeclaration>()
  for (const param of destination.params) {
    const first = seenParams.get(param.name)
    if (first !== undefined) {
      report.error(validationMessages.duplicateNavigationDestinationParam(param.name), param, {
        alsoCheck: () => ({ node: first, message: validationMessages.duplicateNavigationOptionRelated }),
      })
    } else {
      seenParams.set(param.name, param)
    }
  }
}

function validateSingleNavigationOption<T extends AST.Node>(
  options: readonly T[],
  message: string,
  report: Reporter<AST.AppDeclaration | AST.NavigatorDeclaration>,
): void {
  const [first, ...duplicates] = options
  if (first === undefined) {
    return
  }
  for (const duplicate of duplicates) {
    report.error(message, duplicate, {
      alsoCheck: () => ({ node: first, message: validationMessages.duplicateNavigationOptionRelated }),
    })
  }
}

function validateNavigationPathParams(
  destination: TaoNavigationDestination,
  report: Reporter<AST.AppDeclaration | AST.NavigatorDeclaration>,
): void {
  if (destination.path === undefined) {
    return
  }
  const path = stringTemplateTextOnlyLiteral(destination.path.value)
  if (path === undefined) {
    report.error(validationMessages.navigationPathMustBePlain, destination.path)
    return
  }
  const placeholders = new Set([...path.matchAll(/:([A-Za-z_][\w_]*)/g)].map(match => match[1]!))
  const paramNames = new Set(destination.params.map(param => param.name))
  for (const placeholder of placeholders) {
    if (!paramNames.has(placeholder)) {
      report.error(validationMessages.navigationPathMissingParam(placeholder), destination.path)
    }
  }
  for (const param of destination.params) {
    if (!placeholders.has(param.name)) {
      report.error(validationMessages.navigationParamMissingFromPath(param.name), param)
    }
  }
}

function validateNavigationTargetParams(
  destination: TaoNavigationDestination,
  report: Reporter<AST.AppDeclaration | AST.NavigatorDeclaration>,
): void {
  if (!destination.target || AST.isNavigatorDeclaration(destination.target)) {
    return
  }
  const target = resolveVariantTargetView(destination.target)
  if (target === undefined) {
    return
  }
  const destinationParams = new Map(destination.params.map(param => [param.name, param]))
  const targetParams = new Map((target.parameterList?.parameters ?? []).map(param => [param.name, param]))
  const targetParamTypes = new Map<AST.ParameterDeclaration, AST.NavigationParamType>()
  for (const targetParam of target.parameterList?.parameters ?? []) {
    const targetType = navigationSafeParameterType(targetParam)
    if (targetType === undefined) {
      report.error(validationMessages.navigationParamUnsupportedTargetType(targetParam.name, target.name), targetParam)
    } else {
      targetParamTypes.set(targetParam, targetType)
    }
  }
  for (const param of destination.params) {
    const targetParam = targetParams.get(param.name)
    if (targetParam === undefined) {
      report.error(validationMessages.navigationParamMissingFromTarget(param.name, target.name), param)
      continue
    }
    const targetType = targetParamTypes.get(targetParam)
    if (targetType !== undefined && targetType !== param.type) {
      report.error(validationMessages.navigationParamTypeMismatch(param.name, targetType, param.type), param)
    }
  }
  for (const targetParam of target.parameterList?.parameters ?? []) {
    if (!destinationParams.has(targetParam.name)) {
      report.error(validationMessages.navigationTargetMissingParam(targetParam.name, target.name), destination.node)
    }
  }
}

function validateNavigationPushAction(
  node: AST.NavigationPushAction,
  report: Reporter<AST.NavigationPushAction>,
): void {
  const destination = navigationActionDestination(node, node.target, 'push', report)
  if (destination !== undefined) {
    validateNavigationActionPayload(node, destination, report)
  }
}

function validateNavigationPopAction(
  node: AST.NavigationPopAction,
  report: Reporter<AST.NavigationPopAction>,
): void {
  const tree = navigationTreeForAction(node, report)
  if (tree === undefined) {
    return
  }
  if (!tree.destinations.some(destination => destination.kind === 'stack')) {
    report.error(validationMessages.navigationPopRequiresStack, node)
  }
}

function validateNavigationTabAction(
  node: AST.NavigationTabAction,
  report: Reporter<AST.NavigationTabAction>,
): void {
  const destination = navigationActionDestination(node, node.target, 'tab', report)
  if (destination !== undefined) {
    validateNavigationActionPayload(node, destination, report)
  }
}

function navigationActionDestination<NodeT extends AST.NavigationPushAction | AST.NavigationTabAction>(
  node: NodeT,
  target: string,
  action: 'push' | 'tab',
  report: Reporter<NodeT>,
): TaoNavigationDestination | undefined {
  const tree = navigationTreeForAction(node, report)
  if (tree === undefined) {
    return undefined
  }
  const matches = tree.destinationsByName.get(target) ?? []
  if (matches.length === 0) {
    report.error(validationMessages.navigationActionUnknownTarget(target), node)
    return undefined
  }
  if (matches.length > 1) {
    report.error(validationMessages.navigationActionAmbiguousTarget(target), node)
    return undefined
  }
  const destination = matches[0]!
  if (action === 'push' && destination.kind !== 'stack') {
    report.error(validationMessages.navigationPushTargetMustBeStack(target), node)
    return undefined
  }
  if (action === 'tab' && destination.kind !== 'tab') {
    report.error(validationMessages.navigationTabTargetMustBeTab(target), node)
    return undefined
  }
  if (tree.root !== undefined && destination.parentNavigator !== tree.root) {
    report.error(validationMessages.navigationActionTargetMustBeRootDestination(target), node)
    return undefined
  }
  return destination
}

function validateNavigationActionPayload<NodeT extends AST.NavigationPushAction | AST.NavigationTabAction>(
  node: NodeT,
  destination: TaoNavigationDestination,
  report: Reporter<NodeT>,
): void {
  const assignments = node.payload?.assignments ?? []
  const assignmentByName = new Map<string, AST.NavigationActionParamAssignment>()
  for (const assignment of assignments) {
    const first = assignmentByName.get(assignment.name)
    if (first !== undefined) {
      report.error(validationMessages.duplicateNavigationActionParam(assignment.name), assignment, {
        alsoCheck: () => ({ node: first, message: validationMessages.duplicateNavigationOptionRelated }),
      })
    } else {
      assignmentByName.set(assignment.name, assignment)
    }
  }
  const paramsByName = new Map(destination.params.map(param => [param.name, param]))
  for (const param of destination.params) {
    const assignment = assignmentByName.get(param.name)
    if (assignment === undefined) {
      report.error(validationMessages.navigationActionMissingParam(param.name, destination.name), node)
      continue
    }
    const actualType = navigationPayloadValueType(assignment)
    if (actualType === undefined) {
      report.error(validationMessages.navigationActionParamUnsupportedExpression(param.name), assignment)
    } else if (actualType !== param.type) {
      report.error(
        validationMessages.navigationActionParamTypeMismatch(param.name, param.type, actualType),
        assignment,
      )
    }
  }
  for (const assignment of assignments) {
    if (!paramsByName.has(assignment.name)) {
      report.error(validationMessages.navigationActionExtraParam(assignment.name, destination.name), assignment)
    } else if (assignment.value === undefined && navigationActionPayloadShorthandParam(assignment) === undefined) {
      report.error(validationMessages.navigationActionShorthandParamUnknown(assignment.name), assignment)
    }
  }
}

function navigationTreeForAction<
  NodeT extends AST.NavigationPushAction | AST.NavigationPopAction | AST.NavigationTabAction,
>(
  node: NodeT,
  report: Reporter<NodeT>,
): ReturnType<typeof buildTaoNavigationTree> | undefined {
  const appNavigation = appNavigationForNode(node)
  if (appNavigation === undefined) {
    report.error(validationMessages.navigationActionNeedsAppNavigation, node)
    return undefined
  }
  const tree = buildTaoNavigationTree(appNavigation)
  if (tree.issues.length > 0) {
    return undefined
  }
  return tree
}

function appNavigationForNode(node: AST.Node): AST.AppNavigationStatement | undefined {
  const root = AST.Utils.findRootNode(node)
  if (!AST.isTaoFile(root)) {
    return undefined
  }
  for (const statement of root.statements) {
    const declaration = AST.isModuleDeclaration(statement)
      ? statement.declaration
      : AST.isDeclaration(statement)
      ? statement
      : undefined
    if (!AST.isAppDeclaration(declaration)) {
      continue
    }
    const appNavigation = declaration.appStatements.find(AST.isAppNavigationStatement)
    if (appNavigation !== undefined) {
      return appNavigation
    }
  }
  return undefined
}

function navigationSafeParameterType(param: AST.ParameterDeclaration): AST.NavigationParamType | undefined {
  const resolved = parameterResolvedType(param)
  if (resolved.kind !== 'primitive') {
    return undefined
  }
  return isNavigationParamType(resolved.primitive) ? resolved.primitive : undefined
}

function navigationPayloadValueType(
  assignment: AST.NavigationActionParamAssignment,
): AST.NavigationParamType | undefined {
  const value = assignment.value
  if (value === undefined) {
    const param = navigationActionPayloadShorthandParam(assignment)
    return param === undefined ? undefined : navigationSafeParameterType(param)
  }
  if (AST.isStringTemplateExpression(value)) {
    return 'text'
  }
  if (AST.isNumberLiteral(value)) {
    return 'number'
  }
  if (AST.isBooleanLiteral(value)) {
    return 'boolean'
  }
  if (AST.isUnaryExpression(value) && AST.isNumberLiteral(value.operand)) {
    return 'number'
  }
  if (AST.isMemberAccessExpression(value) && value.properties.length === 0) {
    const ref = value.root.ref
    return AST.isParameterDeclaration(ref) ? navigationSafeParameterType(ref) : undefined
  }
  return undefined
}

function navigationActionPayloadShorthandParam(
  assignment: AST.NavigationActionParamAssignment,
): AST.ParameterDeclaration | undefined {
  if (assignment.value !== undefined) {
    return undefined
  }
  const action = nearestActionDeclaration(assignment)
  return action?.parameterList?.parameters.find(param => param.name === assignment.name)
}

function nearestActionDeclaration(node: AST.Node): AST.ActionDeclaration | undefined {
  let current: AST.Node | undefined = node.$container
  while (current !== undefined) {
    if (AST.isActionDeclaration(current)) {
      return current
    }
    if (AST.isTaoFile(current)) {
      return undefined
    }
    current = current.$container
  }
  return undefined
}

function isNavigationParamType(value: string): value is AST.NavigationParamType {
  return value === 'text' || value === 'number' || value === 'boolean'
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
    FunctionDeclaration: () => 'function',
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
function getBlockStatementContext(block: AST.Block): 'view' | 'action' | 'function' | null {
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
  } else if (AST.isFunctionDeclaration(parent)) {
    return 'function'
  } else if (AST.isIfStatement(parent)) {
    return getBlockStatementContext(parent.$container as AST.Block)
  }
  Assert.never(parent)
}

function getStatementCheckFunction(ctx: ReturnType<typeof getBlockStatementContext>) {
  if (ctx === 'view') {
    return AST.isViewStatement
  }
  if (ctx === 'function') {
    return AST.isFunctionStatement
  }
  return AST.isActionStatement
}

function getBlockStatementMessage(ctx: ReturnType<typeof getBlockStatementContext>): string {
  if (ctx === 'view') {
    return validationMessages.viewBody
  }
  if (ctx === 'function') {
    return validationMessages.functionBody
  }
  return validationMessages.actionBody
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
  if (resolved === undefined && actionParameterDataRowHandleEntity(param) === undefined) {
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
