import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { makeValidater } from '../ValidationReporter'
import { isUnderViewDeclaration } from './QueryGuardOnValidator'

/** forCreateMessages are diagnostics for `for` and `create` data statements. */
export const forCreateMessages = {
  forOnlyInView: '`for` may only appear directly inside a view body (not at file level or inside actions).',
  forCollectionNotListQuery:
    '`for` may only iterate a collection query (use `query … get <Entity> as Alias` without `first`).',
  forCollectionNotQuery: '`for` `in` must reference a query alias declared on this file or in the same view.',
  forBodyNoQuery: '`query` is not allowed inside a `for` block (queries call React hooks; hooks may not run in loops).',
  forBodyNoGuard: '`guard` is not allowed inside a `for` block — declare it directly under the view body.',
  createOnlyInAction: '`create` may only appear inside an action body.',
  createUnknownField: (field: string) => `Unknown field '${field}' for this entity.`,
  createDuplicateField: (field: string) => `Duplicate field '${field}' in create block.`,
} as const

/** isUnderActionBody returns true when `node` is nested under an `action` declaration body. */
export function isUnderActionBody(node: AST.Node): boolean {
  let c: AST.Node | undefined = node.$container
  while (c) {
    if (AST.isActionDeclaration(c)) {
      return true
    }
    if (AST.isViewDeclaration(c) || AST.isTaoFile(c) || AST.isAppDeclaration(c)) {
      return false
    }
    c = c.$container
  }
  return false
}

/** isForStatementPlacementOk allows `for` only inside a view body (not file-level or in actions). */
export function isForStatementPlacementOk(node: AST.ForStatement): boolean {
  if (AST.isTaoFile(node.$container)) {
    return false
  }
  return isUnderViewDeclaration(node)
}

/** ForBodyHookViolation is one descendant `query` / `guard` under a `for` that would force hooks inside a loop. */
type ForBodyHookViolation = { node: AST.Node; message: string }

/** findForBodyHookViolations returns descendant `query` / `guard` nodes nested under `for` (illegal — would emit React hooks inside a loop). */
export function findForBodyHookViolations(node: AST.ForStatement): ForBodyHookViolation[] {
  const out: ForBodyHookViolation[] = []
  for (const descendant of AST.Utils.streamAllContents(node)) {
    if (AST.isQueryDeclaration(descendant)) {
      out.push({ node: descendant, message: forCreateMessages.forBodyNoQuery })
    } else if (AST.isGuardStatement(descendant)) {
      out.push({ node: descendant, message: forCreateMessages.forBodyNoGuard })
    }
  }
  return out
}

export const forCreateValidator: Pick<langium.ValidationChecks<AST.TaoLangAstType>, 'CreateStatement'> = {
  CreateStatement: makeValidater((node, report) => {
    if (AST.isTaoFile(node.$container) || !isUnderActionBody(node)) {
      report.error(forCreateMessages.createOnlyInAction, node)
    }
    const entity = node.entity.ref
    if (!entity) {
      return
    }
    const seen = new Set<string>()
    for (const f of node.fields) {
      if (seen.has(f.field)) {
        report.error(forCreateMessages.createDuplicateField(f.field), { node: f, property: 'field' })
      }
      seen.add(f.field)
      const ok = entity.fields.some(df => df.name === f.field)
      if (!ok) {
        report.error(forCreateMessages.createUnknownField(f.field), { node: f, property: 'field' })
      }
    }
  }),
}
