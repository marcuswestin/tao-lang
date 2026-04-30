import { AST } from '@parser/parser'
import { getSyntheticTypeDeclaration, owningCallableOf, resolveQualifiedLocalSyntheticType } from '../tao-type-shapes'
import { type CalleeDeclaration, getCalleeDeclaration, isCallableDeclaration } from './tao-argument-bindings'

export { getSyntheticTypeDeclaration, owningCallableOf }

/** TypeLike is the resolved identity of a typed literal's constructor type. All consumers of
 * `TypedLiteralExpression.type` must go through `typedLiteralType()` instead of reading `node.type.ref?.ref`
 * directly -- this is the only approved way to resolve a typed literal constructor type. */
export type TypeLike = {
  readonly typeDecl: AST.TypeDeclaration
  readonly identityKey: string
}

/** typeIdentityKey returns the stable qualified name used as Typir primitive key. */
export function typeIdentityKey(tl: TypeLike): string {
  return tl.identityKey
}

/** typedLiteralType resolves a TypedLiteralExpression's constructor type to a TypeLike, handling:
 * - bare `Title "x"` (NamedTypeRef, no segments)
 * - qualified `Badge.Title "x"` (NamedTypeRef with segments)
 * - dot-local `.Title "x"` (DotLocalTypeRef) */
export function typedLiteralType(node: AST.TypedLiteralExpression): TypeLike | undefined {
  if (AST.isDotLocalTypeRef(node.type)) {
    return resolveDotLocalType(node.type, node)
  }
  if (AST.isNamedTypeRef(node.type)) {
    return resolveNamedTypeRefLiteral(node.type)
  }
  return undefined
}

/** resolveDotLocalType resolves `.Title` through the enclosing argument context's callee. */
function resolveDotLocalType(
  ref: AST.DotLocalTypeRef,
  contextNode: AST.TypedLiteralExpression,
): TypeLike | undefined {
  const argCtx = findEnclosingArgumentContext(contextNode)
  if (!argCtx) {
    return undefined
  }
  if (!isCallableDeclaration(argCtx.callee)) {
    return undefined
  }
  const local = getLocalParameterType(argCtx.callee, ref.name)
  if (!local) {
    return undefined
  }
  const synth = getSyntheticTypeDeclaration(local.param)
  if (!synth) {
    return undefined
  }
  return { typeDecl: synth, identityKey: local.qualifiedName }
}

/** resolveNamedTypeRefLiteral resolves a NamedTypeRef in typed-literal position, handling both
 * bare (`Title`) and qualified (`Badge.Title`) forms. */
function resolveNamedTypeRefLiteral(ref: AST.NamedTypeRef): TypeLike | undefined {
  const decl = ref.ref?.ref
  if (!AST.isTypeDeclaration(decl)) {
    return undefined
  }
  if (ref.segments.length > 0) {
    const synth = resolveQualifiedLocalSyntheticType(ref)
    if (synth) {
      return { typeDecl: synth, identityKey: synth.name }
    }
  }
  return { typeDecl: decl, identityKey: decl.name }
}

/** EnclosingArgumentContext identifies that a node sits inside an argument list of a known callee. */
export type EnclosingArgumentContext = {
  readonly host: AST.ArgumentListHost
  readonly callee: CalleeDeclaration
}

/** findEnclosingArgumentContext walks ancestors to find the nearest ArgumentList owned by an
 * ArgumentListHost (ViewRender/ActionRender). Returns the host and resolved callee, or undefined
 * if the node is not in argument position. */
export function findEnclosingArgumentContext(node: AST.Node): EnclosingArgumentContext | undefined {
  let current: AST.Node | undefined = node.$container
  while (current) {
    if (AST.isArgumentList(current)) {
      const host = current.$container
      if (AST.isViewRender(host) || AST.isActionRender(host)) {
        const callee = getCalleeDeclaration(host)
        if (callee) {
          return { host, callee }
        }
      }
      return undefined
    }
    if (AST.isBlock(current) || AST.isTaoFile(current)) {
      return undefined
    }
    current = current.$container
  }
  return undefined
}

/** LocalParameterType describes a callable-local nominal type created by `Title is text` in a view or action parameter list. */
export type LocalParameterType = {
  readonly owner: CalleeDeclaration
  readonly param: AST.ParameterDeclaration
  readonly localName: string
  readonly qualifiedName: string
  readonly superType: AST.TypeReference
}

/** getLocalParameterTypes returns all local parameter types declared on the given callable. */
export function getLocalParameterTypes(owner: CalleeDeclaration): LocalParameterType[] {
  const params = owner.parameterList?.parameters ?? []
  const result: LocalParameterType[] = []
  for (const p of params) {
    if (p.localSuperType) {
      result.push({
        owner,
        param: p,
        localName: p.name,
        qualifiedName: `${owner.name}.${p.name}`,
        superType: p.localSuperType,
      })
    }
  }
  return result
}

/** getLocalParameterType returns the local parameter type with the given localName on the owner, or undefined. */
export function getLocalParameterType(
  owner: CalleeDeclaration,
  localName: string,
): LocalParameterType | undefined {
  const params = owner.parameterList?.parameters ?? []
  for (const p of params) {
    if (p.localSuperType && p.name === localName) {
      return {
        owner,
        param: p,
        localName: p.name,
        qualifiedName: `${owner.name}.${p.name}`,
        superType: p.localSuperType,
      }
    }
  }
  return undefined
}
