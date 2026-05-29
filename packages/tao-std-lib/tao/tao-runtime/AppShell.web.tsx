import React from 'react'
import * as RN from 'react-native'
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'

import {
  type TaoAppShellProps,
  taoAppShellSafeAreaContentStyle,
  type TaoNavigationScreenShellProps,
} from './AppShell.shared'

const styles = RN.StyleSheet.create({
  root: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
  },
})

/** TaoAppShell renders the web app shell with safe-area context and no native-only keyboard imports. */
export function TaoAppShell(props: TaoAppShellProps) {
  return React.createElement(
    SafeAreaProvider,
    null,
    React.createElement(TaoWebAppShellContent, props),
  )
}

/** TaoNavigationScreenShell gives generated navigation screens the same scroll host on web. */
export function TaoNavigationScreenShell(props: TaoNavigationScreenShellProps) {
  return React.createElement(
    RN.ScrollView,
    {
      contentContainerStyle: styles.screenContent,
      keyboardDismissMode: 'interactive',
      keyboardShouldPersistTaps: 'handled',
      style: styles.root,
    },
    props.children,
  )
}

function TaoWebAppShellContent(props: TaoAppShellProps) {
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
