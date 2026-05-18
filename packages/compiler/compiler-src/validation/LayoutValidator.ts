import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import {
  defaultItemsForStandardContainer,
  isKnownItemWord,
  itemWordAxis,
  standardContainerDirection,
  type TaoLayoutDirection,
  type TaoLayoutItemAxis,
} from '@shared/layout/layout-axis'
import { layoutEntryText, layoutEntryValues, type TaoLayoutTermValue } from '../layout/tao-layout'
import { makeValidater, type Reporter } from './ValidationReporter'

type DimensionHead = 'width' | 'height'
type DimensionMode = 'fill' | 'hug' | 'fixed'
type LayoutRenderHost = AST.RenderStatement | AST.ViewRender

type ClauseState = {
  items?: AST.LayoutEntry
  bareFill?: AST.LayoutEntry
  bareHug?: AST.LayoutEntry
  alignSelf?: AST.LayoutEntry
  stretched?: AST.LayoutEntry
  grow?: AST.LayoutEntry
  compress?: AST.LayoutEntry
  rigid?: AST.LayoutEntry
  gap?: AST.LayoutEntry
  pad?: AST.LayoutEntry
  dimensions: Map<DimensionHead, { entry: AST.LayoutEntry; mode?: DimensionMode; min?: number; max?: number }>
}

const layoutHeads = new Set([
  'items',
  'aligned',
  'stretched',
  'width',
  'height',
  'fill',
  'hug',
  'grow',
  'compress',
  'rigid',
  'gap',
  'pad',
])

const itemOnlyWords = new Set([
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
])

const removedLayoutWords = new Set([
  'centered',
  'packed',
  'row',
  'column',
  'wrap',
  'nowrap',
  'margin',
  'absolute',
  'relative',
  'row_gap',
  'column_gap',
  'shrink',
  'basis',
  'z',
  'around',
  'evenly',
  'pack',
  'min_width',
  'max_width',
  'min_height',
  'max_height',
])

const deferredLayoutWords = new Set([
  'aspect_ratio',
  'border',
  'box_sizing',
  'clip',
  'display',
  'fixed',
  'flow',
  'hidden',
  'inset',
  'lines',
  'nudge',
  'overlay',
  'overflow',
  'percent',
  'reverse',
  'self',
  'stacking',
  'start',
  'end',
  'static',
])

const outOfLayoutWords = new Map([
  ['bg', 'styling'],
  ['color', 'styling'],
  ['font', 'styling'],
  ['line_height', 'styling'],
  ['opacity', 'styling'],
  ['radius', 'styling'],
  ['shadow', 'styling'],
  ['size', 'styling'],
  ['text_align', 'styling'],
  ['weight', 'styling'],
  ['rotate', 'transform'],
  ['scale', 'transform'],
  ['translate', 'transform'],
  ['duration', 'motion'],
  ['spring', 'motion'],
  ['transition', 'motion'],
  ['access', 'accessibility'],
  ['when', 'interaction'],
])

