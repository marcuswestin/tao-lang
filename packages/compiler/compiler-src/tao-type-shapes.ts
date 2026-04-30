import { AST } from '@parser/parser'
import { switch_safe } from '@shared'
import type { CalleeDeclaration } from './typing/tao-argument-bindings'
import { typedLiteralType } from './typing/tao-local-parameter-types'

/** ResolvedTypeKind classifies a `TypeExpression` after walking through named-type refs.
 * - `primitive` carries the underlying `PrimitiveType` keyword (`text`, `number`, …).
 * - `struct` carries the declared `StructTypeExpression`.
 * - `unresolved` covers cycles, missing refs, and segmented paths that don't land on a struct field. */
export type ResolvedTypeKind =
  | { readonly kind: 'primitive'; readonly primitive: AST.PrimitiveType; readonly nominalDecl?: AST.TypeDeclaration }
  | { readonly kind: 'struct'; readonly struct: AST.StructTypeExpression; readonly nominalDecl?: AST.TypeDeclaration }
  | { readonly kind: 'unresolved' }

const UNRESOLVED: ResolvedTypeKind = { kind: 'unresolved' }

/** resolveTypeExpression follows a `TypeExpression` (or `TypeReference`) through any named refs and nested segments
 * to a primitive keyword or a struct shape. Returns `unresolved` when the chain breaks (cycle, dangling reference,
 * or a path segment that doesn't match a struct field). */
export function resolveTypeExpression(
  expr: AST.TypeExpression | AST.TypeReference | undefined,
  seen: Set<AST.TypeDeclaration> = new Set(),
): ResolvedTypeKind {
  if (expr === undefined) {
    return UNRESOLVED
  }
  return switch_safe.type(expr, {
    PrimitiveTypeRef: (n) => ({ kind: 'primitive' as const, primitive: n.primitive }),
    StructTypeExpression: (n) => ({ kind: 'struct' as const, struct: n }),
    NamedTypeRef: (n) => resolveNamedTypeRef(n, seen),
  })
}

/** resolveNamedTypeRef walks e.g `Person` / `Person.Job` references to a primitive or struct shape.
 * When `segments` is non-empty, each step must descend into a struct field whose declared type is itself a
 * struct (so `Person.Job` lands on the nested `Job` struct shape).
 * Also handles qualified local parameter types: `Badge.Title` where `Badge` is a callable-owner synthetic
 * TypeDeclaration with exactly one segment resolves to the local parameter type's synthetic TypeDeclaration. */
function resolveNamedTypeRef(node: AST.NamedTypeRef, seen: Set<AST.TypeDeclaration>): ResolvedTypeKind {
  const decl = node.ref?.ref
  if (!AST.isTypeDeclaration(decl) || seen.has(decl)) {
    return UNRESOLVED
  }

  if (node.segments.length === 1) {
    const localType = resolveQualifiedLocalParameterType(node)
    if (localType) {
      return localType
    }
  }

  seen.add(decl)
  const baseResolved = resolveTypeExpression(decl.base, seen)
  if (node.segments.length === 0) {
    return tagWithDeclaration(baseResolved, decl)
  }
  if (baseResolved.kind !== 'struct') {
    return UNRESOLVED
  }
  return resolveStructPath(baseResolved.struct, node.segments)
}

/** findQualifiedLocalParam finds the ParameterDeclaration for a qualified `Badge.Title` NamedTypeRef. */
function findQualifiedLocalParam(node: AST.NamedTypeRef): AST.ParameterDeclaration | undefined {
  if (node.segments.length !== 1) {
    return undefined
  }
  const ownerName = node.ref?.$refText
  const localName = node.segments[0]!
  if (!ownerName) {
    return undefined
  }
  const taoFile = findTaoFile(node)
  if (!taoFile) {
    return undefined
  }
  const callableDecl = findCallableDeclarationByName(taoFile, ownerName)
  if (!callableDecl) {
    return undefined
  }
  const param = callableDecl.parameterList?.parameters.find(
    p => p.localSuperType && p.name === localName,
  )
  return param?.localSuperType ? param : undefined
}

/** resolveQualifiedLocalParameterType handles `Badge.Title` where `Badge` resolves to a callable (view or
 * action) with a local parameter type `Title`. Returns the resolved type tagged with the synthetic TypeDeclaration. */
