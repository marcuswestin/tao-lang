import React from 'react'
import * as RN from 'react-native'
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'

import {
  type TaoAppShellProps,
  taoAppShellSafeAreaContentStyle,
} from './AppShell.shared'

const styles = RN.StyleSheet.create({
  root: {
    flex: 1,
  },
})

/** TaoAppShell renders the native app shell with safe-area context at the app root. */
export function TaoAppShell(props: TaoAppShellProps) {
  return React.createElement(
    SafeAreaProvider,
    null,
    React.createElement(TaoNativeAppShellContent, props),
  )
}

function TaoNativeAppShellContent(props: TaoAppShellProps) {
  const insets = useSafeAreaInsets()
  const rootStyle: RN.StyleProp<RN.ViewStyle> = [styles.root, { backgroundColor: props.backgroundColor }]
  if (props.kind === 'navigation') {
    return React.createElement(RN.View, { style: rootStyle }, props.children)
  }
  return React.createElement(
    RN.ScrollView,
    {
      contentContainerStyle: [
        props.contentStyle,
        taoAppShellSafeAreaContentStyle(props.contentStyle, insets, RN.StyleSheet),
      ],
      keyboardDismissMode: 'interactive',
      keyboardShouldPersistTaps: 'handled',
      style: rootStyle,
    },
    props.children,
  )
}

export type {
  TaoAppShellInsets,
  TaoAppShellKind,
  TaoAppShellProps,
} from './AppShell.shared'
