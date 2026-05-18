import {
  defaultItemsForStandardContainer,
  itemAxisStyleKey,
  itemWordAxis,
  itemWordReactNativeValue,
  layoutPaddingReactNativeKey,
  standardContainerDirection,
  type TaoLayoutDirection,
  type TaoLayoutItemAxis,
  type TaoLayoutItemSlots,
} from '@shared/layout/layout-axis'

type TaoLayoutTerm = string | number
type TaoLayoutEntry = readonly TaoLayoutTerm[]

export type TaoLayoutSpec = {
  readonly view: string
  readonly parentDirection?: TaoLayoutDirection
  readonly entries: readonly TaoLayoutEntry[]
}

export type TaoResolvedLayoutStyle = Record<string, string | number>

/** Layout exposes Tao layout resolution helpers used by generated render-site code. */
export const Layout = {
  resolve,
} as const

/** resolve converts a validated Tao layout spec into React Native style properties. */
export function resolve(spec: TaoLayoutSpec): TaoResolvedLayoutStyle {
  const style: TaoResolvedLayoutStyle = { overflow: 'hidden' }
  const direction = standardContainerDirection(spec.view)
  const defaults = defaultItemsForStandardContainer(spec.view)
  if (direction !== undefined && defaults !== undefined) {
    applyItems(style, direction, defaults)
  }

  for (const entry of spec.entries) {
    applyLayoutEntry(style, spec, entry, direction)
  }

  return style
}

function applyLayoutEntry(
  style: TaoResolvedLayoutStyle,
  spec: TaoLayoutSpec,
  entry: TaoLayoutEntry,
  direction: TaoLayoutDirection | undefined,
): void {
  const head = entry[0]
  if (typeof head !== 'string') {
    return
  }
  switch (head) {
    case 'items':
      if (direction !== undefined) {
        applyItems(style, direction, normalizeItems(spec.view, direction, entry.slice(1)))
      }
      return
    case 'aligned':
      applyAligned(style, entry[1])
      return
    case 'stretched':
      style['alignSelf'] = 'stretch'
      return
    case 'width':
    case 'height':
      applyDimension(style, head, entry, spec.parentDirection)
      return
    case 'fill':
      style['flexGrow'] = 1
      style['alignSelf'] = 'stretch'
      return
    case 'grow':
      style['flexGrow'] = typeof entry[1] === 'number' ? entry[1] : 1
      return
    case 'compress':
      style['flexShrink'] = 1
      return
    case 'rigid':
      style['flexShrink'] = 0
      return
    case 'gap':
      applySingleNumber(style, 'gap', entry[1])
      return
    case 'pad':
      applyPad(style, entry)
      return
  }
}

function normalizeItems(
  viewName: string,
  direction: TaoLayoutDirection,
  words: readonly TaoLayoutTerm[],
): TaoLayoutItemSlots {
  const defaults = defaultItemsForStandardContainer(viewName) ?? { vertical: 'top', horizontal: 'left' }
  const result: Partial<TaoLayoutItemSlots> = {}
  let centerCount = 0
  for (const term of words) {
    if (typeof term !== 'string') {
      continue
    }
    if (term === 'center') {
      centerCount++
      continue
    }
    const axis = itemWordAxis(term, direction)
    if (axis !== undefined) {
      result[axis] = term
    }
  }
  if (centerCount >= 2) {
    result.vertical ??= 'center'
    result.horizontal ??= 'center'
  } else if (centerCount === 1) {
    result.vertical ??= 'center'
    result.horizontal ??= 'center'
  }
  return {
    vertical: result.vertical ?? defaults.vertical,
    horizontal: result.horizontal ?? defaults.horizontal,
  }
}

function applyItems(
  style: TaoResolvedLayoutStyle,
  direction: TaoLayoutDirection,
  items: TaoLayoutItemSlots,
): void {
  applyItemSlot(style, direction, 'vertical', items.vertical)
  applyItemSlot(style, direction, 'horizontal', items.horizontal)
}

