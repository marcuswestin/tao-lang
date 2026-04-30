import { AST } from '@parser/parser'
import { staticObjectShapeOf } from '../static-object-shape'
import {
  declaredStructShapeOfExpr,
  parameterName,
  parameterResolvedType,
  parameterTypeName,
  type ResolvedTypeKind,
  resolveTypeExpression,
  structShapeOfDeclaredType,
  typeExpressionAtStructFieldPath,
} from '../tao-type-shapes'
import { typedLiteralType } from './tao-local-parameter-types'

/** Extension checklist — keep every **argument-list call host** aligned when you add one (e.g. `FunctionCall`):
 * 1. **Grammar** — `packages/parser/tao-grammar.langium`: extend `ArgumentListHost` and callee cross-ref shape.
 * 2. **Resolver** — this module: `CalleeDeclaration`, `getCalleeDeclaration`.
 * 3. **Scoping** — `packages/compiler/compiler-src/langium/TaoScopeProvider.ts`: `ReferenceInfo.property` + container guard for the callee ref.
 * 4. **Langium validation** — `tao-lang-validator.ts`, `TypeSystemValidator.ts`; register checks via `tao-services.ts` `ValidationRegistry` (spread `validator` + overrides).
 * 5. **Typir** — `tao-type-system.ts`: call-site rules must use the shared resolver (no second matcher).
 * 6. **Codegen** — `runtime-gen.ts`: emit argument props / invoke bags from `resolveArgumentBindings` (resolved parameter names).
 * 7. **Formatter** — `packages/formatter/src/TaoFormatter.ts`: spacing before `argumentList` and optional `block`.
 * 8. **Nested blocks** — `tao-lang-validator.ts` `getBlockStatementContext` when the host may own a `Block`.
 */

/** CalleeDeclaration is the union of declarations that accept a `ParameterList` plus an `ArgumentList` at the
 * call site. ViewRender targets `ViewDeclaration` and ActionRender targets `ActionDeclaration` today; future
 * function-call / query-invocation surfaces should add their callee declaration here so `resolveArgumentBindings`
 * remains the single matching algorithm for every call host in the language. */
export type CalleeDeclaration = AST.ViewDeclaration | AST.ActionDeclaration

/** isCallableDeclaration returns true when `node` is a view or action declaration (the callable kinds that own local parameter types). */
export function isCallableDeclaration(node: AST.Node): node is CalleeDeclaration {
  return AST.isViewDeclaration(node) || AST.isActionDeclaration(node)
}

/** ArgumentBindingDiagnostic is one problem produced by argument resolution. */
export type ArgumentBindingDiagnostic =
  | {
    readonly kind: 'no-matching-parameter-by-type'
    readonly argument: AST.Expression
    readonly message: string
  }
  | {
    readonly kind: 'ambiguous-argument-by-type'
    readonly argument: AST.Expression
    readonly candidates: readonly AST.ParameterDeclaration[]
    readonly message: string
  }
  | {
    readonly kind: 'missing-argument'
    readonly parameter: AST.ParameterDeclaration
    readonly message: string
  }

/** ArgumentBindingResult is the resolver's full output: the bindings it could prove plus diagnostics. */
export type ArgumentBindingResult = {
  readonly bindings: ReadonlyMap<AST.Expression, AST.ParameterDeclaration>
  readonly diagnostics: readonly ArgumentBindingDiagnostic[]
}

/** TypeFingerprint is the structural identity used by the resolver to decide whether an argument's
 * value-type can match a parameter's declared type. The shape is purely AST-derived (no Typir dependency)
 * so the same algorithm runs at validation time and at codegen time.
 *
 * **Subtype-aware matching:** a nominal value `Y` matches a parameter `T` iff `Y` is `T` or `Y`'s
 * `is` chain reaches `T`. A plain primitive matches a primitive-typed parameter but NOT a nominal parameter
 * derived from that primitive (strict nominal — no contextual promotion). */
type TypeFingerprint =
  | { readonly kind: 'primitive'; readonly primitive: AST.PrimitiveType; readonly nominal?: AST.TypeDeclaration }
  | { readonly kind: 'nominal-struct'; readonly decl: AST.TypeDeclaration }
  | { readonly kind: 'anonymous-struct' }
  | { readonly kind: 'unresolved' }

