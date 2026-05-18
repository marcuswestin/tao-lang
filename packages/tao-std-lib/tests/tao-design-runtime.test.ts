import { describe, expect, mock, test } from 'bun:test'

let mockColorScheme: 'dark' | 'light' | null = 'light'
let mockFontScale = 1
let mockWidth = 320
let reduceMotionListener: ((value: boolean) => void) | undefined

mock.module('react', () => {
  const React = {
    createContext<T>(value: T) {
      return { Provider: 'Provider', value }
    },
    createElement(type: unknown, props: unknown, children?: unknown) {
      return { children, props, type }
    },
    useContext<T>(context: { value: T }) {
      return context.value
    },
    useEffect(effect: () => void | (() => void)) {
      effect()
    },
    useMemo<T>(factory: () => T) {
      return factory()
    },
    useState<T>(initial: T) {
      return [initial, () => undefined] as const
    },
  }
  return { ...React, default: React }
})

mock.module('react-native', () => ({
  AccessibilityInfo: {
    addEventListener(_event: string, listener: (value: boolean) => void) {
      reduceMotionListener = listener
      return {
        remove: () => {
          reduceMotionListener = undefined
        },
      }
    },
    isReduceMotionEnabled() {
      return Promise.resolve(false)
    },
  },
  Appearance: {
    getColorScheme() {
      return 'light'
    },
  },
  Dimensions: {
    get() {
      return { width: 320 }
    },
  },
  PixelRatio: {
    getFontScale() {
      return 1
    },
  },
  Platform: { OS: 'ios' },
  StyleSheet: {
    create<T extends Record<string, unknown>>(styles: T): T {
      return styles
    },
    flatten(style: unknown): Record<string, unknown> {
      return Array.isArray(style) ? Object.assign({}, ...style) : style as Record<string, unknown>
    },
  },
  useColorScheme() {
    return mockColorScheme
  },
  useWindowDimensions() {
    return { fontScale: mockFontScale, width: mockWidth }
  },
}))

describe('tao design runtime:', () => {
  test('resolveStyle applies overlays in V1 order', async () => {
    const { createTaoDesign } = await import('../tao/tao-runtime/tao-design-runtime')
    const { StyleSheet } = await import('react-native')
    const design = createTaoDesign({
      styles: {
        target: {
          base: { baseOnly: 1, color: 'base', order: 'base' },
          adaptations: {
            platform: { ios: { color: 'platform', order: 'platform', platformOnly: 1 } },
            colorScheme: { dark: { color: 'color-scheme', colorSchemeOnly: 1, order: 'color-scheme' } },
            screenSize: { regular: { color: 'screen-size', order: 'screen-size', screenSizeOnly: 1 } },
            textScale: { large: { color: 'text-scale', order: 'text-scale', textScaleOnly: 1 } },
            reducedMotion: { reduce: { color: 'reduced-motion', order: 'reduced-motion', reducedMotionOnly: 1 } },
          },
          states: {
            pressed: { color: 'state', order: 'state', stateOnly: 1 },
          },
        },
      },
    })

    const style = design.resolveStyle(
      'target',
      {
        colorScheme: 'dark',
        platform: 'ios',
        reducedMotion: true,
        screenSize: 'regular',
        textScale: 1.4,
      },
      'pressed',
    )

    expect(StyleSheet.flatten(style)).toMatchObject({
      baseOnly: 1,
      color: 'state',
      colorSchemeOnly: 1,
      order: 'state',
      platformOnly: 1,
      reducedMotionOnly: 1,
      screenSizeOnly: 1,
      stateOnly: 1,
      textScaleOnly: 1,
    })
  })

  test('provider measures reactive runtime design context hooks', async () => {
    const { createTaoDesign } = await import('../tao/tao-runtime/tao-design-runtime')
    mockColorScheme = 'dark'
    mockFontScale = 1.35
    mockWidth = 840

    const design = createTaoDesign({ styles: {} })
    const provider = design.TaoDesignProvider({ children: 'child' }) as {
      props: { value: Record<string, unknown> }
    }

    expect(provider.props.value).toMatchObject({
      colorScheme: 'dark',
      platform: 'ios',
      reducedMotion: false,
      screenSize: 'regular',
      textScale: 1.35,
    })
    expect(reduceMotionListener).toBeDefined()
  })
})
