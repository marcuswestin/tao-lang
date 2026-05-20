import React from 'react'
import * as RN from 'react-native'

import type { TaoAppShellProps } from './AppShell.shared'

const styles = RN.StyleSheet.create({
  root: {
    flex: 1,
  },
})

/** TaoAppShell renders the platform-neutral fallback app shell. */
export function TaoAppShell(props: TaoAppShellProps) {
  const rootStyle: RN.StyleProp<RN.ViewStyle> = [styles.root, { backgroundColor: props.backgroundColor }]
  if (props.kind === 'navigation') {
    return React.createElement(RN.View, { style: rootStyle }, props.children)
  }
  return React.createElement(
    RN.ScrollView,
    {
      contentContainerStyle: props.contentStyle,
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
