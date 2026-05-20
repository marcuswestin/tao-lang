import {
  createContext,
  createElement,
  type ReactNode,
} from 'react'

let safeAreaInsets = { bottom: 0, left: 0, right: 0, top: 0 }
const safeAreaFrame = { height: 0, width: 0, x: 0, y: 0 }

export const SafeAreaInsetsContext = createContext(safeAreaInsets)
export const SafeAreaFrameContext = createContext(safeAreaFrame)

/** SafeAreaProvider renders children directly in Expo runtime Jest tests. */
export function SafeAreaProvider(props: { children?: ReactNode }) {
  return createElement(
    SafeAreaFrameContext.Provider,
    { value: safeAreaFrame },
    createElement(SafeAreaInsetsContext.Provider, { value: safeAreaInsets }, props.children),
  )
}

export const initialWindowMetrics = null

export function useSafeAreaInsets() {
  return safeAreaInsets
}

/** setSafeAreaInsetsForTests sets mocked safe-area insets for runtime tests. */
export function setSafeAreaInsetsForTests(insets: typeof safeAreaInsets) {
  safeAreaInsets = insets
}