function resolveQualifiedLocalParameterType(node: AST.NamedTypeRef): ResolvedTypeKind | undefined {
  const param = findQualifiedLocalParam(node)
  if (!param?.localSuperType) {
    return undefined
  }
  const synth = getSyntheticTypeDeclaration(param)
  if (!synth) {
    return undefined
  }
  return tagWithDeclaration(resolveTypeExpression(param.localSuperType), synth)
}

/** resolveQualifiedLocalSyntheticType returns the synthetic TypeDeclaration for a qualified `Badge.Title`
 * NamedTypeRef, or undefined if it's not a qualified local parameter type. */
export function resolveQualifiedLocalSyntheticType(node: AST.NamedTypeRef): AST.TypeDeclaration | undefined {
  const param = findQualifiedLocalParam(node)
  if (!param) {
    return undefined
  }
  return getSyntheticTypeDeclaration(param)
}

/** findTaoFile returns the TaoFile root of a node's AST tree, or undefined. */
function findTaoFile(node: AST.Node): AST.TaoFile | undefined {
  const root = AST.Utils.findRootNode(node)
  return AST.isTaoFile(root) ? root : undefined
}

/** findCallableDeclarationByName searches top-level statements for a view or action declaration with the given name. */
function findCallableDeclarationByName(taoFile: AST.TaoFile, name: string): CalleeDeclaration | undefined {
  for (const stmt of taoFile.statements) {
    if ((AST.isViewDeclaration(stmt) || AST.isActionDeclaration(stmt)) && stmt.name === name) {
      return stmt
    }
    if (AST.isModuleDeclaration(stmt)) {
      const decl = stmt.declaration
      if ((AST.isViewDeclaration(decl) || AST.isActionDeclaration(decl)) && decl.name === name) {
        return decl
      }
    }
  }
  return undefined
}

/** resolveStructPath descends a struct shape through field names, returning the resolved type at the leaf. */
function resolveStructPath(
  struct: AST.StructTypeExpression,
  segments: readonly string[],
): ResolvedTypeKind {
  const leaf = typeExpressionAtStructFieldPath(struct, segments)
  if (leaf === undefined) {
    return UNRESOLVED
  }
  return resolveTypeExpression(leaf)
}

/** tagWithDeclaration attaches the originating `TypeDeclaration` to a resolved kind, so callers can recover the
 * nominal name for diagnostics or Typir lookup keys. */
function tagWithDeclaration(resolved: ResolvedTypeKind, decl: AST.TypeDeclaration): ResolvedTypeKind {
  if (resolved.kind === 'primitive') {
    return { kind: 'primitive', primitive: resolved.primitive, nominalDecl: decl }
  }
  if (resolved.kind === 'struct') {
    return { kind: 'struct', struct: resolved.struct, nominalDecl: decl }
  }
  return resolved
}

/** structShapeOfDeclaredType returns the struct shape declared by `decl`, walking through aliasing types. */
export function structShapeOfDeclaredType(decl: AST.TypeDeclaration): AST.StructTypeExpression | undefined {
  const resolved = resolveTypeExpression(decl.base)
  return resolved.kind === 'struct' ? resolved.struct : undefined
}

/** primitiveBaseOfDeclaredType returns the underlying primitive keyword for `type X is text` / `type Y is X`,
 * walking through nominal aliases. Returns `undefined` for struct-based or unresolved types. */
export function primitiveBaseOfDeclaredType(decl: AST.TypeDeclaration): AST.PrimitiveType | undefined {
  const resolved = resolveTypeExpression(decl.base)
  return resolved.kind === 'primitive' ? resolved.primitive : undefined
}

/** parameterName returns the user-visible binding name for a parameter. Always `p.name` — exists on both
 * explicit (`Name text`) and shorthand (`Title`) forms because the grammar uses `name=ID`. */
export function parameterName(param: AST.ParameterDeclaration): string {
  return param.name
}

/** parameterResolvedType resolves a parameter's declared type to a `ResolvedTypeKind`. For the explicit
 * form (`Name text`), this walks `param.type`. For the local-super-type form (`Title is text`), this
 * walks `param.localSuperType` and tags with the synthetic TypeDeclaration. For the shorthand form
 * (bare `Title`), this looks up `param.name` as a lexical `TypeDeclaration`. */
export function parameterResolvedType(param: AST.ParameterDeclaration): ResolvedTypeKind {
  if (param.type) {
    return resolveTypeExpression(param.type)
  }
  if (param.localSuperType) {
    const synth = getSyntheticTypeDeclaration(param)
    if (!synth) {
      return UNRESOLVED
    }
    return tagWithDeclaration(resolveTypeExpression(param.localSuperType), synth)
  }
  const decl = resolveShorthandParameterType(param)
  if (decl === undefined) {
    return UNRESOLVED
  }
  return tagWithDeclaration(resolveTypeExpression(decl.base), decl)
}

