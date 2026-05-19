import { describe, expect, mock, test } from 'bun:test'

mock.module('react', () => {
  const React = {
    createContext<T>(value: T) {
      return { Provider: 'Provider', value }
    },
    createElement(type: unknown, props: unknown, ...children: unknown[]) {
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
    addEventListener() {
      return { remove() {} }
    },
    isReduceMotionEnabled() {
      return Promise.resolve(false)
    },
  },
  Appearance: { getColorScheme: () => 'light' },
  Dimensions: { get: () => ({ width: 320 }) },
  PixelRatio: { getFontScale: () => 1 },
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  StyleSheet: {
    create<T extends Record<string, unknown>>(styles: T): T {
      return styles
    },
    flatten(style: unknown): Record<string, unknown> {
      return flattenStyleEntries(style)
    },
  },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
  useColorScheme: () => 'light',
  useWindowDimensions: () => ({ fontScale: 1, width: 320 }),
}))

function flattenStyleEntries(style: unknown): Record<string, unknown> {
  if (style === undefined || style === null || style === false) {
    return {}
  }
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, item) => Object.assign(acc, flattenStyleEntries(item)), {})
  }
  if (typeof style === 'object') {
    return style as Record<string, unknown>
  }
  return {}
}

type RenderedElement = { type: unknown; props: Record<string, unknown>; children: unknown[] }

async function loadViews() {
  const Views = await import('../tao/tao-runtime/Views')
  return Views.Views
}

function render(view: (props: any) => unknown, props: Record<string, unknown>): RenderedElement {
  return view(props) as RenderedElement
}

