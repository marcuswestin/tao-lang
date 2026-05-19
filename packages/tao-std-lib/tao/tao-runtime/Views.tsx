import React from 'react'
import * as RN from 'react-native'

import type { TaoResolvedLayoutStyle } from './Layout'

type TaoLayoutProp = {
  _taoLayout?: TaoResolvedLayoutStyle
  _taoDesignStyle?: TaoDesignStyleProp
}

type TaoDesignStyle = RN.StyleProp<RN.ViewStyle | RN.TextStyle | RN.ImageStyle>
type TaoDesignStyleProp = TaoDesignStyle | ((state: TaoDesignStateName) => TaoDesignStyle)
type TaoDesignStateName = 'default' | 'pressed' | 'disabled' | 'focused' | 'selected'

type TaoTextProps = RN.TextProps & TaoLayoutProp
type TaoMultiLineTextProps = TaoTextProps & {
  lines?: number
}
type TaoTextInputProps = RN.TextInputProps & TaoLayoutProp
type TaoButtonProps = Omit<RN.PressableProps, 'children' | 'style'> & TaoLayoutProp & {
  color?: string
  style?: RN.StyleProp<RN.ViewStyle>
  title: string
}

const buttonBaseStyles = RN.StyleSheet.create({
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
})

export const Views = {
  Text: TextView('Text', { numberOfLines: 1, ellipsizeMode: 'tail' }),
  TextLabel: TextView('TextLabel', { numberOfLines: 1, ellipsizeMode: 'clip' }),
  MultiLineText: MultiLineTextView('MultiLineText'),
  TextInput: TextInputView('TextInput'),
  Number: TextView('Number', { numberOfLines: 1, ellipsizeMode: 'tail' }),

  Box: FlexView('Box', RN.View, { flexDirection: 'row' }),
  Stack: FlexView('Stack', RN.View, { flexDirection: 'column' }),
  Col: FlexView('Col', RN.View, { flexDirection: 'column' }),
  Row: FlexView('Row', RN.View, { flexDirection: 'row' }),
  WrappingRow: FlexView('WrappingRow', RN.View, { flexDirection: 'row', flexWrap: 'wrap' }),

  Button: ButtonView('Button', {}),
}