/** layoutValidationMessages holds stable user-facing diagnostics for the layout MVP. */
export const layoutValidationMessages = {
  emptyClause: 'Layout clauses must contain at least one layout entry.',
  numericHead: 'Layout entries must start with a layout word.',
  unknownWord: (word: string) => `Unknown layout word '${word}'.`,
  wordMustBeLowercase: (word: string) => `Layout word '${word}' must be lowercase.`,
  outOfLayoutWord: (word: string, lane: string) => `Layout word '${word}' belongs to ${lane}, not layout.`,
  unsupportedWord: (word: string) => `Layout word '${word}' is not supported in the layout MVP.`,
  itemWordOutsideItems: (word: string) => `Layout word '${word}' must be used inside an 'items' entry.`,
  malformedEntry: (entry: string) => `Malformed layout entry '${entry}'.`,
  duplicateProperty: (key: string) => `Duplicate layout property '${key}'.`,
  itemsNeedsDirection: (viewName: string) =>
    `Layout 'items' requires a standard Row/Col/Box/Stack/WrappingRow container, not '${viewName}'.`,
  itemAxisConflict: (word: string, existing: string, axis: TaoLayoutItemAxis) =>
    `Layout item '${word}' conflicts with '${existing}' on the ${axis} slot.`,
  itemNotAllowed: (word: string, direction: TaoLayoutDirection) =>
    `Layout item '${word}' is not valid in a ${direction} container.`,
  centerHasNoSlot: `Layout item 'center' has no empty slot to fill.`,
  alignedNeedsParentAxis: (word: string) => `Self layout '${word}' requires a Row/Col/Box/Stack/WrappingRow parent.`,
  invalidAligned: (word: string, direction: TaoLayoutDirection) =>
    `Self layout 'aligned ${word}' is not valid in a ${direction} parent.`,
  alignedStretch: `Use 'stretched' instead of 'aligned stretch'.`,
  negativeNotAllowed: (key: string) => `Layout property '${key}' does not allow negative values.`,
  percentOutOfRange: (key: string) => `Layout property '${key}' percent values must be between 0 and 100.`,
  percentNotAllowed: (key: string) => `Layout property '${key}' does not accept percent values.`,
  minGreaterThanMax: (minKey: string, maxKey: string) => `Layout '${minKey}' cannot be greater than '${maxKey}'.`,
  fillWithDimension: `Layout 'fill' cannot appear with 'width' or 'height' in the same clause.`,
  hugWithDimension: `Layout 'hug' cannot appear with 'width' or 'height' in the same clause.`,
  fillWithHug: `Layout 'fill' conflicts with 'hug' in the same clause.`,
  compressRigid: `Layout 'compress' conflicts with 'rigid'.`,
  stretchedHug: `Layout 'stretched' conflicts with cross-axis 'hug'.`,
} as const

export const layoutValidator: Pick<langium.ValidationChecks<AST.TaoLangAstType>, 'RenderStatement' | 'ViewRender'> = {
  RenderStatement: makeValidater((node, report) => {
    validateRenderHostLayout(node, report)
  }),
  ViewRender: makeValidater((node, report) => {
    validateRenderHostLayout(node, report)
  }),
}

/** validateRenderHostLayout validates a render-site `[ ... ]` layout clause. */
function validateRenderHostLayout(node: LayoutRenderHost, report: Reporter<LayoutRenderHost>): void {
  const clause = node.layoutClause
  if (clause === undefined) {
    return
  }
  if (clause.entries.length === 0) {
    report.error(layoutValidationMessages.emptyClause, clause)
    return
  }

  const state: ClauseState = { dimensions: new Map() }
  for (const entry of clause.entries) {
    validateLayoutEntry(node, entry, state, report)
  }
  validateClauseState(node, state, report)
}

function validateLayoutEntry(
  node: LayoutRenderHost,
  entry: AST.LayoutEntry,
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  const values = layoutEntryValues(entry)
  const head = values[0]
  if (head === undefined) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  if (typeof head !== 'string') {
    report.error(layoutValidationMessages.numericHead, entry)
    return
  }
  const uppercase = values.find(value => isLayoutWord(value) && value !== value.toLowerCase())
  if (typeof uppercase === 'string') {
    report.error(layoutValidationMessages.wordMustBeLowercase(uppercase), entry)
    return
  }
  if (!layoutHeads.has(head)) {
    report.error(unknownLayoutWordMessage(head), entry)
    return
  }

  switch (head) {
    case 'items':
      validateItemsEntry(node, entry, values, state, report)
      return
    case 'aligned':
      validateAlignedEntry(node, entry, values, state, report)
      return
    case 'stretched':
      validateStretchedEntry(node, entry, values, state, report)
      return
    case 'width':
    case 'height':
      validateDimensionEntry(head, entry, values, state, report)
      return
    case 'fill':
      validateBareModeEntry('fill', entry, values, state, report)
      return
    case 'hug':
      validateBareModeEntry('hug', entry, values, state, report)
      return
    case 'grow':
      validateGrowEntry(entry, values, state, report)
      return
    case 'compress':
      validatePressureEntry('compress', entry, values, state, report)
      return
    case 'rigid':
      validatePressureEntry('rigid', entry, values, state, report)
      return
    case 'gap':
      validateSingleNumberEntry('gap', entry, values, state, report)
      return
    case 'pad':
      validatePadEntry(entry, values, state, report)
      return
  }
}