function flatten(style: unknown): Record<string, unknown> {
  return flattenStyleEntries(style)
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance(hex: string): number {
  const channels = parseHex(hex).map(channel => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.startsWith('#') ? hex.slice(1) : hex
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return [r, g, b]
}

describe('Views baseline styles:', () => {
  test('Text renders with light-mode body color and 16px body size', async () => {
    const Views = await loadViews()
    const element = render(Views.Text, { children: ['Hello'] })
    const style = flatten(element.props['style'])
    expect(style['color']).toBe('#0f172a')
    expect(style['fontSize']).toBe(16)
    expect(style['lineHeight']).toBe(24)
  })

  test('Dark scheme palette provides distinct primary text color and surface', async () => {
    const { taoBaselinePaletteFor } = await import('../tao/tao-runtime/Views')
    const light = taoBaselinePaletteFor('light')
    const dark = taoBaselinePaletteFor('dark')
    expect(dark.primaryText).not.toBe(light.primaryText)
    expect(dark.appBackground).not.toBe(light.appBackground)
    expect(dark.surfaceBackground).not.toBe(light.surfaceBackground)
    expect(dark.inputBackground).not.toBe(light.inputBackground)
  })

  test('Every curated accent meets WCAG 3:1 contrast for accent vs on-accent text', async () => {
    const { taoBaselinePaletteFor } = await import('../tao/tao-runtime/Views')
    const { TAO_BASELINE_ACCENT_NAMES } = await import('../tao/tao-runtime/tao-design-runtime')
    for (const accentName of TAO_BASELINE_ACCENT_NAMES) {
      for (const scheme of ['light', 'dark'] as const) {
        const palette = taoBaselinePaletteFor(scheme, accentName)
        const ratio = contrastRatio(palette.accent, palette.onAccentText)
        if (ratio < 3) {
          throw new Error(
            `${scheme}/${accentName}: accent ${palette.accent} vs onAccent ${palette.onAccentText} ratio ${
              ratio.toFixed(2)
            } < 3.0`,
          )
        }
        expect(ratio).toBeGreaterThanOrEqual(3)
      }
    }
  })

  test('Each accent name selects a distinct primary accent color in light mode', async () => {
    const { taoBaselinePaletteFor } = await import('../tao/tao-runtime/Views')
    const { TAO_BASELINE_ACCENT_NAMES } = await import('../tao/tao-runtime/tao-design-runtime')
    const accents = new Set(
      TAO_BASELINE_ACCENT_NAMES.map(name => taoBaselinePaletteFor('light', name).accent),
    )
    expect(accents.size).toBe(TAO_BASELINE_ACCENT_NAMES.length)
  })

  test('TextLabel uses label-weight typography distinct from body', async () => {
    const Views = await loadViews()
    const element = render(Views.TextLabel, { children: ['Name'] })
    const style = flatten(element.props['style'])
    expect(style['color']).toBe('#334155')
    expect(style['fontWeight']).toBe('600')
    expect(style['fontSize']).toBe(14)
  })

  test('Number uses tabular figures for aligned digits', async () => {
    const Views = await loadViews()
    const element = render(Views.Number, { children: ['42'] })
    const style = flatten(element.props['style'])
    expect(style['fontVariant']).toEqual(['tabular-nums'])
    expect(style['fontSize']).toBe(16)
  })

  test('Explicit _taoDesignStyle overrides baseline color', async () => {
    const Views = await loadViews()
    const element = render(Views.Text, {
      _taoDesignStyle: { color: '#ff0000' },
      children: ['Hi'],
    })
    const style = flatten(element.props['style'])
    expect(style['color']).toBe('#ff0000')
    expect(style['fontSize']).toBe(16)
  })

  test('Button renders with accent background, on-accent label and accessibility role', async () => {
    const Views = await loadViews()
    const element = render(Views.Button, { onPress: () => undefined, title: 'Save' })
    const style = flatten(element.props['style'])
    expect(style['backgroundColor']).toBe('#2563eb')
    expect(style['borderRadius']).toBe(12)
    expect(style['minHeight']).toBe(48)
    expect(style['alignItems']).toBe('center')
    expect(element.props['accessibilityRole']).toBe('button')
    expect(element.props['accessibilityLabel']).toBe('Save')

    const text = element.children[0] as RenderedElement
    const textStyle = flatten(text.props['style'])
    expect(textStyle['color']).toBe('#ffffff')
    expect(textStyle['fontWeight']).toBe('600')
  })

  test('Disabled button uses disabled palette and accessibilityState', async () => {
    const Views = await loadViews()
    const element = render(Views.Button, { disabled: true, onPress: () => undefined, title: 'Save' })
    const style = flatten(element.props['style'])
    expect(style['backgroundColor']).toBe('#e2e8f0')
    const accessibilityState = element.props['accessibilityState'] as { disabled: boolean }
    expect(accessibilityState.disabled).toBe(true)

    const text = element.children[0] as RenderedElement
    const textStyle = flatten(text.props['style'])
    expect(textStyle['color']).toBe('#94a3b8')
  })

  test('Stateful _taoDesignStyle wins over baseline button view fallback', async () => {
    const Views = await loadViews()
    const element = render(Views.Button, {
      _taoDesignStyle: () => ({ backgroundColor: '#0ea5e9' }),
      onPress: () => undefined,
      title: 'Save',
    })
    const style = flatten(element.props['style'])
    expect(style['backgroundColor']).toBe('#0ea5e9')
  })

  test('TextInput renders with input baseline, placeholder color and accent border on focus', async () => {
    const Views = await loadViews()
    const element = render(Views.TextInput, { value: '' })
    const style = flatten(element.props['style'])
    expect(style['backgroundColor']).toBe('#ffffff')
    expect(style['borderColor']).toBe('#cbd5e1')
    expect(style['borderRadius']).toBe(12)
    expect(style['minHeight']).toBe(48)
    expect(style['paddingHorizontal']).toBe(16)
    expect(element.props['placeholderTextColor']).toBe('#94a3b8')
    expect(typeof element.props['onFocus']).toBe('function')
    expect(typeof element.props['onBlur']).toBe('function')
  })

  test('Disabled TextInput uses disabled palette', async () => {
    const Views = await loadViews()
    const element = render(Views.TextInput, { editable: false, value: '' })
    const style = flatten(element.props['style'])
    expect(style['backgroundColor']).toBe('#e2e8f0')
    expect(style['color']).toBe('#94a3b8')
  })
})
