import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { makeValidater } from '../ValidationReporter'

/** queryGuardOnMessages are diagnostics for `guard` and app `on` statements. */
export const queryGuardOnMessages = {
  onUnsupportedEvent: (ev: string) => `Unsupported app event '${ev}' (only 'init' is supported today).`,
  guardOnlyInView: '`guard` may only appear directly inside a view body.',
  queryNotInViewOrFile: '`query` may only appear at file level or directly inside a view body.',
} as const

/** queryGuardOnValidator holds Langium checks for guards and app lifecycle `on` statements. */
export const queryGuardOnValidator: Pick<
  langium.ValidationChecks<AST.TaoLangAstType>,
  'OnStatement' | 'GuardStatement'
> = {
  OnStatement: makeValidater((node, report) => {
    if (node.event !== 'init') {
      report.error(queryGuardOnMessages.onUnsupportedEvent(node.event), { node, property: 'event' })
    }
  }),

  GuardStatement: makeValidater((node, report) => {
    if (!isUnderViewDeclaration(node)) {
      report.error(queryGuardOnMessages.guardOnlyInView, node)
    }
  }),
}

/** isUnderViewDeclaration returns true when `node` sits under a `view` declaration (including inside `guard`). */
export function isUnderViewDeclaration(node: AST.Node): boolean {
  let c: AST.Node | undefined = node.$container
  while (c) {
    if (AST.isViewDeclaration(c)) {
      return true
    }
    if (AST.isActionDeclaration(c) || AST.isActionExpression(c) || AST.isAppDeclaration(c)) {
      return false
    }
    c = c.$container
  }
  return false
}

/** isQueryPlacementOk allows top-level queries or queries inside a view body (not inside actions/apps). */
export function isQueryPlacementOk(node: AST.QueryDeclaration): boolean {
  if (AST.isTaoFile(node.$container)) {
    return true
  }
  return isUnderViewDeclaration(node)
}