function validateItemsEntry(
  node: LayoutRenderHost,
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (state.items !== undefined) {
    report.error(layoutValidationMessages.duplicateProperty('items'), entry)
    return
  }
  state.items = entry

  const terms = values.slice(1)
  if (terms.length === 0 || terms.some(term => !isLayoutWord(term))) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  const invalid = terms.find(term => typeof term === 'string' && !isKnownItemWord(term))
  if (typeof invalid === 'string') {
    report.error(unknownLayoutWordMessage(invalid), entry)
    return
  }

  const viewName = node.view?.$refText ?? '<unknown>'
  const direction = viewDirection(node)
  if (direction === undefined) {
    report.error(layoutValidationMessages.itemsNeedsDirection(viewName), entry)
    return
  }
  const defaults = defaultItemsForStandardContainer(viewName)
  if (defaults === undefined) {
    report.error(layoutValidationMessages.itemsNeedsDirection(viewName), entry)
    return
  }

  const claimed = new Map<TaoLayoutItemAxis, string>()
  let centerCount = 0
  for (const word of terms as string[]) {
    if (word === 'center') {
      centerCount++
      continue
    }
    const axis = itemWordAxis(word, direction)
    if (axis === undefined) {
      report.error(layoutValidationMessages.itemNotAllowed(word, direction), entry)
      continue
    }
    const existing = claimed.get(axis)
    if (existing !== undefined) {
      report.error(layoutValidationMessages.itemAxisConflict(word, existing, axis), entry)
    } else {
      claimed.set(axis, word)
    }
  }

  if (centerCount > 2) {
    report.error(layoutValidationMessages.itemAxisConflict('center', 'center', 'horizontal'), entry)
  } else if (centerCount === 2 && claimed.size > 0) {
    report.error(layoutValidationMessages.centerHasNoSlot, entry)
  } else if (centerCount === 1 && claimed.has('vertical') && claimed.has('horizontal')) {
    report.error(layoutValidationMessages.centerHasNoSlot, entry)
  }
}

function validateAlignedEntry(
  node: LayoutRenderHost,
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (values.length !== 2 || !isLayoutWord(values[1])) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  const word = values[1]
  if (word === 'stretch') {
    report.error(layoutValidationMessages.alignedStretch, entry)
    return
  }
  const direction = parentViewDirection(node)
  if (direction === undefined) {
    report.error(layoutValidationMessages.alignedNeedsParentAxis('aligned'), entry)
    return
  }
  const valid = direction === 'row'
    ? ['top', 'center', 'bottom', 'baseline'].includes(word)
    : ['left', 'center', 'right'].includes(word)
  if (!valid) {
    report.error(layoutValidationMessages.invalidAligned(word, direction), entry)
    return
  }
  validateOneAlignSelf(entry, state, report)
}

function validateStretchedEntry(
  node: LayoutRenderHost,
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (values.length !== 1) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  if (parentViewDirection(node) === undefined) {
    report.error(layoutValidationMessages.alignedNeedsParentAxis('stretched'), entry)
    return
  }
  if (validateOneAlignSelf(entry, state, report)) {
    state.stretched = entry
  }
}

function validateOneAlignSelf(
  entry: AST.LayoutEntry,
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): boolean {
  if (state.alignSelf !== undefined) {
    report.error(layoutValidationMessages.duplicateProperty('alignSelf'), entry)
    return false
  }
  state.alignSelf = entry
  return true
}

