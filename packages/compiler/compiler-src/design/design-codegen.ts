import { CompositeGeneratorNode, type GeneratorNode } from '@compiler/codegen/codegen-util'
import type { AST } from '@parser'
import { type TaoDesignLock, type TaoDesignLockEntry } from './design-lock'
import { type TaoViewLikeDeclaration } from './variant-resolution'

export const TAO_DESIGN_MODULE_RELATIVE_PATH = 'tao-design.ts'

export type TaoDesignCodegenContext = {
  identityByNode: WeakMap<TaoViewLikeDeclaration, string>
  effectiveLock: TaoDesignLock
}

/** compileTaoDesignModule emits the generated design resolver module used by compiled Tao app files. */
export function compileTaoDesignModule(lock: TaoDesignLock): GeneratorNode {
  const styles: Record<string, unknown> = {}
  for (const entry of Object.values(lock.entries).sort((a, b) => a.identity.localeCompare(b.identity))) {
    styles[entry.resolved.styleKey] = styleSpecForEntry(entry)
  }
  const node = new CompositeGeneratorNode()
  node.append(`import { createTaoDesign, type TaoDesignInput } from './use/@tao/tao-runtime/tao-design-runtime'

const designInput = {
  styles: ${JSON.stringify(styles, null, 2)},
} satisfies TaoDesignInput

const design = createTaoDesign(designInput)

export const TaoDesignProvider = design.TaoDesignProvider
export const resolveStyle = design.resolveStyle
export const useTaoDesignContext = design.useTaoDesignContext
export const useTaoStyle = design.useTaoStyle
`)
  return node
}

/** designStyleKeyForNode returns the resolved style key for a view-like declaration, when design analysis produced one. */
export function designStyleKeyForNode(
  design: TaoDesignCodegenContext | undefined,
  node: AST.ViewDeclaration | AST.VariantDeclaration,
): string | undefined {
  const identity = design?.identityByNode.get(node)
  if (identity === undefined) {
    return undefined
  }
  return design?.effectiveLock.entries[identity]?.resolved.styleKey
}

function styleSpecForEntry(entry: TaoDesignLockEntry): Record<string, unknown> {
  const spec = {
    ...(entry.resolved.adaptations === undefined ? {} : { adaptations: entry.resolved.adaptations }),
    base: entry.resolved.baseStyle,
    ...(entry.resolved.states === undefined ? {} : { states: entry.resolved.states }),
  }
  return spec
}
