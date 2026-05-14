import {
  layoutChildWordAxis,
  layoutSpacingReactNativeKey,
  type TaoLayoutDirection,
} from '@shared/layout/layout-axis'

type TaoLayoutTerm = string | number
type TaoLayoutEntry = readonly TaoLayoutTerm[]

export type TaoLayoutSpec = {
  readonly view: string
  readonly entries: readonly TaoLayoutEntry[]
}

export type TaoResolvedLayoutStyle = Record<string, string | number>

/** Layout exposes Tao layout resolution helpers used by generated render-site code. */
export const Layout = {
  resolve,
} as const

/** resolve converts a validated Tao layout spec into React Native style properties. */
export function resolve(spec: TaoLayoutSpec): TaoResolvedLayoutStyle {
  const style: TaoResolvedLayoutStyle = {}
  const direction = layoutDirection(spec)

  for (const entry of spec.entries) {
    applyLayoutEntry(style, entry, direction)
  }

  return style
}

function applyLayoutEntry(
  style: TaoResolvedLayoutStyle,
  entry: TaoLayoutEntry,
  direction: TaoLayoutDirection | undefined,
): void {
  const head = entry[0]
  if (typeof head !== 'string') {
    return
  }
  if (entry.every(term => typeof term === 'string' && !isPercentString(term))) {
    for (const word of entry as readonly string[]) {
      applyBareLayoutWord(style, word, direction)
    }
    return
  }
  if (head === 'pad' || head === 'margin') {
    applySpacingEntry(style, head, entry)
    return
  }
  applyNumericEntry(style, head, entry)
}

function applyBareLayoutWord(
  style: TaoResolvedLayoutStyle,
  word: string,
  direction: TaoLayoutDirection | undefined,
): void {
  switch (word) {
    case 'row':
      style['flexDirection'] = 'row'
      return
    case 'column':
      style['flexDirection'] = 'column'
      return
    case 'wrap':
    case 'nowrap':
      style['flexWrap'] = word
      return
    case 'relative':
    case 'absolute':
      style['position'] = word
      return
    case 'centered':
      style['alignSelf'] = 'center'
      return
    case 'stretched':
      style['alignSelf'] = 'stretch'
      return
    case 'packed':
      style['alignSelf'] = 'flex-start'
      return
    default:
      applyChildArrangementWord(style, word, direction)
  }
}

function applyChildArrangementWord(
  style: TaoResolvedLayoutStyle,
  word: string,
  direction: TaoLayoutDirection | undefined,
): void {
  if (direction === undefined) {
    return
  }
  if (word === 'center') {
    applyCenter(style)
    return
  }
  const axis = layoutChildWordAxis(word, direction)
  const rnValue = childWordReactNativeValue(word)
  if (axis === 'main') {
    style['justifyContent'] = rnValue
  } else {
    style['alignItems'] = rnValue
  }
}

function applyCenter(style: TaoResolvedLayoutStyle): void {
  const hasMain = style['justifyContent'] !== undefined
  const hasCross = style['alignItems'] !== undefined
  if (!hasMain && !hasCross) {
    style['justifyContent'] = 'center'
    style['alignItems'] = 'center'
  } else if (hasMain && !hasCross) {
    style['alignItems'] = 'center'
  } else if (!hasMain && hasCross) {
    style['justifyContent'] = 'center'
  }
}

function applyNumericEntry(style: TaoResolvedLayoutStyle, head: string, entry: TaoLayoutEntry): void {
  const value = entry[1]
  if (value === undefined) {
    return
  }
  switch (head) {
    case 'gap':
      style['gap'] = value
      return
    case 'row_gap':
      style['rowGap'] = value
      return
    case 'column_gap':
      style['columnGap'] = value
      return
    case 'min_width':
      style['minWidth'] = value
      return
    case 'max_width':
      style['maxWidth'] = value
      return
    case 'min_height':
      style['minHeight'] = value
      return
    case 'max_height':
      style['maxHeight'] = value
      return
    case 'grow':
      style['flexGrow'] = value
      return
    case 'shrink':
      style['flexShrink'] = value
      return
    case 'basis':
      style['flexBasis'] = value
      return
    case 'z':
      style['zIndex'] = value
      return
    default:
      style[head] = value
  }
}

function applySpacingEntry(
  style: TaoResolvedLayoutStyle,
  head: 'pad' | 'margin',
  entry: TaoLayoutEntry,
): void {
  if (entry.length === 2) {
    const value = entry[1]
    if (value === undefined) {
      return
    }
    style[layoutSpacingReactNativeKey(head, 'all')] = value
    return
  }
  if (entry.length === 3 && typeof entry[1] !== 'string') {
    const vertical = entry[1]
    const horizontal = entry[2]
    if (vertical === undefined || horizontal === undefined) {
      return
    }
    style[layoutSpacingReactNativeKey(head, 'vertical')] = vertical
    style[layoutSpacingReactNativeKey(head, 'horizontal')] = horizontal
    return
  }
  const side = entry[1]
  const amount = entry[2]
  if (typeof side === 'string' && amount !== undefined) {
    style[layoutSpacingReactNativeKey(head, side)] = amount
  }
}

function layoutDirection(spec: TaoLayoutSpec): TaoLayoutDirection | undefined {
  for (const entry of spec.entries) {
    for (const term of entry) {
      if (term === 'row' || term === 'column') {
        return term
      }
    }
  }
  if (spec.view === 'Row') {
    return 'row'
  }
  if (spec.view === 'Col') {
    return 'column'
  }
  return undefined
}

function childWordReactNativeValue(word: string): string {
  switch (word) {
    case 'right':
    case 'bottom':
      return 'flex-end'
    case 'spread':
      return 'space-between'
    case 'around':
      return 'space-around'
    case 'evenly':
      return 'space-evenly'
    case 'center':
      return 'center'
    case 'stretch':
      return 'stretch'
    default:
      return 'flex-start'
  }
}

function isPercentString(term: TaoLayoutTerm): boolean {
  return typeof term === 'string' && /^-?\d+%$/.test(term)
}
