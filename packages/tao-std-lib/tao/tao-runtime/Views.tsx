import React from 'react'
import * as RN from 'react-native'

import type { TaoResolvedLayoutStyle } from './Layout'
import {
  type TaoBaselineAccentName,
  type TaoDesignColorScheme,
  useTaoDesignContext,
} from './tao-design-runtime'

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

type TaoBaselinePalette = {
  appBackground: string
  surfaceBackground: string
  primaryText: string
  secondaryText: string
  mutedText: string
  border: string
  borderStrong: string
  inputBackground: string
  inputBorder: string
  accent: string
  accentPressed: string
  accentSubtle: string
  onAccentText: string
  placeholder: string
  disabledForeground: string
  disabledBackground: string
  focusRing: string
}

type TaoBaselineAccentValues = {
  accent: string
  accentPressed: string
  accentSubtle: string
  focusRing: string
  onAccentText: string
}

const TAO_BASELINE_NEUTRALS: Record<
  TaoDesignColorScheme,
  Omit<TaoBaselinePalette, keyof TaoBaselineAccentValues>
> = {
  light: {
    appBackground: '#f7f8fa',
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    disabledBackground: '#e2e8f0',
    disabledForeground: '#94a3b8',
    inputBackground: '#ffffff',
    inputBorder: '#cbd5e1',
    mutedText: '#64748b',
    placeholder: '#94a3b8',
    primaryText: '#0f172a',
    secondaryText: '#334155',
    surfaceBackground: '#ffffff',
  },
  dark: {
    appBackground: '#0f1115',
    border: '#1f2937',
    borderStrong: '#334155',
    disabledBackground: '#1f2937',
    disabledForeground: '#64748b',
    inputBackground: '#111827',
    inputBorder: '#334155',
    mutedText: '#94a3b8',
    placeholder: '#64748b',
    primaryText: '#f8fafc',
    secondaryText: '#cbd5e1',
    surfaceBackground: '#1c1f26',
  },
}

const TAO_BASELINE_ACCENTS: Record<
  TaoBaselineAccentName,
  Record<TaoDesignColorScheme, TaoBaselineAccentValues>
> = {
  blue: {
    light: {
      accent: '#2563eb',
      accentPressed: '#1d4ed8',
      accentSubtle: '#dbeafe',
      focusRing: '#2563eb',
      onAccentText: '#ffffff',
    },
    dark: {
      accent: '#60a5fa',
      accentPressed: '#3b82f6',
      accentSubtle: '#1e3a8a',
      focusRing: '#60a5fa',
      onAccentText: '#0b1220',
    },
  },
  teal: {
    light: {
      accent: '#0f766e',
      accentPressed: '#115e59',
      accentSubtle: '#ccfbf1',
      focusRing: '#0f766e',
      onAccentText: '#ffffff',
    },
    dark: {
      accent: '#2dd4bf',
      accentPressed: '#14b8a6',
      accentSubtle: '#134e4a',
      focusRing: '#2dd4bf',
      onAccentText: '#042f2e',
    },
  },
  green: {
    light: {
      accent: '#166534',
      accentPressed: '#14532d',
      accentSubtle: '#dcfce7',
      focusRing: '#166534',
      onAccentText: '#ffffff',
    },
    dark: {
      accent: '#4ade80',
      accentPressed: '#22c55e',
      accentSubtle: '#14532d',
      focusRing: '#4ade80',
      onAccentText: '#052e16',
    },
  },
  amber: {
    light: {
      accent: '#b45309',
      accentPressed: '#92400e',
      accentSubtle: '#fef3c7',
      focusRing: '#b45309',
      onAccentText: '#ffffff',
    },
    dark: {
      accent: '#fbbf24',
      accentPressed: '#f59e0b',
      accentSubtle: '#78350f',
      focusRing: '#fbbf24',
      onAccentText: '#1c1917',
    },
  },
  rose: {
    light: {
      accent: '#be123c',
      accentPressed: '#9f1239',
      accentSubtle: '#ffe4e6',
      focusRing: '#be123c',
      onAccentText: '#ffffff',
    },
    dark: {
      accent: '#fb7185',
      accentPressed: '#f43f5e',
      accentSubtle: '#881337',
      focusRing: '#fb7185',
      onAccentText: '#1c0a10',
    },
  },
  indigo: {
    light: {
      accent: '#4f46e5',
      accentPressed: '#4338ca',
      accentSubtle: '#e0e7ff',
      focusRing: '#4f46e5',
      onAccentText: '#ffffff',
    },
    dark: {
      accent: '#818cf8',
      accentPressed: '#6366f1',
      accentSubtle: '#312e81',
      focusRing: '#818cf8',
      onAccentText: '#0b0c20',
    },
  },
}

