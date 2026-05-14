import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import {
  layoutChildWordAxis,
  layoutSpacingReactNativeKey,
  type TaoLayoutAxis,
  type TaoLayoutDirection,
} from '@shared/layout/layout-axis'
import { layoutEntryText, layoutEntryValues, type TaoLayoutTermValue } from '../layout/tao-layout'
import { makeValidater, type Reporter } from './ValidationReporter'

type ParsedLayoutEntry =
  | { kind: 'bare'; words: string[]; entry: AST.LayoutEntry }
  | { kind: 'property'; keys: string[]; head: string; values: TaoLayoutTermValue[]; entry: AST.LayoutEntry }
  | { kind: 'invalid'; message: string; entry: AST.LayoutEntry }

const directionWords = new Set(['row', 'column'])
const wrapWords = new Set(['wrap', 'nowrap'])
const childArrangementWords = new Set([
  'top',
  'right',
  'bottom',
  'left',
  'center',
  'stretch',
  'pack',
  'spread',
  'around',
  'evenly',
])
const selfAlignmentWords = new Set(['centered', 'stretched', 'packed'])
const positionWords = new Set(['relative', 'absolute'])
const numericPropertyHeads = new Set([
  'gap',
  'row_gap',
  'column_gap',
  'pad',
  'margin',
  'width',
  'height',
  'min_width',
  'max_width',
  'min_height',
  'max_height',
  'grow',
  'shrink',
  'basis',
  'z',
])
const offsetPropertyHeads = new Set(['top', 'right', 'bottom', 'left'])
const spacingSides = new Set(['horizontal', 'vertical', 'top', 'right', 'bottom', 'left'])
const nonNegativeNumberKeys = new Set([
  'gap',
  'rowGap',
  'columnGap',
  'padding',
  'paddingVertical',
  'paddingHorizontal',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'flexGrow',
  'flexShrink',
  'flexBasis',
])
const parentAxisPropertyHeads = new Set(['grow', 'shrink', 'basis'])
const percentAllowedKeys = new Set([
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'flexBasis',
  'top',
  'right',
  'bottom',
  'left',
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
const deferredLayoutWords = new Set([
  'align',
  'aligned',
  'aspect_ratio',
  'baseline',
  'border',
  'box_sizing',
  'clip',
  'display',
  'fill',
  'fixed',
  'flex',
  'flow',
  'hidden',
  'hug',
  'inset',
  'items',
  'lines',
  'overflow',
  'percent',
  'reverse',
  'self',
  'stacking',
  'start',
  'end',
  'static',
])

/** layoutValidationMessages holds stable user-facing diagnostics for layout v1. */
export const layoutValidationMessages = {
  numericHead: 'Layout entries must start with a layout word.',
  unknownWord: (word: string) => `Unknown layout word '${word}'.`,
  wordMustBeLowercase: (word: string) => `Layout word '${word}' must be lowercase.`,
  outOfLayoutWord: (word: string, lane: string) => `Layout word '${word}' belongs to ${lane}, not layout.`,
  unsupportedWord: (word: string) => `Layout word '${word}' is not supported in layout v1.`,
  malformedEntry: (entry: string) => `Malformed layout entry '${entry}'.`,
  duplicateProperty: (key: string) => `Duplicate layout property '${key}'.`,
  mixedDirection: (first: string, second: string) => `Layout direction '${second}' conflicts with '${first}'.`,
  mixedWrap: (first: string, second: string) => `Layout wrap '${second}' conflicts with '${first}'.`,
  mixedPosition: (first: string, second: string) => `Layout position '${second}' conflicts with '${first}'.`,
  childArrangementNeedsDirection: (words: string) =>
    `Child layout word(s) '${words}' require a Row/Col view or an explicit row/column layout direction.`,
  childAxisConflict: (word: string, existing: string, direction: TaoLayoutDirection, axis: TaoLayoutAxis) =>
    `Layout word '${word}' conflicts with '${existing}' on the ${direction} ${axis} axis.`,
  selfNeedsParentAxis: (word: string) =>
    `Self layout word '${word}' requires a Row/Col parent or an explicit parent row/column direction.`,
  offsetNeedsPosition: (word: string) =>
    `Layout offset '${word}' requires 'absolute' or 'relative' in the same layout clause.`,
  negativeNotAllowed: (key: string) => `Layout property '${key}' does not allow negative values.`,
  percentOutOfRange: (key: string) => `Layout property '${key}' percent values must be between 0 and 100.`,
  percentNotAllowed: (key: string) => `Layout property '${key}' does not accept percent values.`,
  minGreaterThanMax: (minKey: string, maxKey: string) => `Layout '${minKey}' cannot be greater than '${maxKey}'.`,
  overConstrainedAxis: (sizeKey: string, firstOffset: string, secondOffset: string) =>
    `Layout '${sizeKey}' conflicts with both '${firstOffset}' and '${secondOffset}' offsets.`,
} as const

export const layoutValidator: Pick<langium.ValidationChecks<AST.TaoLangAstType>, 'ViewRender'> = {
  ViewRender: makeValidater((node, report) => {
    validateViewRenderLayout(node, report)
  }),
}

/** validateViewRenderLayout validates a render-site `[ ... ]` layout clause. */
function validateViewRenderLayout(node: AST.ViewRender, report: Reporter<AST.ViewRender>): void {
  const clause = node.layoutClause
  if (clause === undefined) {
    return
  }
  if (clause.entries.length === 0) {
    return
  }

  const parsed = clause.entries.map(parseLayoutEntry)
  for (const entry of parsed) {
    if (entry.kind === 'invalid') {
      report.error(entry.message, entry.entry)
    }
  }

  validateDuplicateProperties(parsed, report)
  validateBareWords(node, parsed, report)
  validateNumericValues(parsed, report)
  validatePositionOffsets(parsed, report)
}

function parseLayoutEntry(entry: AST.LayoutEntry): ParsedLayoutEntry {
  const values = layoutEntryValues(entry)
  const head = values[0]
  if (head === undefined) {
    return { kind: 'bare', words: [], entry }
  }
  if (typeof head !== 'string') {
    return { kind: 'invalid', message: layoutValidationMessages.numericHead, entry }
  }
  if (head !== head.toLowerCase()) {
    return { kind: 'invalid', message: layoutValidationMessages.wordMustBeLowercase(head), entry }
  }

  if (values.every(isStringValue)) {
    const words = values.filter(isStringValue)
    const invalidWord = words.find(word => !isKnownBareWord(word))
    if (invalidWord !== undefined) {
      return { kind: 'invalid', message: unknownLayoutWordMessage(invalidWord), entry }
    }
    return { kind: 'bare', words, entry }
  }

  if (offsetPropertyHeads.has(head)) {
    return parseSingleValueProperty(head, [head], values, entry, true)
  }
  if (head === 'pad' || head === 'margin') {
    return parseSpacingProperty(head, values, entry)
  }
  if (numericPropertyHeads.has(head)) {
    const keys = runtimeKeysForSimpleProperty(head)
    return parseSingleValueProperty(head, keys, values, entry, keys.some(key => percentAllowedKeys.has(key)))
  }
  return { kind: 'invalid', message: unknownLayoutWordMessage(head), entry }
}

function parseSingleValueProperty(
  head: string,
  keys: string[],
  values: TaoLayoutTermValue[],
  entry: AST.LayoutEntry,
  allowPercent: boolean,
): ParsedLayoutEntry {
  if (values.length !== 2 || !isLayoutNumber(values[1], allowPercent)) {
    return { kind: 'invalid', message: layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry }
  }
  return { kind: 'property', keys, head, values: [values[1]], entry }
}

function parseSpacingProperty(
  head: 'pad' | 'margin',
  values: TaoLayoutTermValue[],
  entry: AST.LayoutEntry,
): ParsedLayoutEntry {
  if (values.length === 2 && isLayoutNumber(values[1], false)) {
    return { kind: 'property', keys: [layoutSpacingReactNativeKey(head, 'all')], head, values: [values[1]], entry }
  }
  if (values.length === 3 && isLayoutNumber(values[1], false) && isLayoutNumber(values[2], false)) {
    return {
      kind: 'property',
      keys: [layoutSpacingReactNativeKey(head, 'vertical'), layoutSpacingReactNativeKey(head, 'horizontal')],
      head,
      values: [values[1], values[2]],
      entry,
    }
  }
  if (
    values.length === 3
    && isStringValue(values[1])
    && spacingSides.has(values[1])
    && isLayoutNumber(values[2], false)
  ) {
    return { kind: 'property', keys: [layoutSpacingReactNativeKey(head, values[1])], head, values: [values[2]], entry }
  }
  return { kind: 'invalid', message: layoutValidationMessages.malformedEntry(layoutEntryText(entry)), entry }
}

function validateDuplicateProperties(
  parsed: readonly ParsedLayoutEntry[],
  report: Reporter<AST.ViewRender>,
): void {
  const seen = new Map<string, AST.LayoutEntry>()
  for (const entry of parsed) {
    if (entry.kind !== 'property') {
      continue
    }
    for (const key of entry.keys) {
      if (seen.has(key)) {
        report.error(layoutValidationMessages.duplicateProperty(key), entry.entry)
      } else {
        seen.set(key, entry.entry)
      }
    }
  }
}

function validateBareWords(
  node: AST.ViewRender,
  parsed: readonly ParsedLayoutEntry[],
  report: Reporter<AST.ViewRender>,
): void {
  let direction: TaoLayoutDirection | undefined
  let wrap: string | undefined
  let position: string | undefined
  let selfWord: string | undefined
  const childWords: string[] = []
  const selfAxisWords: string[] = []

  for (const entry of parsed) {
    if (entry.kind === 'property' && parentAxisPropertyHeads.has(entry.head)) {
      selfAxisWords.push(entry.head)
    }
    if (entry.kind !== 'bare') {
      continue
    }
    for (const word of entry.words) {
      if (word === 'row' || word === 'column') {
        if (direction !== undefined && direction !== word) {
          report.error(layoutValidationMessages.mixedDirection(direction, word), entry.entry)
        }
        direction = word
      } else if (wrapWords.has(word)) {
        if (wrap !== undefined && wrap !== word) {
          report.error(layoutValidationMessages.mixedWrap(wrap, word), entry.entry)
        }
        wrap = word
      } else if (positionWords.has(word)) {
        if (position !== undefined && position !== word) {
          report.error(layoutValidationMessages.mixedPosition(position, word), entry.entry)
        }
        position = word
      } else if (selfAlignmentWords.has(word)) {
        if (selfWord !== undefined && selfWord !== word) {
          report.error(layoutValidationMessages.duplicateProperty('alignSelf'), entry.entry)
        }
        selfWord = word
        selfAxisWords.push(word)
      } else if (childArrangementWords.has(word)) {
        childWords.push(word)
      }
    }
  }

  if (childWords.length > 0) {
    const containerDirection = layoutDirectionForViewRender(node)
    if (containerDirection === undefined) {
      report.error(layoutValidationMessages.childArrangementNeedsDirection(childWords.join(' ')), node.layoutClause)
    } else {
      validateChildAxisConflicts(childWords, containerDirection, node.layoutClause, report)
    }
  }

  if (selfAxisWords.length > 0 && parentLayoutDirection(node) === undefined) {
    report.error(layoutValidationMessages.selfNeedsParentAxis(selfAxisWords[0]!), node.layoutClause)
  }
}

function validateChildAxisConflicts(
  words: readonly string[],
  direction: TaoLayoutDirection,
  clause: AST.LayoutClause | undefined,
  report: Reporter<AST.ViewRender>,
): void {
  let mainWord: string | undefined
  let crossWord: string | undefined
  let centerCount = 0

  const setAxis = (axis: TaoLayoutAxis, word: string) => {
    if (axis === 'main') {
      if (mainWord !== undefined) {
        report.error(layoutValidationMessages.childAxisConflict(word, mainWord, direction, axis), clause)
      }
      mainWord = word
      return
    }
    if (crossWord !== undefined) {
      report.error(layoutValidationMessages.childAxisConflict(word, crossWord, direction, axis), clause)
    }
    crossWord = word
  }

  for (const word of words) {
    if (word === 'center') {
      centerCount++
      continue
    }
    setAxis(layoutChildWordAxis(word, direction), word)
  }
  for (let i = 0; i < centerCount; i++) {
    if (mainWord === undefined && crossWord === undefined) {
      mainWord = 'center'
      crossWord = 'center'
    } else if (mainWord !== undefined && crossWord === undefined) {
      crossWord = 'center'
    } else if (mainWord === undefined && crossWord !== undefined) {
      mainWord = 'center'
    } else {
      report.error(layoutValidationMessages.childAxisConflict('center', mainWord!, direction, 'main'), clause)
    }
  }
}

function validateNumericValues(
  parsed: readonly ParsedLayoutEntry[],
  report: Reporter<AST.ViewRender>,
): void {
  const numericByKey = new Map<string, number>()

  for (const entry of parsed) {
    if (entry.kind !== 'property') {
      continue
    }
    entry.keys.forEach((key, idx) => {
      const value = entry.values[Math.min(idx, entry.values.length - 1)]
      if (value === undefined) {
        return
      }
      if (typeof value === 'string') {
        if (!percentAllowedKeys.has(key)) {
          report.error(layoutValidationMessages.percentNotAllowed(key), entry.entry)
          return
        }
        const percent = Number(value.replace('%', ''))
        if (percent < 0 || percent > 100) {
          report.error(layoutValidationMessages.percentOutOfRange(key), entry.entry)
        }
        return
      }
      if (nonNegativeNumberKeys.has(key) && value < 0) {
        report.error(layoutValidationMessages.negativeNotAllowed(key), entry.entry)
      }
      numericByKey.set(key, value)
    })
  }

  validateMinMax(numericByKey, parsed, 'minWidth', 'maxWidth', report)
  validateMinMax(numericByKey, parsed, 'minHeight', 'maxHeight', report)
}

function validatePositionOffsets(
  parsed: readonly ParsedLayoutEntry[],
  report: Reporter<AST.ViewRender>,
): void {
  const offsetKeys = new Set<string>()
  const propertyKeys = new Set<string>()
  let hasPositionMode = false
  for (const entry of parsed) {
    if (entry.kind === 'bare' && entry.words.some(word => positionWords.has(word))) {
      hasPositionMode = true
    }
    if (entry.kind === 'property') {
      for (const key of entry.keys) {
        propertyKeys.add(key)
        if (offsetPropertyHeads.has(key)) {
          offsetKeys.add(key)
        }
      }
    }
  }

  if (offsetKeys.size > 0 && !hasPositionMode) {
    for (const key of offsetKeys) {
      report.error(layoutValidationMessages.offsetNeedsPosition(key), reportLocationForProperty(parsed, key))
    }
  }
  if (propertyKeys.has('width') && offsetKeys.has('left') && offsetKeys.has('right')) {
    report.error(
      layoutValidationMessages.overConstrainedAxis('width', 'left', 'right'),
      reportLocationForProperty(parsed, 'width'),
    )
  }
  if (propertyKeys.has('height') && offsetKeys.has('top') && offsetKeys.has('bottom')) {
    report.error(
      layoutValidationMessages.overConstrainedAxis('height', 'top', 'bottom'),
      reportLocationForProperty(parsed, 'height'),
    )
  }
}

function validateMinMax(
  values: ReadonlyMap<string, number>,
  parsed: readonly ParsedLayoutEntry[],
  minKey: string,
  maxKey: string,
  report: Reporter<AST.ViewRender>,
): void {
  const min = values.get(minKey)
  const max = values.get(maxKey)
  if (min !== undefined && max !== undefined && min > max) {
    const maxEntry = reportLocationForProperty(parsed, maxKey)
    const minEntry = reportLocationForProperty(parsed, minKey)
    report.error(layoutValidationMessages.minGreaterThanMax(minKey, maxKey), maxEntry ?? minEntry)
  }
}

function reportLocationForProperty(
  parsed: readonly ParsedLayoutEntry[],
  key: string,
): AST.LayoutEntry | undefined {
  const entry = parsed.find(candidate => candidate.kind === 'property' && candidate.keys.includes(key))
  return entry?.entry
}

function layoutDirectionForViewRender(node: AST.ViewRender): TaoLayoutDirection | undefined {
  const explicit = explicitLayoutDirection(node.layoutClause)
  if (explicit !== undefined) {
    return explicit
  }
  const view = node.view.ref
  if (AST.isViewDeclaration(view)) {
    if (view.name === 'Row') {
      return 'row'
    }
    if (view.name === 'Col') {
      return 'column'
    }
  }
  return undefined
}

function parentLayoutDirection(node: AST.ViewRender): TaoLayoutDirection | undefined {
  let current: AST.Node | undefined = node.$container
  while (current !== undefined) {
    if (AST.isBlock(current)) {
      const owner = current.$container as AST.Node
      if (AST.isViewRender(owner)) {
        return layoutDirectionForViewRender(owner)
      }
      current = owner
    } else {
      current = current.$container as AST.Node | undefined
    }
  }
  return undefined
}

function explicitLayoutDirection(clause: AST.LayoutClause | undefined): TaoLayoutDirection | undefined {
  if (clause === undefined) {
    return undefined
  }
  for (const entry of clause.entries) {
    for (const value of layoutEntryValues(entry)) {
      if (value === 'row' || value === 'column') {
        return value
      }
    }
  }
  return undefined
}

function runtimeKeysForSimpleProperty(head: string): string[] {
  switch (head) {
    case 'row_gap':
      return ['rowGap']
    case 'column_gap':
      return ['columnGap']
    case 'min_width':
      return ['minWidth']
    case 'max_width':
      return ['maxWidth']
    case 'min_height':
      return ['minHeight']
    case 'max_height':
      return ['maxHeight']
    case 'grow':
      return ['flexGrow']
    case 'shrink':
      return ['flexShrink']
    case 'basis':
      return ['flexBasis']
    case 'z':
      return ['zIndex']
    default:
      return [head]
  }
}

function isKnownBareWord(word: string): boolean {
  return directionWords.has(word)
    || wrapWords.has(word)
    || childArrangementWords.has(word)
    || selfAlignmentWords.has(word)
    || positionWords.has(word)
}

function unknownLayoutWordMessage(word: string): string {
  const lane = outOfLayoutWords.get(word)
  if (lane !== undefined) {
    return layoutValidationMessages.outOfLayoutWord(word, lane)
  }
  if (deferredLayoutWords.has(word)) {
    return layoutValidationMessages.unsupportedWord(word)
  }
  return layoutValidationMessages.unknownWord(word)
}

function isLayoutNumber(value: TaoLayoutTermValue, allowPercent: boolean): boolean {
  return typeof value === 'number' || (allowPercent && isPercentString(value))
}

function isPercentString(value: TaoLayoutTermValue): value is string {
  return typeof value === 'string' && /^-?\d+%$/.test(value)
}

function isStringValue(value: TaoLayoutTermValue): value is string {
  return typeof value === 'string' && !isPercentString(value)
}
