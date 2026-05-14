/** Tao flex direction for resolving bare child-arrangement words. */
export type TaoLayoutDirection = 'row' | 'column'

/** Main vs cross flex axis. */
export type TaoLayoutAxis = 'main' | 'cross'

/** layoutChildWordAxis maps a bare child-arrangement word to the axis it affects for the given flex direction. */
export function layoutChildWordAxis(word: string, direction: TaoLayoutDirection): TaoLayoutAxis {
  if (word === 'pack' || word === 'spread' || word === 'around' || word === 'evenly') {
    return 'main'
  }
  if (word === 'stretch') {
    return 'cross'
  }
  if (direction === 'row') {
    return word === 'left' || word === 'right' ? 'main' : 'cross'
  }
  return word === 'top' || word === 'bottom' ? 'main' : 'cross'
}

/** layoutSpacingReactNativeKey maps Tao `pad` / `margin` side names to React Native style property keys. */
export function layoutSpacingReactNativeKey(head: 'pad' | 'margin', side: string): string {
  const prefix = head === 'pad' ? 'padding' : 'margin'
  switch (side) {
    case 'all':
      return prefix
    case 'horizontal':
      return `${prefix}Horizontal`
    case 'vertical':
      return `${prefix}Vertical`
    case 'top':
      return `${prefix}Top`
    case 'right':
      return `${prefix}Right`
    case 'bottom':
      return `${prefix}Bottom`
    case 'left':
      return `${prefix}Left`
    default:
      return prefix
  }
}
