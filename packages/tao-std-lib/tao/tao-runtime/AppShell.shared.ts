import type React from 'react'
import type * as RN from 'react-native'

export type TaoAppShellKind = 'navigation' | 'ui'

export type TaoAppShellInsets = {
  readonly bottom: number
  readonly left: number
  readonly right: number
  readonly top: number
}

export interface TaoAppShellProps {
  readonly backgroundColor: RN.ColorValue
  readonly children: React.ReactNode
  readonly contentStyle?: RN.StyleProp<RN.ViewStyle>
  readonly kind: TaoAppShellKind
  readonly onRuntimeReady?: () => void
}

/** taoAppShellSafeAreaContentStyle adds device safe-area insets onto resolved shell content padding. */
export function taoAppShellSafeAreaContentStyle(
  style: RN.StyleProp<RN.ViewStyle> | undefined,
  insets: TaoAppShellInsets,
  styleSheet: Pick<typeof RN.StyleSheet, 'flatten'>,
): RN.ViewStyle {
  const flat = styleSheet.flatten(style) ?? {}
  return {
    paddingBottom: basePadding(flat.paddingBottom, flat.paddingVertical, flat.padding) + insets.bottom,
    paddingLeft: basePadding(flat.paddingLeft, flat.paddingHorizontal, flat.padding) + insets.left,
    paddingRight: basePadding(flat.paddingRight, flat.paddingHorizontal, flat.padding) + insets.right,
    paddingTop: basePadding(flat.paddingTop, flat.paddingVertical, flat.padding) + insets.top,
  }
}

/** taoAppShellKeyboardBottomOffset returns the shell spacing that should remain between a focused input and keyboard. */
export function taoAppShellKeyboardBottomOffset(
  style: RN.StyleProp<RN.ViewStyle> | undefined,
  insets: TaoAppShellInsets,
  styleSheet: Pick<typeof RN.StyleSheet, 'flatten'>,
): number {
  const flat = styleSheet.flatten(style) ?? {}
  return basePadding(flat.paddingBottom, flat.paddingVertical, flat.padding) + insets.bottom
}

function basePadding(...values: unknown[]): number {
  for (const value of values) {
    const n = numericStyleValue(value)
    if (n !== undefined) {
      return n
    }
  }
  return 0
}

function numericStyleValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}
