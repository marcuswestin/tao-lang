import { AST } from '@parser'

export type TaoViewLikeDeclaration = AST.ViewDeclaration | AST.VariantDeclaration

/** isViewLikeDeclaration returns true for declarations that can be rendered as views. */
export function isViewLikeDeclaration(node: unknown): node is TaoViewLikeDeclaration {
  return AST.isViewDeclaration(node) || AST.isVariantDeclaration(node)
}

/** resolveVariantTargetView returns the ultimate view target of a view or variant declaration. */
export function resolveVariantTargetView(node: TaoViewLikeDeclaration | undefined): AST.ViewDeclaration | undefined {
  if (node === undefined) {
    return undefined
  }
  if (AST.isViewDeclaration(node)) {
    return node
  }
  const seen = new Set<AST.VariantDeclaration>()
  let current: AST.Referenceable | undefined = node
  while (AST.isVariantDeclaration(current)) {
    if (seen.has(current)) {
      return undefined
    }
    seen.add(current)
    current = current.target.ref
  }
  return AST.isViewDeclaration(current) ? current : undefined
}

/** variantTargetChain returns a variant's target chain, including the variant itself and the ultimate view when resolved. */
export function variantTargetChain(node: TaoViewLikeDeclaration): TaoViewLikeDeclaration[] {
  const out: TaoViewLikeDeclaration[] = []
  const seen = new Set<AST.VariantDeclaration>()
  let current: TaoViewLikeDeclaration | undefined = node
  while (current !== undefined) {
    out.push(current)
    if (AST.isViewDeclaration(current)) {
      break
    }
    if (seen.has(current)) {
      break
    }
    seen.add(current)
    const next: AST.Referenceable | undefined = current.target.ref
    current = isViewLikeDeclaration(next) ? next : undefined
  }
  return out
}

/** variantHasCycle returns true when a variant target chain loops back on itself. */
export function variantHasCycle(node: AST.VariantDeclaration): boolean {
  const seen = new Set<AST.VariantDeclaration>()
  let current: AST.Referenceable | undefined = node
  while (AST.isVariantDeclaration(current)) {
    if (seen.has(current)) {
      return true
    }
    seen.add(current)
    current = current.target.ref
  }
  return false
}