/** resolveShorthandParameterType finds the `TypeDeclaration` that a shorthand parameter (no explicit `type`)
 * references by name. Returns `undefined` if not found or if the parameter has an explicit type. */
export function resolveShorthandParameterType(param: AST.ParameterDeclaration): AST.TypeDeclaration | undefined {
  if (param.type || param.localSuperType) {
    return undefined
  }
  return findLexicalTypeDeclaration(param, param.name)
}

/** findLexicalTypeDeclaration walks enclosing scopes (blocks, files, module declarations) for a
 * TypeDeclaration with the given name. */
export function findLexicalTypeDeclaration(node: AST.Node, name: string): AST.TypeDeclaration | undefined {
  let current: AST.Node | undefined = node.$container
  while (current) {
    if (AST.isTaoFile(current)) {
      for (const stmt of current.statements) {
        if (AST.isTypeDeclaration(stmt) && stmt.name === name) {
          return stmt
        }
        if (
          AST.isModuleDeclaration(stmt) && AST.isTypeDeclaration(stmt.declaration) && stmt.declaration.name === name
        ) {
          return stmt.declaration
        }
      }
    }
    if (AST.isBlock(current)) {
      for (const stmt of current.statements) {
        if (AST.isTypeDeclaration(stmt) && stmt.name === name) {
          return stmt
        }
      }
    }
    current = current.$container
  }
  return undefined
}

/** parameterTypeName returns the user-visible type name for a parameter for diagnostics. For explicit
 * parameters, shows the primitive keyword or named type. For local-super-type parameters (`Title is text`),
 * shows the qualified name `Owner.Param`. For shorthand parameters, shows the parameter name. */
export function parameterTypeName(param: AST.ParameterDeclaration): string {
  if (param.type) {
    return switch_safe.type(param.type, {
      PrimitiveTypeRef: (n) => n.primitive,
      NamedTypeRef: (n) => {
        const head = n.ref?.$refText ?? '<unknown>'
        return n.segments.length === 0 ? head : `${head}.${n.segments.join('.')}`
      },
    })
  }
  if (param.localSuperType) {
    const owner = owningCallableOf(param)
    return owner ? `${owner.name}.${param.name}` : param.name
  }
  return param.name
}

/** structFieldTypeAt returns the type expression of `struct.<key>`, or `undefined` when the field is missing. */
export function structFieldTypeAt(struct: AST.StructTypeExpression, key: string): AST.TypeExpression | undefined {
  return struct.fields.find(f => f.name === key)?.type
}

/** typeExpressionAtStructFieldPath walks a struct shape along `path` (member names or named-type segments).
 * Returns the declared `TypeExpression` at the leaf field, or `undefined` when a segment is missing or an
 * intermediate field is not a nested struct. */
export function typeExpressionAtStructFieldPath(
  struct: AST.StructTypeExpression,
  path: readonly string[],
): AST.TypeExpression | undefined {
  if (path.length === 0) {
    return undefined
  }
  let current: AST.StructTypeExpression | undefined = struct

  for (let i = 0; i < path.length; i++) {
    const key = path[i]!
    if (current === undefined) {
      return undefined
    }
    const fieldType = structFieldTypeAt(current, key)
    if (fieldType === undefined) {
      return undefined
    }
    if (i === path.length - 1) {
      return fieldType
    }
    const fieldResolved = resolveTypeExpression(fieldType)
    if (fieldResolved.kind !== 'struct') {
      return undefined
    }
    current = fieldResolved.struct
  }
  return undefined
}

/** structShapeOfTypedLiteral returns the declared struct shape behind a `Person { … }` typed literal,
 * or `undefined` when the typed-literal target isn't a struct type. Handles NamedTypeRef (bare and
 * qualified) and DotLocalTypeRef constructor heads via `typedLiteralType()`. */
export function structShapeOfTypedLiteral(
  node: AST.TypedLiteralExpression,
): AST.StructTypeExpression | undefined {
  const tl = typedLiteralType(node)
  if (!tl) {
    return undefined
  }
  return structShapeOfDeclaredType(tl.typeDecl)
}

