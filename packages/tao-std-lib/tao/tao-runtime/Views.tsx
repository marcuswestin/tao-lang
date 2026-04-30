import React from 'react'
import * as RN from 'react-native'

export const Views = {
  Text: View<RN.TextProps>('Text', RN.Text, [{ color: 'white', padding: 10 } as RN.TextStyle]),

  Box: FlexView('Box', RN.View, {}),
  Col: FlexView('Col', RN.View, { flexDirection: 'column' }),
  Row: FlexView('Row', RN.View, { flexDirection: 'row' }),

  Button: FlexView('Button', RN.Button, {}),
}

function View<P extends { style?: RN.StyleProp<any> }>(
  viewDisplayName: string,
  Component: React.ComponentType<P>,
  baseStyles: RN.StyleProp<any>,
) {
  const Wrapped = (props: P) =>
    React.createElement(Component, {
      ...props,
      style: [baseStyles, props.style],
    })

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
