import React from 'react'
import * as RN from 'react-native'

import type { TaoResolvedLayoutStyle } from './Layout'

type TaoLayoutProp = {
  _taoLayout?: TaoResolvedLayoutStyle
}

export const Views = {
  Text: View<RN.TextProps>('Text', RN.Text, [{ color: 'white', padding: 10 } as RN.TextStyle]),

  Box: FlexView('Box', RN.View, {}),
  Col: FlexView('Col', RN.View, { flexDirection: 'column' }),
  Row: FlexView('Row', RN.View, { flexDirection: 'row' }),

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
