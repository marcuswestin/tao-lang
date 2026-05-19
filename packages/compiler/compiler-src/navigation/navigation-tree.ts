import { AST } from '@parser/parser'
import { isViewLikeDeclaration, type TaoViewLikeDeclaration } from '../design/variant-resolution'

export type TaoNavigationDestinationKind = 'stack' | 'tab'

export type TaoNavigationTarget = TaoViewLikeDeclaration | AST.NavigatorDeclaration

export type TaoNavigationDestination = {
  readonly node: AST.StackDestination | AST.TabDestination
  readonly kind: TaoNavigationDestinationKind
  readonly name: string
  readonly targetName: string
  readonly target?: TaoNavigationTarget
  readonly parentNavigator: AST.NavigatorDeclaration
  readonly params: readonly AST.NavigationParamDeclaration[]
  readonly path?: AST.NavigationPathOption
}

export type TaoNavigationTreeIssue = {
  readonly node: AST.Node
  readonly message: string
}

export type TaoNavigationTree = {
  readonly appNavigation: AST.AppNavigationStatement
  readonly root?: AST.NavigatorDeclaration
  readonly destinations: readonly TaoNavigationDestination[]
  readonly destinationsByName: ReadonlyMap<string, readonly TaoNavigationDestination[]>
  readonly issues: readonly TaoNavigationTreeIssue[]
}

/** buildTaoNavigationTree resolves and traverses the app-level Tao navigator. */
export function buildTaoNavigationTree(appNavigation: AST.AppNavigationStatement): TaoNavigationTree {
  const destinations: TaoNavigationDestination[] = []
  const destinationsByName = new Map<string, TaoNavigationDestination[]>()
  const issues: TaoNavigationTreeIssue[] = []
  const root = appNavigation.navigation.ref

  if (!AST.isNavigatorDeclaration(root)) {
    if (root !== undefined) {
      issues.push({
        node: appNavigation,
        message: 'App navigation must reference a navigator declaration.',
      })
    }
    return { appNavigation, destinations, destinationsByName, issues }
  }

  collectNavigator(root, [], destinations, destinationsByName, issues)
  return { appNavigation, root, destinations, destinationsByName, issues }
}

/** navigationDestinationParams returns a destination's declared navigation params. */
export function navigationDestinationParams(
  destination: AST.StackDestination | AST.TabDestination,
): readonly AST.NavigationParamDeclaration[] {
  return destination.options?.options.filter(AST.isNavigationParamDeclaration) ?? []
}

/** navigationDestinationPath returns a destination's optional path statement. */
export function navigationDestinationPath(
  destination: AST.StackDestination | AST.TabDestination,
): AST.NavigationPathOption | undefined {
  return destination.options?.options.find(AST.isNavigationPathOption)
}

/** navigationDestinationIcons returns a destination's icon option statements. */
export function navigationDestinationIcons(
  destination: AST.StackDestination | AST.TabDestination,
): readonly AST.NavigationIconOption[] {
  return destination.options?.options.filter(AST.isNavigationIconOption) ?? []
}

function collectNavigator(
  navigator: AST.NavigatorDeclaration,
  stack: readonly AST.NavigatorDeclaration[],
  destinations: TaoNavigationDestination[],
  destinationsByName: Map<string, TaoNavigationDestination[]>,
  issues: TaoNavigationTreeIssue[],
): void {
  if (stack.includes(navigator)) {
    issues.push({
      node: navigator,
      message: `Navigator '${navigator.name}' cannot target itself through a navigation cycle.`,
    })
    return
  }

  const nextStack = [...stack, navigator]
  const body = navigator.body
  const bodyDestinations = AST.isStackNavigator(body)
    ? body.destinations.map(node => ({ node, kind: 'stack' as const }))
    : body.destinations.map(node => ({ node, kind: 'tab' as const }))

  for (const { node, kind } of bodyDestinations) {
    const targetName = node.target ?? node.name
    const target = findNavigationTarget(node, targetName)
    const destination: TaoNavigationDestination = {
      node,
      kind,
      name: node.name,
      targetName,
      target: isNavigationTarget(target) ? target : undefined,
      parentNavigator: navigator,
      params: navigationDestinationParams(node),
      path: navigationDestinationPath(node),
    }
    destinations.push(destination)
    const byName = destinationsByName.get(node.name) ?? []
    byName.push(destination)
    destinationsByName.set(node.name, byName)

    if (target === undefined) {
      issues.push({
        node,
        message: `Navigation destination '${node.name}' targets missing declaration '${targetName}'.`,
      })
      continue
    }
    if (!isNavigationTarget(target)) {
      issues.push({
        node,
        message:
          `Navigation destination '${node.name}' must target a ui, frame, layout, variant, or navigator declaration.`,
      })
      continue
    }
    if (AST.isNavigatorDeclaration(target)) {
      collectNavigator(target, nextStack, destinations, destinationsByName, issues)
    }
  }
}

function findNavigationTarget(anchor: AST.Node, name: string): AST.Declaration | undefined {
  const root = AST.Utils.findRootNode(anchor)
  if (!AST.isTaoFile(root)) {
    return undefined
  }
  for (const statement of root.statements) {
    const declaration = AST.isModuleDeclaration(statement)
      ? statement.declaration
      : AST.isDeclaration(statement)
      ? statement
      : undefined
    if (declaration?.name === name) {
      return declaration
    }
  }
  return undefined
}

function isNavigationTarget(node: AST.Node | undefined): node is TaoNavigationTarget {
  return isViewLikeDeclaration(node) || AST.isNavigatorDeclaration(node)
}