function View<P extends { style?: RN.StyleProp<any> }>(
  viewDisplayName: string,
  Component: React.ComponentType<P>,
  baseStyles: RN.StyleProp<any>,
) {
  const Wrapped = (props: P & TaoLayoutProp) => {
    const { _taoDesignStyle, _taoLayout, style, ...componentProps } = props
    return React.createElement(Component, {
      ...componentProps,
      style: [baseStyles, _taoLayout, taoDesignStyleForState(_taoDesignStyle, 'default'), style],
    } as P)
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function TextView(
  viewDisplayName: string,
  taoTextProps: Pick<RN.TextProps, 'ellipsizeMode' | 'numberOfLines'>,
) {
  const Wrapped = (props: TaoTextProps) => {
    const { _taoDesignStyle, _taoLayout, style, ...textProps } = props
    return React.createElement(RN.Text, {
      ...textProps,
      ...taoTextProps,
      style: [_taoLayout, taoDesignTextStyleForState(_taoDesignStyle, 'default'), style],
    })
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function MultiLineTextView(viewDisplayName: string) {
  const Wrapped = (props: TaoMultiLineTextProps) => {
    const { _taoDesignStyle, _taoLayout, style, lines, ...textProps } = props
    const designStyle = taoDesignTextStyleForState(_taoDesignStyle, 'default')
    const lineLimitProps = lines === undefined
      ? {}
      : { numberOfLines: lines, ellipsizeMode: 'tail' as const }
    return React.createElement(RN.Text, {
      ...textProps,
      ...lineLimitProps,
      style: [_taoLayout, designStyle, style],
    })
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function TextInputView(viewDisplayName: string) {
  const Wrapped = (props: TaoTextInputProps) => {
    const { _taoDesignStyle, _taoLayout, style, ...textInputProps } = props
    return React.createElement(RN.TextInput, {
      ...textInputProps,
      placeholderTextColor: textInputProps.placeholderTextColor ?? '#94a3b8',
      style: [_taoLayout, taoDesignTextStyleForState(_taoDesignStyle, 'default'), style],
    })
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function ButtonView(
  viewDisplayName: string,
  baseStyles: RN.ViewStyle,
) {
  const Wrapped = (props: TaoButtonProps) => {
    const {
      _taoDesignStyle,
      _taoLayout,
      accessibilityLabel,
      color,
      disabled,
      onPress,
      onPressIn,
      onPressOut,
      style,
      title,
      ...buttonProps
    } = props
    const hasStatefulDesignStyle = typeof _taoDesignStyle === 'function'
    const [pressed, setPressed] = React.useState(false)
    const designState = buttonDesignState(disabled, pressed)
    const designStyle = taoDesignStyleForState(_taoDesignStyle, designState)
    const designViewStyle = taoDesignViewStyleForState(_taoDesignStyle, designState)
    const designTextStyle = buttonTextStyle([designStyle, style])
    const labelTextStyle = color === undefined ? designTextStyle : { ...designTextStyle, color }
    return React.createElement(
      RN.Pressable,
      {
        ...buttonProps,
        accessibilityLabel: accessibilityLabel ?? title,
        accessibilityRole: 'button',
        disabled,
        onPress,
        onPressIn: event => {
          setPressed(true)
          onPressIn?.(event)
        },
        onPressOut: event => {
          setPressed(false)
          onPressOut?.(event)
        },
        style: [
          baseStyles,
          _taoLayout,
          designViewStyle,
          style,
          !hasStatefulDesignStyle && disabled ? { opacity: 0.45 } : undefined,
          !hasStatefulDesignStyle && pressed ? { opacity: 0.82 } : undefined,
        ],
      },
      React.createElement(
        RN.Text,
        { style: [buttonBaseStyles.text, labelTextStyle] },
        title,
      ),
    )
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function buttonTextStyle(style: RN.StyleProp<any>): RN.TextStyle {
  const flat = RN.StyleSheet.flatten(style) ?? {}
  const textStyle: RN.TextStyle = {}
  copyTextStyleProp(textStyle, flat, 'color')
  copyTextStyleProp(textStyle, flat, 'fontSize')
  copyTextStyleProp(textStyle, flat, 'fontWeight')
  copyTextStyleProp(textStyle, flat, 'letterSpacing')
  copyTextStyleProp(textStyle, flat, 'lineHeight')
  return textStyle
}

function copyTextStyleProp(target: RN.TextStyle, source: Record<string, unknown>, key: keyof RN.TextStyle): void {
  if (source[key] !== undefined) {
    target[key] = source[key] as never
  }
}

function taoDesignStyleForState(
  style: TaoDesignStyleProp | undefined,
  state: TaoDesignStateName,
): TaoDesignStyle | undefined {
  return typeof style === 'function' ? style(state) : style
}

function taoDesignTextStyleForState(
  style: TaoDesignStyleProp | undefined,
  state: TaoDesignStateName,
): RN.StyleProp<RN.TextStyle> | undefined {
  return taoDesignStyleForState(style, state) as RN.StyleProp<RN.TextStyle> | undefined
}

function taoDesignViewStyleForState(
  style: TaoDesignStyleProp | undefined,
  state: TaoDesignStateName,
): RN.StyleProp<RN.ViewStyle> | undefined {
  return taoDesignStyleForState(style, state) as RN.StyleProp<RN.ViewStyle> | undefined
}

function buttonDesignState(disabled: boolean | null | undefined, pressed: boolean): TaoDesignStateName {
  if (disabled === true) {
    return 'disabled'
  }
  return pressed ? 'pressed' : 'default'
}

function FlexView<P extends RN.ViewProps>(
  viewDisplayName: string,
  RNViewComponent: React.ComponentType<P>,
  baseStyles: RN.ViewStyle,
) {
  return View(viewDisplayName, RNViewComponent, baseStyles)
}
