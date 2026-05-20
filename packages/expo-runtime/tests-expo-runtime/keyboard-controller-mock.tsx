import {
  createElement,
  Fragment,
  type ReactNode,
} from 'react'
import * as RN from 'react-native'

/** KeyboardProvider renders children directly in Expo runtime Jest tests. */
export function KeyboardProvider(props: { children?: ReactNode }) {
  return createElement(Fragment, null, props.children)
}

/** KeyboardAwareScrollView lowers to React Native ScrollView in Expo runtime Jest tests. */
export function KeyboardAwareScrollView(props: RN.ScrollViewProps) {
  return createElement(RN.ScrollView, props, props.children)
}

/** KeyboardToolbar is intentionally absent from Tao's default shell tests. */
export function KeyboardToolbar() {
  return null
}