function buildBaselinePalette(
  scheme: TaoDesignColorScheme,
  accentName: TaoBaselineAccentName,
): TaoBaselinePalette {
  return {
    ...TAO_BASELINE_NEUTRALS[scheme],
    ...TAO_BASELINE_ACCENTS[accentName][scheme],
  }
}

const TAO_BASELINE_SPACING = {
  bodyFontSize: 16,
  bodyLineHeight: 24,
  borderWidth: 1,
  controlHeight: 48,
  controlPaddingHorizontal: 16,
  controlPaddingVertical: 12,
  controlRadius: 12,
  labelFontSize: 14,
  labelLineHeight: 20,
  smallFontSize: 13,
  surfaceRadius: 14,
}

const buttonBaseStyles = RN.StyleSheet.create({
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
})

export const Views = {
  Text: TextView('Text', { numberOfLines: 1, ellipsizeMode: 'tail' }, 'body'),
  TextLabel: TextView('TextLabel', { numberOfLines: 1, ellipsizeMode: 'clip' }, 'label'),
  MultiLineText: MultiLineTextView('MultiLineText'),
  TextInput: TextInputView('TextInput'),
  Number: TextView('Number', { numberOfLines: 1, ellipsizeMode: 'tail' }, 'number'),

  Box: FlexView('Box', RN.View, { flexDirection: 'row' }),
  Stack: FlexView('Stack', RN.View, { flexDirection: 'column' }),
  Col: FlexView('Col', RN.View, { flexDirection: 'column' }),
  Row: FlexView('Row', RN.View, { flexDirection: 'row' }),
  WrappingRow: FlexView('WrappingRow', RN.View, { flexDirection: 'row', flexWrap: 'wrap' }),

  Button: ButtonView('Button', {}),
}

/** taoBaselinePaletteFor returns the baseline palette for a color scheme and accent. */
export function taoBaselinePaletteFor(
  scheme: TaoDesignColorScheme,
  accentName: TaoBaselineAccentName = 'blue',
): TaoBaselinePalette {
  return buildBaselinePalette(scheme, accentName)
}

/** taoBaselineSpacing exposes the baseline spacing/sizing constants used by std-lib runtime views. */
export const taoBaselineSpacing = TAO_BASELINE_SPACING