function validateDimensionEntry(
  head: DimensionHead,
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (state.dimensions.has(head)) {
    report.error(layoutValidationMessages.duplicateProperty(head), entry)
    return
  }
  const dim: { entry: AST.LayoutEntry; mode?: DimensionMode; min?: number; max?: number } = { entry }
  state.dimensions.set(head, dim)
  if (values.length === 1) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  for (let i = 1; i < values.length; i++) {
    const term = values[i]!
    if (term === 'fill' || term === 'hug') {
      setDimensionMode(dim, term, entry, report)
      continue
    }
    if (term === 'min' || term === 'max') {
      const next = values[++i]
      if (!isLayoutNumber(next, true)) {
        report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
        return
      }
      validateNonNegativeNumber(`${head} ${term}`, next, entry, report)
      validatePercent(`${head} ${term}`, next, entry, report)
      if (typeof next === 'number') {
        dim[term] = next
      }
      continue
    }
    if (isLayoutNumber(term, true)) {
      validateNonNegativeNumber(head, term, entry, report)
      validatePercent(head, term, entry, report)
      setDimensionMode(dim, 'fixed', entry, report)
      continue
    }
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  if (dim.min !== undefined && dim.max !== undefined && dim.min > dim.max) {
    report.error(layoutValidationMessages.minGreaterThanMax(`${head} min`, `${head} max`), entry)
  }
}

function setDimensionMode(
  dim: { mode?: DimensionMode },
  mode: DimensionMode,
  entry: AST.LayoutEntry,
  report: Reporter<LayoutRenderHost>,
): void {
  if (dim.mode !== undefined && dim.mode !== mode) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  if (dim.mode !== undefined) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  dim.mode = mode
}

function validateBareModeEntry(
  mode: 'fill' | 'hug',
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (values.length !== 1) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  if (mode === 'fill') {
    if (state.bareFill !== undefined) {
      report.error(layoutValidationMessages.duplicateProperty('fill'), entry)
      return
    }
    state.bareFill = entry
  } else {
    if (state.bareHug !== undefined) {
      report.error(layoutValidationMessages.duplicateProperty('hug'), entry)
      return
    }
    state.bareHug = entry
  }
}

function validateGrowEntry(
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (state.grow !== undefined) {
    report.error(layoutValidationMessages.duplicateProperty('grow'), entry)
    return
  }
  state.grow = entry

  if (values.length === 1) {
    return
  }
  if (values.length !== 2 || !isLayoutNumber(values[1], false)) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  validateNonNegativeNumber('grow', values[1], entry, report)
}

function validatePressureEntry(
  head: 'compress' | 'rigid',
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (values.length !== 1) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  if (head === 'compress') {
    if (state.compress !== undefined) {
      report.error(layoutValidationMessages.duplicateProperty('compress'), entry)
      return
    }
    state.compress = entry
  } else {
    if (state.rigid !== undefined) {
      report.error(layoutValidationMessages.duplicateProperty('rigid'), entry)
      return
    }
    state.rigid = entry
  }
}

function validateSingleNumberEntry(
  head: 'gap',
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (state.gap !== undefined) {
    report.error(layoutValidationMessages.duplicateProperty(head), entry)
    return
  }
  state.gap = entry

  if (values.length !== 2 || !isLayoutNumber(values[1], false)) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  validateNonNegativeNumber(head, values[1], entry, report)
}

function validatePadEntry(
  entry: AST.LayoutEntry,
  values: TaoLayoutTermValue[],
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (state.pad !== undefined) {
    report.error(layoutValidationMessages.duplicateProperty('pad'), entry)
    return
  }
  state.pad = entry

  if (values.length === 1) {
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
  for (let i = 1; i < values.length; i++) {
    const term = values[i]!
    if (isLayoutNumber(term, false)) {
      validateNonNegativeNumber('pad', term, entry, report)
      continue
    }
    if (isPadTarget(term)) {
      const amount = values[++i]
      if (!isLayoutNumber(amount, false)) {
        report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
        return
      }
      validateNonNegativeNumber(`pad ${term}`, amount, entry, report)
      continue
    }
    report.error(layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry)
    return
  }
}

function validateClauseState(
  node: LayoutRenderHost,
  state: ClauseState,
  report: Reporter<LayoutRenderHost>,
): void {
  if (state.bareFill !== undefined && state.dimensions.size > 0) {
    report.error(layoutValidationMessages.fillWithDimension, state.bareFill)
  }
  if (state.bareHug !== undefined && state.dimensions.size > 0) {
    report.error(layoutValidationMessages.hugWithDimension, state.bareHug)
  }
  if (state.bareFill !== undefined && state.bareHug !== undefined) {
    report.error(layoutValidationMessages.fillWithHug, state.bareHug)
  }
  if (state.compress !== undefined && state.rigid !== undefined) {
    report.error(layoutValidationMessages.compressRigid, state.rigid)
  }
  const parentDirection = parentViewDirection(node)
  if (state.stretched !== undefined && parentDirection !== undefined && hasCrossAxisHug(parentDirection, state)) {
    report.error(layoutValidationMessages.stretchedHug, state.stretched)
  }
}

function hasCrossAxisHug(direction: TaoLayoutDirection, state: ClauseState): boolean {
  if (state.bareHug !== undefined) {
    return true
  }
  const crossAxis = direction === 'row' ? 'height' : 'width'
  return state.dimensions.get(crossAxis)?.mode === 'hug'
}

function validateNonNegativeNumber(
  key: string,
  value: TaoLayoutTermValue,
  entry: AST.LayoutEntry,
  report: Reporter<LayoutRenderHost>,
): void {
  if (typeof value === 'number' && value < 0) {
    report.error(layoutValidationMessages.negativeNotAllowed(key), entry)
  }
}

function validatePercent(
  key: string,
  value: TaoLayoutTermValue,
  entry: AST.LayoutEntry,
  report: Reporter<LayoutRenderHost>,
): void {
  if (!isPercentString(value)) {
    return
  }
  const percent = Number(value.replace('%', ''))
  if (percent < 0 || percent > 100) {
    report.error(layoutValidationMessages.percentOutOfRange(key), entry)
  }
}

function viewDirection(node: LayoutRenderHost): TaoLayoutDirection | undefined {
  return node.view === undefined ? undefined : standardContainerDirection(node.view.$refText)
}

function parentViewDirection(node: LayoutRenderHost): TaoLayoutDirection | undefined {
  let current: AST.Node | undefined = node.$container
  while (current !== undefined) {
    if (AST.isBlock(current)) {
      const owner = current.$container as AST.Node
      if (AST.isViewRender(owner) || AST.isRenderStatement(owner)) {
        return viewDirection(owner)
      }
      current = owner
    } else {
      current = current.$container as AST.Node | undefined
    }
  }
  return undefined
}

function unknownLayoutWordMessage(word: string): string {
  const lane = outOfLayoutWords.get(word)
  if (lane !== undefined) {
    return layoutValidationMessages.outOfLayoutWord(word, lane)
  }
  if (itemOnlyWords.has(word)) {
    return layoutValidationMessages.itemWordOutsideItems(word)
  }
  if (removedLayoutWords.has(word) || deferredLayoutWords.has(word)) {
    return layoutValidationMessages.unsupportedWord(word)
  }
  return layoutValidationMessages.unknownWord(word)
}

function isLayoutNumber(value: TaoLayoutTermValue | undefined, allowPercent: boolean): boolean {
  return typeof value === 'number' || (allowPercent && isPercentString(value))
}

function isPercentString(value: TaoLayoutTermValue | undefined): value is string {
  return typeof value === 'string' && /^-?\d+%$/.test(value)
}

function isLayoutWord(value: TaoLayoutTermValue | undefined): value is string {
  return typeof value === 'string' && !isPercentString(value)
}

function isPadTarget(value: TaoLayoutTermValue): value is string {
  return value === 'top'
    || value === 'right'
    || value === 'bottom'
    || value === 'left'
    || value === 'horizontal'
    || value === 'vertical'
}