/** resolveArgumentBindings binds the arguments (expressions) at a call site to the callee's parameters.
 *
 * All arguments are bound **by type** using greedy bipartite matching with per-argument ambiguity detection
 * (no global pre-fail when two parameters share a type).
 *
 * **Algorithm:**
 * 1. Fingerprint each argument's value type and each parameter's declared type.
 * 2. Build feasibility sets: for each argument, which unbound parameters accept it.
 * 3. Greedy: while any argument has exactly one feasible unbound parameter, bind it. Repeat.
 * 4. After greedy progress, classify remaining arguments:
 *    - 0 feasible → `no-matching-parameter-by-type`
 *    - >1 feasible → `ambiguous-argument-by-type`
 * 5. Each unbound parameter → `missing-argument`. */
export function resolveArgumentBindings(
  callee: CalleeDeclaration,
  argumentList: AST.ArgumentList | undefined,
): ArgumentBindingResult {
  const parameters = callee.parameterList?.parameters ?? []
  const args = argumentList?.arguments ?? []
  const bindings = new Map<AST.Expression, AST.ParameterDeclaration>()
  const diagnostics: ArgumentBindingDiagnostic[] = []

  const paramFingerprints = new Map<AST.ParameterDeclaration, TypeFingerprint>()
  for (const param of parameters) {
    paramFingerprints.set(param, parameterTypeFingerprint(param))
  }

  const unboundArgs = new Set<AST.Expression>(args)
  const unboundParams = new Set<AST.ParameterDeclaration>(parameters)

  bindByType(args, unboundArgs, unboundParams, paramFingerprints, bindings, diagnostics)
  reportMissingParameters(unboundParams, callee, diagnostics)

  return { bindings, diagnostics }
}

/** bindByType resolves all arguments to parameters by fingerprint match using greedy bipartite matching.
 * Per-argument ambiguity: arguments with >1 feasible parameter get an ambiguity error; arguments with
 * 0 feasible parameters get a no-match error. */
function bindByType(
  args: readonly AST.Expression[],
  unboundArgs: Set<AST.Expression>,
  unboundParams: Set<AST.ParameterDeclaration>,
  paramFingerprints: Map<AST.ParameterDeclaration, TypeFingerprint>,
  bindings: Map<AST.Expression, AST.ParameterDeclaration>,
  diagnostics: ArgumentBindingDiagnostic[],
): void {
  const argFeasibleParams = new Map<AST.Expression, Set<AST.ParameterDeclaration>>()
  for (const arg of args) {
    const argFp = argumentValueFingerprint(arg)
    const feasible = new Set<AST.ParameterDeclaration>()
    for (const param of unboundParams) {
      const paramFp = paramFingerprints.get(param)!
      if (argFingerprintMatchesParam(argFp, paramFp)) {
        feasible.add(param)
      }
    }
    argFeasibleParams.set(arg, feasible)
  }

  let progress = true
  while (progress) {
    progress = false
    const currentArgs = Array.from(unboundArgs)
    for (const arg of currentArgs) {
      const candidates = argFeasibleParams.get(arg)!
      const stillFeasible = filterToCurrentlyUnbound(candidates, unboundParams)
      if (stillFeasible.length === 1) {
        const param = stillFeasible[0]!
        bindings.set(arg, param)
        unboundArgs.delete(arg)
        unboundParams.delete(param)
        argFeasibleParams.delete(arg)
        progress = true
      }
    }
  }

  for (const arg of Array.from(unboundArgs)) {
    const stillFeasible = filterToCurrentlyUnbound(argFeasibleParams.get(arg) ?? new Set(), unboundParams)
    if (stillFeasible.length === 0) {
      diagnostics.push({
        kind: 'no-matching-parameter-by-type',
        argument: arg,
        message: `Argument does not match any unbound parameter by type.`,
      })
      unboundArgs.delete(arg)
      continue
    }
    if (stillFeasible.length > 1) {
      const names = stillFeasible.map(p => parameterName(p)).join(', ')
      diagnostics.push({
        kind: 'ambiguous-argument-by-type',
        argument: arg,
        candidates: stillFeasible,
        message:
          `Argument matches multiple unbound parameters (${names}); declare a distinct nominal type for at least one, or pass a value of a more specific type.`,
      })
      unboundArgs.delete(arg)
    }
  }
}

