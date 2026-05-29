import {
  type ComponentType,
  createElement,
  forwardRef,
  Fragment,
  type ReactElement,
  type ReactNode,
} from 'react'

type HeadlessNavigationScreenProps = {
  navigation: Record<string, unknown>
  route: { params: Record<string, unknown> }
}

type NavigationScreen = ComponentType<HeadlessNavigationScreenProps> | TaoNavigationConfig

type NavigationScreenEntry = NavigationScreen | {
  screen: NavigationScreen
}

type TaoNavigationConfig = {
  screens: Record<string, NavigationScreenEntry>
}

const headlessNavigation = {
  dispatch: () => undefined,
  goBack: () => undefined,
  navigate: () => undefined,
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNavigationConfig(value: unknown): value is TaoNavigationConfig {
  return isObject(value) && isObject(value['screens'])
}

function getScreenTarget(entry: NavigationScreenEntry): NavigationScreen {
  if (isObject(entry) && 'screen' in entry) {
    return entry.screen as NavigationScreen
  }
  return entry
}

function renderNavigationTarget(target: NavigationScreen): ReactElement | null {
  if (isNavigationConfig(target)) {
    return renderNavigatorRoot(target)
  }
  return createElement(target, {
    navigation: headlessNavigation,
    route: { params: {} },
  })
}

function renderNavigatorRoot(config: TaoNavigationConfig): ReactElement | null {
  const firstScreen = Object.values(config.screens)[0]
  if (!firstScreen) {
    return null
  }
  return renderNavigationTarget(getScreenTarget(firstScreen))
}

/** createBottomTabNavigator returns the static config shape used by generated Tao navigation roots in headless tests. */
export function createBottomTabNavigator(config: TaoNavigationConfig): TaoNavigationConfig {
  return config
}

/** createNativeStackNavigator returns the static config shape used by generated Tao navigation roots in headless tests. */
export function createNativeStackNavigator(config: TaoNavigationConfig): TaoNavigationConfig {
  return config
}

/** createNavigationContainerRef builds the minimal navigation ref contract used by Tao navigation actions in headless tests. */
export function createNavigationContainerRef() {
  return {
    current: null,
    dispatch: () => undefined,
    isReady: () => true,
  }
}

/** createStaticNavigation renders the first destination in a generated static navigation tree for headless scenario assertions. */
export function createStaticNavigation(config: TaoNavigationConfig) {
  return forwardRef(function HeadlessStaticNavigation() {
    return renderNavigatorRoot(config)
  })
}

export const StackActions = {
  pop: (count?: number) => ({ payload: { count }, type: 'POP' }),
  push: (name: string, params?: Record<string, unknown>) => ({ payload: { name, params }, type: 'PUSH' }),
}

export const TabActions = {
  jumpTo: (name: string, params?: Record<string, unknown>) => ({ payload: { name, params }, type: 'JUMP_TO' }),
}

/** SafeAreaProvider is a pass-through wrapper for generated navigation bootstraps in headless tests. */
export function SafeAreaProvider(props: { children?: ReactNode }) {
  return createElement(Fragment, null, props.children)
}

export const initialWindowMetrics = null

export function useSafeAreaInsets() {
  return { bottom: 0, left: 0, right: 0, top: 0 }
}

/** Ionicons is a no-op icon component for headless navigation tests. */
export default function Ionicons() {
  return null
}