function applyItemSlot(
  style: TaoResolvedLayoutStyle,
  direction: TaoLayoutDirection,
  axis: TaoLayoutItemAxis,
  word: string,
): void {
  style[itemAxisStyleKey(direction, axis)] = itemWordReactNativeValue(word)
}

function applyAligned(style: TaoResolvedLayoutStyle, word: TaoLayoutTerm | undefined): void {
  if (typeof word !== 'string') {
    return
  }
  switch (word) {
    case 'bottom':
    case 'right':
      style['alignSelf'] = 'flex-end'
      return
    case 'center':
      style['alignSelf'] = 'center'
      return
    case 'baseline':
      style['alignSelf'] = 'baseline'
      return
    default:
      style['alignSelf'] = 'flex-start'
  }
}

function applyDimension(
  style: TaoResolvedLayoutStyle,
  head: 'width' | 'height',
  entry: TaoLayoutEntry,
  parentDirection: TaoLayoutDirection | undefined,
): void {
  for (let i = 1; i < entry.length; i++) {
    const term = entry[i]
    if (term === 'fill') {
      applyPhysicalFill(style, head, parentDirection)
    } else if (term === 'min' || term === 'max') {
      const value = entry[++i]
      if (value !== undefined) {
        style[dimensionLimitKey(head, term)] = value
      }
    } else if (term !== 'hug' && term !== undefined) {
      style[head] = term
    }
  }
}

function applyPhysicalFill(
  style: TaoResolvedLayoutStyle,
  head: 'width' | 'height',
  parentDirection: TaoLayoutDirection | undefined,
): void {
  if (parentDirection === undefined) {
    return
  }
  const mainAxisFill = (parentDirection === 'row' && head === 'width')
    || (parentDirection === 'column' && head === 'height')
  if (mainAxisFill) {
    style['flexGrow'] = 1
  } else {
    style['alignSelf'] = 'stretch'
  }
}

function dimensionLimitKey(head: 'width' | 'height', limit: 'min' | 'max'): string {
  if (head === 'width') {
    return limit === 'min' ? 'minWidth' : 'maxWidth'
  }
  return limit === 'min' ? 'minHeight' : 'maxHeight'
}

function applySingleNumber(style: TaoResolvedLayoutStyle, key: string, value: TaoLayoutTerm | undefined): void {
  if (value !== undefined) {
    style[key] = value
  }
}

function applyPad(style: TaoResolvedLayoutStyle, entry: TaoLayoutEntry): void {
  const sides: Record<'top' | 'right' | 'bottom' | 'left', TaoLayoutTerm> = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }
  const setAll = (value: TaoLayoutTerm) => {
    sides.top = value
    sides.right = value
    sides.bottom = value
    sides.left = value
  }
  for (let i = 1; i < entry.length; i++) {
    const term = entry[i]
    if (typeof term === 'number' || isPercentString(term)) {
      setAll(term)
      continue
    }
    const value = entry[++i]
    if (value === undefined) {
      continue
    }
    switch (term) {
      case 'horizontal':
        sides.left = value
        sides.right = value
        break
      case 'vertical':
        sides.top = value
        sides.bottom = value
        break
      case 'top':
        sides.top = value
        break
      case 'right':
        sides.right = value
        break
      case 'bottom':
        sides.bottom = value
        break
      case 'left':
        sides.left = value
        break
    }
  }
  style[layoutPaddingReactNativeKey('top')] = sides.top
  style[layoutPaddingReactNativeKey('right')] = sides.right
  style[layoutPaddingReactNativeKey('bottom')] = sides.bottom
  style[layoutPaddingReactNativeKey('left')] = sides.left
}

function isPercentString(term: TaoLayoutTerm | undefined): term is string {
  return typeof term === 'string' && /^-?\d+%$/.test(term)
}