function useTaoBaselinePalette(): TaoBaselinePalette {
  const context = useTaoDesignContext()
  return buildBaselinePalette(context.colorScheme, context.accentName)
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

type BaselineTextRole = 'body' | 'label' | 'number'

function TextView(
  viewDisplayName: string,
  taoTextProps: Pick<RN.TextProps, 'ellipsizeMode' | 'numberOfLines'>,
  role: BaselineTextRole,
) {
  const Wrapped = (props: TaoTextProps) => {
    const { _taoDesignStyle, _taoLayout, style, ...textProps } = props
    const palette = useTaoBaselinePalette()
    const baseline = baselineTextStyleFor(role, palette)
    return React.createElement(RN.Text, {
      ...textProps,
      ...taoTextProps,
      style: [baseline, _taoLayout, taoDesignTextStyleForState(_taoDesignStyle, 'default'), style],
    })
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function MultiLineTextView(viewDisplayName: string) {
  const Wrapped = (props: TaoMultiLineTextProps) => {
    const { _taoDesignStyle, _taoLayout, style, lines, ...textProps } = props
    const palette = useTaoBaselinePalette()
    const baseline = baselineTextStyleFor('body', palette)
    const designStyle = taoDesignTextStyleForState(_taoDesignStyle, 'default')
    const lineLimitProps = lines === undefined
      ? {}
      : { numberOfLines: lines, ellipsizeMode: 'tail' as const }
    return React.createElement(RN.Text, {
      ...textProps,
      ...lineLimitProps,
      style: [baseline, _taoLayout, designStyle, style],
    })
  }

  Wrapped.displayName = viewDisplayName
  return Wrapped
}

function TextInputView(viewDisplayName: string) {
  const Wrapped = (props: TaoTextInputProps) => {
    const { _taoDesignStyle, _taoLayout, editable, onBlur, onFocus, style, ...textInputProps } = props
    const palette = useTaoBaselinePalette()
    const [focused, setFocused] = React.useState(false)
    const disabled = editable === false
    const designState = textInputDesignState(disabled, focused)
    const baseline = baselineTextInputStyleFor(palette, designState)
    return React.createElement(RN.TextInput, {
      ...textInputProps,
      editable,
      onBlur: event => {
        setFocused(false)
        onBlur?.(event)
      },
      onFocus: event => {
        setFocused(true)
        onFocus?.(event)
      },
      placeholderTextColor: textInputProps.placeholderTextColor ?? palette.placeholder,
      style: [baseline, _taoLayout, taoDesignTextStyleForState(_taoDesignStyle, designState), style],
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
    const palette = useTaoBaselinePalette()
    const hasStatefulDesignStyle = typeof _taoDesignStyle === 'function'
    const [pressed, setPressed] = React.useState(false)
    const designState = buttonDesignState(disabled, pressed)
    const baselineView = baselineButtonViewStyleFor(palette, designState)
    const baselineText = baselineButtonTextStyleFor(palette, designState)
    const designStyle = taoDesignStyleForState(_taoDesignStyle, designState)
    const designViewStyle = taoDesignViewStyleForState(_taoDesignStyle, designState)
    const designTextStyle = buttonTextStyle([baselineText, designStyle, style])
    const labelTextStyle = color === undefined ? designTextStyle : { ...designTextStyle, color }
    return React.createElement(
      RN.Pressable,
      {
        ...buttonProps,
        accessibilityLabel: accessibilityLabel ?? title,
        accessibilityRole: 'button',
        accessibilityState: { disabled: disabled === true },
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
          baselineView,
          baseStyles,
          _taoLayout,
          designViewStyle,
          style,
          !hasStatefulDesignStyle && disabled !== true && pressed
            ? { backgroundColor: palette.accentPressed }
            : undefined,
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

function baselineTextStyleFor(role: BaselineTextRole, palette: TaoBaselinePalette): RN.TextStyle {
  if (role === 'label') {
    return {
      color: palette.secondaryText,
      fontSize: TAO_BASELINE_SPACING.labelFontSize,
      fontWeight: '600',
      letterSpacing: 0.1,
      lineHeight: TAO_BASELINE_SPACING.labelLineHeight,
    }
  }
  if (role === 'number') {
    return {
      color: palette.primaryText,
      fontSize: TAO_BASELINE_SPACING.bodyFontSize,
      fontVariant: ['tabular-nums'],
      lineHeight: TAO_BASELINE_SPACING.bodyLineHeight,
    }
  }
  return {
    color: palette.primaryText,
    fontSize: TAO_BASELINE_SPACING.bodyFontSize,
    lineHeight: TAO_BASELINE_SPACING.bodyLineHeight,
  }
}

function baselineTextInputStyleFor(
  palette: TaoBaselinePalette,
  state: TaoDesignStateName,
): RN.TextStyle {
  const focused = state === 'focused'
  const disabled = state === 'disabled'
  return {
    backgroundColor: disabled ? palette.disabledBackground : palette.inputBackground,
    borderColor: focused ? palette.focusRing : palette.inputBorder,
    borderRadius: TAO_BASELINE_SPACING.controlRadius,
    borderWidth: focused ? TAO_BASELINE_SPACING.borderWidth + 1 : TAO_BASELINE_SPACING.borderWidth,
    color: disabled ? palette.disabledForeground : palette.primaryText,
    fontSize: TAO_BASELINE_SPACING.bodyFontSize,
    lineHeight: TAO_BASELINE_SPACING.bodyLineHeight,
    minHeight: TAO_BASELINE_SPACING.controlHeight,
    paddingHorizontal: TAO_BASELINE_SPACING.controlPaddingHorizontal,
    paddingVertical: TAO_BASELINE_SPACING.controlPaddingVertical,
  }
}

function baselineButtonViewStyleFor(
  palette: TaoBaselinePalette,
  state: TaoDesignStateName,
): RN.ViewStyle {
  const disabled = state === 'disabled'
  return {
    alignItems: 'center',
    backgroundColor: disabled ? palette.disabledBackground : palette.accent,
    borderRadius: TAO_BASELINE_SPACING.controlRadius,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: TAO_BASELINE_SPACING.controlHeight,
    paddingHorizontal: TAO_BASELINE_SPACING.controlPaddingHorizontal,
    paddingVertical: TAO_BASELINE_SPACING.controlPaddingVertical,
  }
}

function baselineButtonTextStyleFor(
  palette: TaoBaselinePalette,
  state: TaoDesignStateName,
): RN.TextStyle {
  return {
    color: state === 'disabled' ? palette.disabledForeground : palette.onAccentText,
    fontSize: TAO_BASELINE_SPACING.bodyFontSize,
    lineHeight: TAO_BASELINE_SPACING.bodyLineHeight,
  }
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

function textInputDesignState(disabled: boolean, focused: boolean): TaoDesignStateName {
  if (disabled) {
    return 'disabled'
  }
  return focused ? 'focused' : 'default'
}

function FlexView<P extends RN.ViewProps>(
  viewDisplayName: string,
  RNViewComponent: React.ComponentType<P>,
  baseStyles: RN.ViewStyle,
) {
  return View(viewDisplayName, RNViewComponent, baseStyles)
}