/** declaredStructShapeOfExpr returns the struct shape that `expr` statically resolves to via a typed struct
 * literal, walking through alias chains. Object literals lacking a typed-literal wrapper still surface as a
 * shape via `staticObjectShapeOf`; this helper returns the wrapped declared form for nominal field-access. */
export function declaredStructShapeOfExpr(
  expr: AST.Expression | AST.ObjectLiteral | undefined,
  seen: Set<AST.AssignmentDeclaration> = new Set(),
): AST.StructTypeExpression | undefined {
  if (expr === undefined) {
    return undefined
  }
  if (AST.isObjectLiteral(expr)) {
    return undefined
  }
  if (AST.isTypedLiteralExpression(expr)) {
    return structShapeOfTypedLiteral(expr)
  }
  if (AST.isMemberAccessExpression(expr)) {
    const decl = expr.root.ref
    if (!AST.isAssignmentDeclaration(decl) || seen.has(decl)) {
      return undefined
    }
    seen.add(decl)
    const rootStruct = declaredStructShapeOfExpr(decl.value, seen)
    if (rootStruct === undefined) {
      return undefined
    }
    return walkStructByPath(rootStruct, expr.properties)
  }
  return undefined
}

/** walkStructByPath descends a struct shape through a `.prop` chain, returning the leaf struct shape (when the
 * resolved leaf type is itself a struct), or `undefined` when the path leaves the struct world. */
function walkStructByPath(
  struct: AST.StructTypeExpression,
  path: readonly string[],
): AST.StructTypeExpression | undefined {
  if (path.length === 0) {
    return struct
  }
  const leafType = typeExpressionAtStructFieldPath(struct, path)
  if (leafType === undefined) {
    return undefined
  }
  const resolved = resolveTypeExpression(leafType)
  return resolved.kind === 'struct' ? resolved.struct : undefined
}

/** owningCallableOf returns the view/action declaration that owns a ParameterDeclaration, or undefined. */
export function owningCallableOf(param: AST.ParameterDeclaration): CalleeDeclaration | undefined {
  const paramList = param.$container
  if (!AST.isParameterList(paramList)) {
    return undefined
  }
  const parent = paramList.$container
  if (AST.isViewDeclaration(parent) || AST.isActionDeclaration(parent)) {
    return parent
  }
  return undefined
}

/** createSyntheticTypeDeclaration builds a minimal TypeDeclaration-compatible object for scope
 * resolution and Typir registration. The `$document` getter is lazily derived from `anchorNode`. */
export function createSyntheticTypeDeclaration(opts: {
  name: string
  base: AST.TypeExpression
  container: AST.Node
  cstNode: AST.Node['$cstNode']
  anchorNode: AST.Node
}): AST.TypeDeclaration {
  const synthetic = {
    $type: 'TypeDeclaration' as const,
    name: opts.name,
    base: opts.base,
    $container: opts.container,
    $containerProperty: 'statements',
    $containerIndex: undefined,
    $cstNode: opts.cstNode,
  } as unknown as AST.TypeDeclaration

  Object.defineProperty(synthetic, '$document', {
    get: () => {
      try {
        return AST.Utils.findRootNode(opts.anchorNode)?.$document
      } catch {
        return undefined
      }
    },
  })

  return synthetic
}

const syntheticTypeCache = new WeakMap<AST.ParameterDeclaration, AST.TypeDeclaration>()

/** getSyntheticTypeDeclaration returns a stable synthetic TypeDeclaration-compatible object for a
 * local parameter type (`Title is text`). The qualified name (`Badge.Title`) is used as `name` so
 * Typir registration keys are unique across views. The same object is returned for the same
 * ParameterDeclaration across all passes — Typir registration, fingerprinting, and equality checks
 * depend on this stable identity. */
export function getSyntheticTypeDeclaration(param: AST.ParameterDeclaration): AST.TypeDeclaration | undefined {
  if (!param.localSuperType) {
    return undefined
  }
  const cached = syntheticTypeCache.get(param)
  if (cached) {
    return cached
  }

  const owner = owningCallableOf(param)
  if (!owner) {
    return undefined
  }

  const qualifiedName = `${owner.name}.${param.name}`
  const synthetic = createSyntheticTypeDeclaration({
    name: qualifiedName,
    base: param.localSuperType as AST.TypeExpression,
    container: param.$container?.$container ?? param.$container,
    cstNode: param.$cstNode,
    anchorNode: param,
  })

  syntheticTypeCache.set(param, synthetic)
  return synthetic
}
