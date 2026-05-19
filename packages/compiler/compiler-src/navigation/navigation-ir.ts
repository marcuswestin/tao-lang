import { AST } from '@parser/parser'
import { designStyleKeyForNode, type TaoDesignCodegenContext } from '../design/design-codegen'
import { stringTemplateTextOnlyLiteral } from '../design/design-strings'
import { isViewLikeDeclaration, resolveVariantTargetView } from '../design/variant-resolution'
import {
  buildTaoNavigationTree,
  navigationDestinationIcons,
  type TaoNavigationDestination,
} from './navigation-tree'

export type TaoNavigationIR = {
  readonly root: TaoNavigationNavigatorIR
}

export type TaoNavigationNavigatorIR = {
  readonly name: string
  readonly kind: 'stack' | 'tabs'
  readonly destinations: readonly TaoNavigationDestinationIR[]
}

export type TaoNavigationDestinationIR = {
  readonly name: string
  readonly kind: 'stack' | 'tab'
  readonly parentNavigatorName: string
  readonly targetName: string
  readonly title?: string
  readonly path?: string
  readonly icon?: TaoNavigationIconIR
  readonly params: readonly TaoNavigationParamIR[]
  readonly target: TaoNavigationTargetIR
}

export type TaoNavigationTargetIR =
  | {
    readonly kind: 'view'
    readonly componentName: string
    readonly designStyleKey?: string
    readonly designStyleStateful: boolean
  }
  | {
    readonly kind: 'navigator'
    readonly navigator: TaoNavigationNavigatorIR
  }

export type TaoNavigationIconIR = {
  readonly source: string
  readonly name: string
}

export type TaoNavigationParamIR = {
  readonly name: string
  readonly type: AST.NavigationParamType
}

/** buildTaoNavigationIR lowers the validated navigation tree into a serializable codegen model. */
export function buildTaoNavigationIR(
  appNavigation: AST.AppNavigationStatement,
  design?: TaoDesignCodegenContext,
): TaoNavigationIR | undefined {
  const tree = buildTaoNavigationTree(appNavigation)
  if (tree.root === undefined || tree.issues.length > 0) {
    return undefined
  }
  const destinationsByNavigator = new Map<AST.NavigatorDeclaration, TaoNavigationDestination[]>()
  for (const destination of tree.destinations) {
    const destinations = destinationsByNavigator.get(destination.parentNavigator) ?? []
    destinations.push(destination)
    destinationsByNavigator.set(destination.parentNavigator, destinations)
  }
  return {
    root: buildNavigatorIR(tree.root, destinationsByNavigator, [], design),
  }
}

function buildNavigatorIR(
  navigator: AST.NavigatorDeclaration,
  destinationsByNavigator: ReadonlyMap<AST.NavigatorDeclaration, readonly TaoNavigationDestination[]>,
  stack: readonly AST.NavigatorDeclaration[],
  design: TaoDesignCodegenContext | undefined,
): TaoNavigationNavigatorIR {
  const nextStack = [...stack, navigator]
  return {
    name: navigator.name,
    kind: AST.isStackNavigator(navigator.body) ? 'stack' : 'tabs',
    destinations: (destinationsByNavigator.get(navigator) ?? []).map(destination =>
      buildDestinationIR(destination, destinationsByNavigator, nextStack, design)
    ),
  }
}

function buildDestinationIR(
  destination: TaoNavigationDestination,
  destinationsByNavigator: ReadonlyMap<AST.NavigatorDeclaration, readonly TaoNavigationDestination[]>,
  stack: readonly AST.NavigatorDeclaration[],
  design: TaoDesignCodegenContext | undefined,
): TaoNavigationDestinationIR {
  const target = destination.target
  return {
    icon: navigationIconIR(destination),
    kind: destination.kind === 'stack' ? 'stack' : 'tab',
    name: destination.name,
    parentNavigatorName: destination.parentNavigator.name,
    params: destination.params.map(param => ({ name: param.name, type: param.type })),
    path: stringTemplateTextOnlyLiteral(destination.path?.value),
    target: AST.isNavigatorDeclaration(target) && !stack.includes(target)
      ? { kind: 'navigator', navigator: buildNavigatorIR(target, destinationsByNavigator, stack, design) }
      : isViewLikeDeclaration(target)
      ? {
        componentName: target.name,
        designStyleKey: designStyleKeyForNode(design, target),
        designStyleStateful: resolveVariantTargetView(target)?.name === 'Button',
        kind: 'view',
      }
      : {
        componentName: destination.targetName,
        designStyleStateful: false,
        kind: 'view',
      },
    targetName: destination.targetName,
    title: navigationTitle(destination.node),
  }
}

function navigationTitle(destination: AST.StackDestination | AST.TabDestination): string | undefined {
  return stringTemplateTextOnlyLiteral(destination.options?.options.find(AST.isNavigationTitleOption)?.value)
}

function navigationIconIR(destination: TaoNavigationDestination): TaoNavigationIconIR | undefined {
  const icon = navigationDestinationIcons(destination.node)[0]
  return icon === undefined ? undefined : { source: icon.source, name: icon.name }
}
