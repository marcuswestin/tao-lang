import React from 'react'
import * as RN from 'react-native'

import type { TaoResolvedLayoutStyle } from './Layout'

type TaoLayoutProp = {
  _taoLayout?: TaoResolvedLayoutStyle
}

type TaoTextProps = RN.TextProps & TaoLayoutProp
type TaoMultiLineTextProps = TaoTextProps & {
  lines?: number
}

export const Views = {
  Text: TextView('Text', { numberOfLines: 1, ellipsizeMode: 'tail' }),
  TextLabel: TextView('TextLabel', { numberOfLines: 1, ellipsizeMode: 'clip' }),
  MultiLineText: MultiLineTextView('MultiLineText'),
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
    const { _taoLayout, style, ...componentProps } = props
    return React.createElement(Component, {
      ...componentProps,
      style: [baseStyles, _taoLayout, style],
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
    const { _taoLayout, style, ...textProps } = props
    return React.createElement(RN.Text, {
      ...textProps,
      ...taoTextProps,
      style: [_taoLayout, style],
    })
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function MultiLineTextView(viewDisplayName: string) {
  const Wrapped = (props: TaoMultiLineTextProps) => {
    const { _taoLayout, style, lines, ...textProps } = props
    const lineLimitProps = lines === undefined
      ? {}
      : { numberOfLines: lines, ellipsizeMode: 'tail' as const }
    return React.createElement(RN.Text, {
      ...textProps,
      ...lineLimitProps,
      style: [_taoLayout, style],
    })
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function ButtonView(
  viewDisplayName: string,
  baseStyles: RN.ViewStyle,
) {
  const Wrapped = (props: RN.ButtonProps & TaoLayoutProp & { style?: RN.StyleProp<RN.ViewStyle> }) => {
    const { _taoLayout, style, ...buttonProps } = props
    return React.createElement(
      RN.View,
      { style: [baseStyles, _taoLayout, style] },
      React.createElement(RN.Button, buttonProps),
    )
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function FlexView<P extends RN.ViewProps>(
  viewDisplayName: string,
  RNViewComponent: React.ComponentType<P>,
  baseStyles: RN.ViewStyle,
) {
  return View(viewDisplayName, RNViewComponent, [baseStyles /* ,{ flex: 1 } */])
}
