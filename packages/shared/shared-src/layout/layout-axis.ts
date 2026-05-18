/** Tao flex direction for resolving normal-flow layout. */
export type TaoLayoutDirection = 'row' | 'column'

/** Tao physical item slot affected by an `items` token. */
export type TaoLayoutItemAxis = 'vertical' | 'horizontal'

export type TaoLayoutItemSlots = {
  vertical: string
  horizontal: string
}

export type TaoLayoutItemsNormalizationIssue =
  | { kind: 'item-not-allowed'; word: string }
  | { kind: 'item-axis-conflict'; word: string; existing: string; axis: TaoLayoutItemAxis }
  | { kind: 'center-has-no-slot' }

export type TaoLayoutItemsNormalization = {
  slots: TaoLayoutItemSlots
  issues: readonly TaoLayoutItemsNormalizationIssue[]
}

const standardContainerDirections: Record<string, TaoLayoutDirection> = {
  Row: 'row',
  Box: 'row',
  WrappingRow: 'row',
  Col: 'column',
  Stack: 'column',
}

const standardContainerItemDefaults: Record<string, TaoLayoutItemSlots> = {
  Row: { vertical: 'baseline', horizontal: 'left' },
  Col: { vertical: 'top', horizontal: 'stretch' },
  Box: { vertical: 'center', horizontal: 'left' },
  Stack: { vertical: 'top', horizontal: 'center' },
  WrappingRow: { vertical: 'baseline', horizontal: 'left' },
}

/** standardContainerDirection returns the normal-flow direction for a standard library layout container. */
export function standardContainerDirection(viewName: string): TaoLayoutDirection | undefined {
  return standardContainerDirections[viewName]
}

/** defaultItemsForStandardContainer returns the default vertical/horizontal item slots for a standard container. */
export function defaultItemsForStandardContainer(viewName: string): TaoLayoutItemSlots | undefined {
  return standardContainerItemDefaults[viewName]
}

/** isKnownItemWord returns true when `word` is legal inside an `items` layout entry. */
export function isKnownItemWord(word: string): boolean {
  return [
    'top',
    'bottom',
    'left',
    'right',
    'center',
    'baseline',
    'stretch',
    'spread',
    'spread-inset',
    'spread-balanced',
  ].includes(word)
}

/** itemWordAxis returns the physical slot claimed by an `items` token for the given container direction. */
export function itemWordAxis(word: string, direction: TaoLayoutDirection): TaoLayoutItemAxis | undefined {
  if (word === 'center') {
    return undefined
  }
  if (word === 'baseline') {
    return direction === 'row' ? 'vertical' : undefined
  }
  if (word === 'stretch') {
    return direction === 'row' ? 'vertical' : 'horizontal'
  }
  if (word === 'spread' || word === 'spread-inset' || word === 'spread-balanced') {
    return direction === 'row' ? 'horizontal' : 'vertical'
  }
  if (word === 'top' || word === 'bottom') {
    return 'vertical'
  }
  if (word === 'left' || word === 'right') {
    return 'horizontal'
  }
  return undefined
}

/** normalizeItemsTokens resolves `items` tokens into vertical/horizontal slots and validation issues. */
export function normalizeItemsTokens(
  viewName: string,
  direction: TaoLayoutDirection,
  words: readonly string[],
  defaults: TaoLayoutItemSlots = defaultItemsForStandardContainer(viewName) ?? { vertical: 'top', horizontal: 'left' },
): TaoLayoutItemsNormalization {
  const result: Partial<TaoLayoutItemSlots> = {}
  const claimed = new Map<TaoLayoutItemAxis, string>()
  const issues: TaoLayoutItemsNormalizationIssue[] = []
  let centerCount = 0

  for (const word of words) {
    if (word === 'center') {
      centerCount++
      continue
    }

    const axis = itemWordAxis(word, direction)
    if (axis === undefined) {
      issues.push({ kind: 'item-not-allowed', word })
      continue
    }

    const existing = claimed.get(axis)
    if (existing !== undefined) {
      issues.push({ kind: 'item-axis-conflict', word, existing, axis })
    } else {
      claimed.set(axis, word)
      result[axis] = word
    }
  }

  if (centerCount > 2) {
    issues.push({ kind: 'item-axis-conflict', word: 'center', existing: 'center', axis: 'horizontal' })
  } else if (centerCount === 2 && claimed.size > 0) {
    issues.push({ kind: 'center-has-no-slot' })
  } else if (centerCount === 1 && claimed.has('vertical') && claimed.has('horizontal')) {
    issues.push({ kind: 'center-has-no-slot' })
  }

  if (centerCount >= 2) {
    result.vertical ??= 'center'
    result.horizontal ??= 'center'
  } else if (centerCount === 1) {
    result.vertical ??= 'center'
    result.horizontal ??= 'center'
  }

  return {
    slots: {
      vertical: result.vertical ?? defaults.vertical,
      horizontal: result.horizontal ?? defaults.horizontal,
    },
    issues,
  }
}

/** itemAxisStyleKey returns the React Native style key for a physical item slot in a container direction. */
export function itemAxisStyleKey(
  direction: TaoLayoutDirection,
  axis: TaoLayoutItemAxis,
): 'alignItems' | 'justifyContent' {
  if (direction === 'row') {
    return axis === 'vertical' ? 'alignItems' : 'justifyContent'
  }
  return axis === 'vertical' ? 'justifyContent' : 'alignItems'
}

/** itemWordReactNativeValue maps a Tao item token to the corresponding React Native/Yoga value. */
export function itemWordReactNativeValue(word: string): string {
  switch (word) {
    case 'bottom':
    case 'right':
      return 'flex-end'
    case 'center':
      return 'center'
    case 'stretch':
      return 'stretch'
    case 'baseline':
      return 'baseline'
    case 'spread':
      return 'space-between'
    case 'spread-inset':
      return 'space-around'
    case 'spread-balanced':
      return 'space-evenly'
    default:
      return 'flex-start'
  }
}

/** layoutPaddingReactNativeKey maps Tao `pad` side names to React Native style property keys. */
export function layoutPaddingReactNativeKey(side: string): string {
  switch (side) {
    case 'top':
      return 'paddingTop'
    case 'right':
      return 'paddingRight'
    case 'bottom':
      return 'paddingBottom'
    case 'left':
      return 'paddingLeft'
    default:
      return 'padding'
  }
}