/** reportMissingParameters emits diagnostics for parameters that remain unbound after the matching pass. */
function reportMissingParameters(
  unboundParams: Set<AST.ParameterDeclaration>,
  callee: CalleeDeclaration,
  diagnostics: ArgumentBindingDiagnostic[],
): void {
  for (const param of unboundParams) {
    diagnostics.push({
      kind: 'missing-argument',
      parameter: param,
      message: `Missing argument for parameter '${parameterName(param)}: ${
        parameterTypeName(param)
      }' of '${callee.name}'.`,
    })
  }
}

/** parameterTypeFingerprint resolves a parameter's declared type to a fingerprint.
 * For shorthand parameters (no explicit `type`), uses `parameterResolvedType`. */
function parameterTypeFingerprint(param: AST.ParameterDeclaration): TypeFingerprint {
  const resolved = parameterResolvedType(param)
  return resolvedTypeToFingerprint(resolved)
}

/** resolvedTypeToFingerprint converts a `ResolvedTypeKind` into a `TypeFingerprint`. */
function resolvedTypeToFingerprint(resolved: ResolvedTypeKind): TypeFingerprint {
  if (resolved.kind === 'primitive') {
    return { kind: 'primitive', primitive: resolved.primitive, nominal: resolved.nominalDecl }
  }
  if (resolved.kind === 'struct') {
    if (resolved.nominalDecl !== undefined) {
      return { kind: 'nominal-struct', decl: resolved.nominalDecl }
    }
    return { kind: 'anonymous-struct' }
  }
  return { kind: 'unresolved' }
}

/** argumentValueFingerprint classifies an expression (or nested object literal) into a fingerprint suitable for the by-type matcher. */
function argumentValueFingerprint(expr: AST.Expression | AST.ObjectLiteral): TypeFingerprint {
  if (AST.isStringTemplateExpression(expr)) {
    return { kind: 'primitive', primitive: 'text' }
  }
  if (AST.isNumberLiteral(expr)) {
    return { kind: 'primitive', primitive: 'number' }
  }
  if (AST.isActionExpression(expr)) {
    return { kind: 'primitive', primitive: 'action' }
  }
  if (AST.isTypedLiteralExpression(expr)) {
    const resolved = typedLiteralType(expr)
    if (resolved) {
      const ref = resolved.typeDecl
      const baseResolved = resolveTypeExpression(ref.base)
      if (baseResolved.kind === 'primitive') {
        return { kind: 'primitive', primitive: baseResolved.primitive, nominal: ref }
      }
      if (baseResolved.kind === 'struct' || structShapeOfDeclaredType(ref) !== undefined) {
        return { kind: 'nominal-struct', decl: ref }
      }
    }
    return { kind: 'unresolved' }
  }
  if (AST.isObjectLiteral(expr)) {
    return { kind: 'anonymous-struct' }
  }
  if (AST.isMemberAccessExpression(expr)) {
    return memberAccessFingerprint(expr)
  }
  if (AST.isUnaryExpression(expr)) {
    return { kind: 'primitive', primitive: 'number' }
  }
  if (AST.isBinaryExpression(expr)) {
    return binaryExpressionFingerprint(expr)
  }
  return { kind: 'unresolved' }
}

/** binaryExpressionFingerprint predicts the result primitive of `+ - * /`. */
function binaryExpressionFingerprint(expr: AST.BinaryExpression): TypeFingerprint {
  if (expr.op === '-' || expr.op === '/') {
    return { kind: 'primitive', primitive: 'number' }
  }
  const left = argumentValueFingerprint(expr.left)
  const right = argumentValueFingerprint(expr.right)
  if (expr.op === '+') {
    if (isNumericPrimitive(left) && isNumericPrimitive(right)) {
      return { kind: 'primitive', primitive: 'number' }
    }
    if (isTextPrimitive(left) && isTextPrimitive(right)) {
      return { kind: 'primitive', primitive: 'text' }
    }
    return { kind: 'unresolved' }
  }
  if (isTextPrimitive(left) && isNumericPrimitive(right)) {
    return { kind: 'primitive', primitive: 'text' }
  }
  if (isNumericPrimitive(left) && isNumericPrimitive(right)) {
    return { kind: 'primitive', primitive: 'number' }
  }
  return { kind: 'unresolved' }
}

