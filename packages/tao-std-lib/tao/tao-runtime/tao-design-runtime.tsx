import React from 'react'
import * as RN from 'react-native'

export type TaoDesignScreenSize = 'compact' | 'regular'
export type TaoDesignColorScheme = 'light' | 'dark'
export type TaoDesignState = 'default' | 'pressed' | 'disabled' | 'focused' | 'selected'

export const TAO_BASELINE_ACCENT_NAMES = ['blue', 'teal', 'green', 'amber', 'rose', 'indigo'] as const
export type TaoBaselineAccentName = (typeof TAO_BASELINE_ACCENT_NAMES)[number]

export type TaoDesignContextValue = {
  accentName: TaoBaselineAccentName
  colorScheme: TaoDesignColorScheme
  platform: string
  textScale: number
  screenSize: TaoDesignScreenSize
  reducedMotion: boolean
}

type TaoDesignStyle = Record<string, unknown>

type TaoDesignStyleSpec = {
  base?: TaoDesignStyle
  adaptations?: {
    platform?: Record<string, TaoDesignStyle>
    colorScheme?: Partial<Record<TaoDesignColorScheme, TaoDesignStyle>>
    screenSize?: Partial<Record<TaoDesignScreenSize, TaoDesignStyle>>
    textScale?: Record<string, TaoDesignStyle>
    reducedMotion?: Record<string, TaoDesignStyle>
  }
  states?: Partial<Record<TaoDesignState, TaoDesignStyle>>
}

export type TaoDesignInput = {
  styles: Record<string, TaoDesignStyleSpec>
}

const COMPACT_SCREEN_MAX_WIDTH = 600
const LARGE_TEXT_SCALE_MIN = 1.2

const defaultDesignContext: TaoDesignContextValue = {
  accentName: 'blue',
  colorScheme: 'light',
  platform: RN.Platform.OS,
  reducedMotion: false,
  screenSize: 'compact',
  textScale: 1,
}

const TaoDesignContext = React.createContext<TaoDesignContextValue>(defaultDesignContext)

/** useTaoDesignContext reads the current runtime Tao design context value. */
export function useTaoDesignContext(): TaoDesignContextValue {
  return React.useContext(TaoDesignContext)
}

/** createTaoDesign creates React Native style resolver helpers from accepted Tao design data. */
export function createTaoDesign(input: TaoDesignInput) {
  const baseStyles = RN.StyleSheet.create(
    Object.fromEntries(
      Object.entries(input.styles).map(([name, spec]) => [name, spec.base ?? {}]),
    ),
  )

  const resolveStyle = (
    name: string,
    context: TaoDesignContextValue,
    state: TaoDesignState = 'default',
  ): RN.StyleProp<RN.ViewStyle | RN.TextStyle | RN.ImageStyle> => {
    const spec = input.styles[name]
    if (spec === undefined) {
      return {}
    }
    const overlays = [
      spec.adaptations?.platform?.[context.platform],
      spec.adaptations?.colorScheme?.[context.colorScheme],
      spec.adaptations?.screenSize?.[context.screenSize],
      textScaleOverlay(spec, context.textScale),
      context.reducedMotion ? spec.adaptations?.reducedMotion?.['reduce'] : undefined,
      state === 'default' ? undefined : spec.states?.[state],
    ].filter((style): style is TaoDesignStyle => style !== undefined)
    return [baseStyles[name], ...overlays]
  }

  const useTaoStyle = (name: string, state?: TaoDesignState) => {
    const context = useTaoDesignContext()
    return resolveStyle(name, context, state)
  }

  const TaoDesignProvider = (props: { children?: React.ReactNode; value?: Partial<TaoDesignContextValue> }) => {
    const colorScheme = RN.useColorScheme?.() ?? RN.Appearance.getColorScheme()
    const window = RN.useWindowDimensions?.() ?? RN.Dimensions.get('window')
    const reducedMotion = useReducedMotion()
    const textScale = window.fontScale ?? RN.PixelRatio.getFontScale()
    const measured = React.useMemo<TaoDesignContextValue>(() => ({
      accentName: 'blue',
      colorScheme: colorScheme === 'dark' ? 'dark' : 'light',
      platform: RN.Platform.OS,
      reducedMotion,
      screenSize: window.width < COMPACT_SCREEN_MAX_WIDTH ? 'compact' : 'regular',
      textScale,
      ...props.value,
    }), [colorScheme, props.value, reducedMotion, textScale, window.width])
    return React.createElement(TaoDesignContext.Provider, { value: measured }, props.children)
  }

  return {
    TaoDesignProvider,
    resolveStyle,
    useTaoDesignContext,
    useTaoStyle,
  }
}

function textScaleOverlay(spec: TaoDesignStyleSpec, scale: number): TaoDesignStyle | undefined {
  if (scale >= LARGE_TEXT_SCALE_MIN) {
    return spec.adaptations?.textScale?.['large']
  }
  return undefined
}

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = React.useState(false)
  React.useEffect(() => {
    let isMounted = true
    RN.AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (isMounted) {
          setReducedMotion(value)
        }
      })
      .catch(() => undefined)
    const subscription = RN.AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion)
    return () => {
      isMounted = false
      subscription.remove()
    }
  }, [])
  return reducedMotion
}
