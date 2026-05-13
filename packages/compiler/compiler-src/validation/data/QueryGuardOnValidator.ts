import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { makeValidater } from '../ValidationReporter'
import { isUnderViewDeclaration } from './validation-utils'

/** queryGuardOnMessages are diagnostics for `guard` and app `on` statements. */
export const queryGuardOnMessages = {
  onUnsupportedEvent: (ev: string) => `Unsupported app event '${ev}' (only 'init' is supported today).`,
  guardOnlyInView: '`guard` may only appear directly inside a view body.',
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