function isNumericPrimitive(fp: TypeFingerprint): boolean {
  return fp.kind === 'primitive' && fp.primitive === 'number'
}

function isTextPrimitive(fp: TypeFingerprint): boolean {
  return fp.kind === 'primitive' && fp.primitive === 'text'
}

/** memberAccessFingerprint covers `Name`, `Name.foo.bar` references. Bare TypeDeclaration refs return
 * `unresolved` — a type ref is not a value (the validator reports the error). */
function memberAccessFingerprint(
  expr: AST.MemberAccessExpression,
  seen: Set<AST.AssignmentDeclaration> = new Set(),
): TypeFingerprint {
  if (expr.properties.length > 0) {
    return memberAccessPathFingerprint(expr, seen)
  }
  const ref = expr.root.ref
  if (AST.isViewDeclaration(ref)) {
    return { kind: 'primitive', primitive: 'view' }
  }
  if (AST.isActionDeclaration(ref)) {
    return { kind: 'primitive', primitive: 'action' }
  }
  if (AST.isParameterDeclaration(ref)) {
    return parameterTypeFingerprint(ref)
  }
  if (AST.isTypeDeclaration(ref)) {
    return { kind: 'unresolved' }
  }
  if (AST.isAssignmentDeclaration(ref)) {
    if (seen.has(ref)) {
      return { kind: 'unresolved' }
    }
    seen.add(ref)
    return assignmentDeclarationFingerprint(ref, seen)
  }
  return { kind: 'unresolved' }
}

/** assignmentDeclarationFingerprint recursively fingerprints an `alias` / `state` declaration's value. */
function assignmentDeclarationFingerprint(
  decl: AST.AssignmentDeclaration,
  seen: Set<AST.AssignmentDeclaration>,
): TypeFingerprint {
  const value = decl.value
  if (value === undefined) {
    return { kind: 'unresolved' }
  }
  if (AST.isObjectLiteral(value)) {
    return { kind: 'anonymous-struct' }
  }
  if (AST.isMemberAccessExpression(value)) {
    return memberAccessFingerprint(value, seen)
  }
  return argumentValueFingerprint(value)
}

/** memberAccessPathFingerprint handles `Name.a.b.c` expressions by walking the struct shape or static
 * object shape to find the leaf type. Falls back to `unresolved` when the path can't be resolved. */
function memberAccessPathFingerprint(
  expr: AST.MemberAccessExpression,
  seen: Set<AST.AssignmentDeclaration>,
): TypeFingerprint {
  const ref = expr.root.ref
  if (AST.isParameterDeclaration(ref)) {
    const resolved = parameterResolvedType(ref)
    if (resolved.kind === 'struct') {
      const leafType = typeExpressionAtStructFieldPath(resolved.struct, expr.properties)
      if (leafType) {
        return resolvedTypeToFingerprint(resolveTypeExpression(leafType))
      }
    }
    return { kind: 'unresolved' }
  }
  if (AST.isAssignmentDeclaration(ref)) {
    if (seen.has(ref)) {
      return { kind: 'unresolved' }
    }
    seen.add(ref)
    const struct = declaredStructShapeOfExpr(ref.value)
    if (struct) {
      const leafType = typeExpressionAtStructFieldPath(struct, expr.properties)
      if (leafType) {
        return resolvedTypeToFingerprint(resolveTypeExpression(leafType))
      }
    }
    const leafExpr = walkObjectShapeToLeafExpr(ref.value, expr.properties, seen)
    if (leafExpr) {
      return argumentValueFingerprint(leafExpr)
    }
  }
  return { kind: 'unresolved' }
}

/** walkObjectShapeToLeafExpr walks an object-literal shape through a property path and returns the
 * value expression at the leaf. Unlike `staticValueExprAtMemberPath`, this returns the leaf expression
 * (not the shape), so the fingerprinter can classify it. */
