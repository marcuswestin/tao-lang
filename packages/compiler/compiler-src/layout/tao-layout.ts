import { AST } from '@parser/parser'
import type { TaoLayoutDirection } from '@shared/layout/layout-axis'

export type TaoLayoutTermValue = string | number

export type SerializedTaoLayoutSpec = {
  view: string
  parentDirection?: TaoLayoutDirection
  entries: TaoLayoutTermValue[][]
}

/** serializeLayoutClause converts a parsed layout clause into the compact runtime layout spec. */
export function serializeLayoutClause(
  viewName: string,
  clause: AST.LayoutClause,
  opts: { parentDirection?: TaoLayoutDirection } = {},
): SerializedTaoLayoutSpec {
  const spec: SerializedTaoLayoutSpec = {
    view: viewName,
    entries: clause.entries.map(entry => layoutEntryValues(entry)),
  }
  if (opts.parentDirection !== undefined) {
    spec.parentDirection = opts.parentDirection
  }
  return spec
}

/** layoutEntryValues returns every term in a layout entry as its runtime literal value. */
export function layoutEntryValues(entry: AST.LayoutEntry): TaoLayoutTermValue[] {
  return entry.terms.map(term => layoutTermValue(term))
}

/** layoutTermValue returns a layout term's string, number, or percent literal value. */
export function layoutTermValue(term: AST.LayoutTerm): TaoLayoutTermValue {
  if (AST.isLayoutWord(term)) {
    return term.value
  }
  const sign = term.negative ? -1 : 1
  if (AST.isLayoutNumberLiteral(term)) {
    return sign * term.value
  }
  return `${term.negative ? '-' : ''}${term.value}%`
}

/** layoutEntryText returns a space-joined description of a layout entry for diagnostics. */
export function layoutEntryText(entry: AST.LayoutEntry): string {
  return entry.terms.map(term => String(layoutTermValue(term))).join(' ')
}