function walkObjectShapeToLeafExpr(
  rootExpr: AST.Expression | AST.ObjectLiteral | undefined,
  path: readonly string[],
  seen: Set<AST.AssignmentDeclaration>,
): AST.Expression | AST.ObjectLiteral | undefined {
  if (rootExpr === undefined || path.length === 0) {
    return undefined
  }
  let shape = staticObjectShapeOf(rootExpr, seen)
  for (let i = 0; i < path.length; i++) {
    if (shape === undefined) {
      return undefined
    }
    const prop = shape.properties.find(p => p.name === path[i])
    if (prop === undefined) {
      return undefined
    }
    if (i === path.length - 1) {
      return prop.value
    }
    shape = staticObjectShapeOf(prop.value, seen)
  }
  return undefined
}

/** argFingerprintMatchesParam returns true when an argument's fingerprint can satisfy a parameter's declared
 * type under subtype-aware rules:
 * - Primitive parameter: accepts exact primitive + any nominal whose `is` chain reaches that primitive.
 * - Nominal parameter: accepts only values whose nominal chain reaches that nominal type.
 * - Struct parameter: accepts nominal match + anonymous struct (field-shape check deferred to Typir). */
function argFingerprintMatchesParam(arg: TypeFingerprint, param: TypeFingerprint): boolean {
  if (param.kind === 'unresolved' || arg.kind === 'unresolved') {
    return false
  }

  if (param.kind === 'primitive') {
    if (param.nominal !== undefined) {
      return argNominalChainReaches(arg, param.nominal)
    }
    if (arg.kind === 'primitive') {
      return arg.primitive === param.primitive
    }
    return false
  }

  if (param.kind === 'nominal-struct') {
    if (arg.kind === 'nominal-struct') {
      return nominalChainReaches(arg.decl, param.decl)
    }
    if (arg.kind === 'anonymous-struct') {
      return true
    }
    return false
  }

  if (param.kind === 'anonymous-struct' && arg.kind === 'anonymous-struct') {
    return true
  }

  return false
}

/** argNominalChainReaches returns true when the argument's value type is or derives from `targetDecl`. */
function argNominalChainReaches(arg: TypeFingerprint, targetDecl: AST.TypeDeclaration): boolean {
  if (arg.kind === 'primitive' && arg.nominal !== undefined) {
    return nominalChainReaches(arg.nominal, targetDecl)
  }
  if (arg.kind === 'nominal-struct') {
    return nominalChainReaches(arg.decl, targetDecl)
  }
  return false
}

/** nominalChainReaches walks `type X is Y` declarations to check if `from` is or derives from `target`. */
function nominalChainReaches(
  from: AST.TypeDeclaration,
  target: AST.TypeDeclaration,
  seen: Set<AST.TypeDeclaration> = new Set(),
): boolean {
  if (from === target) {
    return true
  }
  if (seen.has(from)) {
    return false
  }
  seen.add(from)
  if (!AST.isNamedTypeRef(from.base)) {
    return false
  }
  const parentDecl = from.base.ref?.ref
  if (!AST.isTypeDeclaration(parentDecl)) {
    return false
  }
  return nominalChainReaches(parentDecl, target, seen)
}

/** filterToCurrentlyUnbound returns the candidate parameters still in `unboundParams`. */
function filterToCurrentlyUnbound(
  set: ReadonlySet<AST.ParameterDeclaration>,
  unboundParams: ReadonlySet<AST.ParameterDeclaration>,
): AST.ParameterDeclaration[] {
  const out: AST.ParameterDeclaration[] = []
  for (const p of set) {
    if (unboundParams.has(p)) {
      out.push(p)
    }
  }
  return out
}

/** getCalleeDeclaration returns the resolved callee declaration for an argument-list host, or `undefined`
 * when the cross-reference is unresolved or points to a non-block declaration. */
export function getCalleeDeclaration(host: AST.ArgumentListHost): CalleeDeclaration | undefined {
  if (AST.isViewRender(host)) {
    const ref = host.view?.ref
    return AST.isViewDeclaration(ref) ? ref : undefined
  }
  const ref = host.action?.ref
  return AST.isActionDeclaration(ref) ? ref : undefined
}
