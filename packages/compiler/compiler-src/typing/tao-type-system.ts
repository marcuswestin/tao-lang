import { AST } from '@parser/parser'
import type { Type } from 'typir'
import { InferenceRuleNotApplicable, isType } from 'typir'
import type { LangiumTypeSystemDefinition, TypirLangiumServices, TypirLangiumSpecifics } from 'typir-langium'
import { staticValueExprAtMemberPath } from '../static-object-shape'
import {
  declaredStructShapeOfExpr,
  owningCallableOf,
  parameterName,
  parameterResolvedType,
  parameterTypeName,
  primitiveBaseOfDeclaredType,
  resolveTypeExpression,
  typeExpressionAtStructFieldPath,
} from '../tao-type-shapes'
import {
  type ArgumentBindingDiagnostic,
  type CalleeDeclaration,
  getCalleeDeclaration,
  resolveArgumentBindings,
} from './tao-argument-bindings'
import { typedLiteralType, typeIdentityKey } from './tao-local-parameter-types'

/** astNodeHasDocument returns true when `node` is linked into a Langium document (Typir inference caching requires this). */
export function astNodeHasDocument(node: AST.Node | undefined): node is AST.Node {
  return node !== undefined && AST.Utils.findRootNode(node).$document !== undefined
}

/** NO_DOCUMENT_ERROR is the substring Typir-Langium includes in errors when inference runs on an unlinked subtree
 * (we match with `.includes`, not full-message equality). We intercept it in `safeInferType` and validation catch
 * blocks because the subtree is not yet ready for caching-backed inference. */
export const NO_DOCUMENT_ERROR = 'AST node has no document'

/** safeInferType runs Typir inference on `node`, returning the inferred `Type` or `undefined` when the node is
 * not in a document (Typir's cache requires one) or inference produces a non-`Type` result. Any other error
 * propagates — callers should not silently swallow bugs. */
export function safeInferType(typir: TaoTypirServices, node: AST.Node | undefined): Type | undefined {
  if (!astNodeHasDocument(node)) {
    return undefined
  }
  let inferred: unknown
  try {
    inferred = typir.Inference.inferType(node)
  } catch (err) {
    if (err instanceof Error && err.message.includes(NO_DOCUMENT_ERROR)) {
      return undefined
    }
    throw err
  }
  return isType(inferred) ? inferred : undefined
}

/** BinaryOpClassification is the shared result used by both the inference rule and the validation rule. */
type BinaryOpClassification =
  | { readonly kind: 'ok'; readonly resultType: Type }
  | { readonly kind: 'invalid'; readonly expectedMessage: string }

/** classifyBinaryOp is the single source of truth for `+`, `-`, `*`, `/` typing. Called from both inference
 * (to compute the result type) and validation (to surface a message). Keep the rules identical across the two
 * callers by routing both through this function. */
function classifyBinaryOp(
  op: AST.BinaryExpression['op'],
  lt: Type,
  rt: Type,
  typir: TaoTypirServices,
  textT: Type,
  numberT: Type,
): BinaryOpClassification {
  const a = typir.Assignability.isAssignable.bind(typir.Assignability)
  switch (op) {
    case '+': {
      if (a(lt, textT) && a(rt, textT)) {
        return { kind: 'ok', resultType: textT }
      }
      if (a(lt, numberT) && a(rt, numberT)) {
        return { kind: 'ok', resultType: numberT }
      }
      return { kind: 'invalid', expectedMessage: `'+' expects text + text or number + number.` }
    }
    case '-':
    case '/': {
      if (a(lt, numberT) && a(rt, numberT)) {
        return { kind: 'ok', resultType: numberT }
      }
      return { kind: 'invalid', expectedMessage: `'${op}' expects number operands.` }
    }
    case '*': {
      if (a(lt, numberT) && a(rt, numberT)) {
        return { kind: 'ok', resultType: numberT }
      }
      if (a(lt, textT) && a(rt, numberT)) {
        return { kind: 'ok', resultType: textT }
      }
      return { kind: 'invalid', expectedMessage: `'*' expects number * number or text * number.` }
    }
    default:
      return { kind: 'invalid', expectedMessage: `Unknown binary operator '${op as string}'.` }
  }
}

/** isDisplayablePrimitive returns true when `inferred` can appear inside a string template interpolation hole.
 * Display-allowed primitives are exactly text / number / boolean (and nominal subtypes of them). action and view
 * are explicitly rejected even if Typir's assignability graph happens to relate them to text. */
function isDisplayablePrimitive(
  typir: TaoTypirServices,
  inferred: Type,
  allowed: { textT?: Type; numberT?: Type; booleanT?: Type },
  forbidden: { actionT: Type; viewT: Type },
): boolean {
  const a = typir.Assignability.isAssignable.bind(typir.Assignability)
  if (a(inferred, forbidden.actionT) || a(inferred, forbidden.viewT)) {
    return false
  }
  if (allowed.textT && a(inferred, allowed.textT)) {
    return true
  }
  if (allowed.numberT && a(inferred, allowed.numberT)) {
    return true
  }
  if (allowed.booleanT && a(inferred, allowed.booleanT)) {
    return true
  }
  return false
}

/** TaoSpecifics binds Tao's generated AST to Typir-Langium's service layer. */
export interface TaoSpecifics extends TypirLangiumSpecifics {
  AstTypes: AST.TaoLangAstType
}

/** TaoTypirServices is the Typir service surface configured for Tao's AST. */
export type TaoTypirServices = TypirLangiumServices<TaoSpecifics>

/** TypirCallSiteValidationAccept is the `accept` callback Typir's `ensureNodeIsAssignable` expects. Langium's
 * `ValidationAcceptor` generics don't line up with that parameter in our typings, so we derive this from the
 * method signature instead of using `ValidationAcceptor` or `any`. */
export type TypirCallSiteValidationAccept = Parameters<
  TaoTypirServices['validation']['Constraints']['ensureNodeIsAssignable']
>[2]

/** TaoTypeSystem defines Tao's MVP type rules (primitives, nominal `type` decls, typed literals, view argument assignability). */
export class TaoTypeSystem implements LangiumTypeSystemDefinition<TaoSpecifics> {
  /** onInitialize registers primitives and inference / validation rules that do not depend on a particular AST instance. */
  onInitialize(typir: TaoTypirServices): void {
    typir.factory.Primitives.create({ primitiveName: 'text' })
      .inferenceRule({ filter: AST.isStringTemplateExpression })
      .finish()

    typir.factory.Primitives.create({ primitiveName: 'number' })
      .inferenceRule({ filter: AST.isNumberLiteral })
      .finish()

    typir.factory.Primitives.create({ primitiveName: 'boolean' }).finish()

    const actionT = typir.factory.Primitives.create({ primitiveName: 'action' }).finish()

    const viewT = typir.factory.Primitives.create({ primitiveName: 'view' }).finish()

    const textT = typir.factory.Primitives.get({ primitiveName: 'text' })
    const numberT = typir.factory.Primitives.get({ primitiveName: 'number' })
    const booleanT = typir.factory.Primitives.get({ primitiveName: 'boolean' })

    typir.Inference.addInferenceRulesForAstNodes({
      ActionExpression: (n) => {
        if (!astNodeHasDocument(n)) {
          return InferenceRuleNotApplicable
        }
        return actionT
      },
      TypedLiteralExpression: (n) => {
        if (!astNodeHasDocument(n)) {
          return InferenceRuleNotApplicable
        }
        const resolved = typedLiteralType(n)
        if (!resolved) {
          return InferenceRuleNotApplicable
        }
        return typir.factory.Primitives.get({ primitiveName: typeIdentityKey(resolved) }) ?? InferenceRuleNotApplicable
      },
      MemberAccessExpression: (n) => {
        if (!astNodeHasDocument(n)) {
          return InferenceRuleNotApplicable
        }
        const ref = n.root.ref
        if (ref === undefined || ref === null) {
          return InferenceRuleNotApplicable
        }
        if (n.properties.length > 0) {
          return inferMemberPathType(n, ref, typir) ?? InferenceRuleNotApplicable
        }
        if (AST.isActionDeclaration(ref)) {
          return actionT
        }
        if (AST.isViewDeclaration(ref)) {
          return viewT
        }
        if (AST.isAssignmentDeclaration(ref)) {
          return safeInferType(typir, ref.value) ?? InferenceRuleNotApplicable
        }
        if (AST.isParameterDeclaration(ref)) {
          return parameterDeclarationType(ref, typir) ?? InferenceRuleNotApplicable
        }
        if (AST.isTypeDeclaration(ref)) {
          return typir.factory.Primitives.get({ primitiveName: ref.name }) ?? InferenceRuleNotApplicable
        }
        return InferenceRuleNotApplicable
      },
      BinaryExpression: (n) => {
        if (!numberT || !textT) {
          return InferenceRuleNotApplicable
        }
        const lt = safeInferType(typir, n.left)
        const rt = safeInferType(typir, n.right)
        if (!lt || !rt) {
          return InferenceRuleNotApplicable
        }
        const result = classifyBinaryOp(n.op, lt, rt, typir, textT, numberT)
        return result.kind === 'ok' ? result.resultType : InferenceRuleNotApplicable
      },
      UnaryExpression: (n) => {
        if (n.op !== '-' || !numberT) {
          return InferenceRuleNotApplicable
        }
        const ot = safeInferType(typir, n.operand)
        if (!ot || !typir.Assignability.isAssignable(ot, numberT)) {
          return InferenceRuleNotApplicable
        }
        return numberT
      },
    })

    typir.validation.Collector.addValidationRulesForAstNodes({
      TypedLiteralExpression: (n, accept) => {
        if (!astNodeHasDocument(n)) {
          return
        }
        const resolved = typedLiteralType(n)
        if (!resolved) {
          return
        }
        const ref = resolved.typeDecl
        if (!astNodeHasDocument(n.value)) {
          return
        }
        const basePrimitive = primitiveBaseOfDeclaredType(ref)
        if (basePrimitive === undefined) {
          return
        }
        const basePrim = typir.factory.Primitives.get({ primitiveName: basePrimitive })
        if (!basePrim) {
          return
        }
        try {
          typir.validation.Constraints.ensureNodeIsAssignable(n.value, basePrim, accept, (actual, expected) => ({
            severity: 'error',
            message: `Value of type '${actual.name}' is not assignable to type '${
              typeIdentityKey(resolved)
            }' (expected ${expected.name}).`,
            languageNode: n,
            languageProperty: 'value',
          }))
        } catch (err) {
          if (!(err instanceof Error) || !err.message.includes(NO_DOCUMENT_ERROR)) {
            throw err
          }
        }
      },
      ViewRender: (host, accept) => {
        validateCallSiteArguments(host, accept, typir)
      },
      ActionRender: (host, accept) => {
        validateCallSiteArguments(host, accept, typir)
      },
      BinaryExpression: (n, accept) => {
        if (!astNodeHasDocument(n) || !textT || !numberT) {
          return
        }
        const lt = safeInferType(typir, n.left)
        const rt = safeInferType(typir, n.right)
        if (!lt || !rt) {
          return
        }
        const result = classifyBinaryOp(n.op, lt, rt, typir, textT, numberT)
        if (result.kind === 'invalid') {
          accept({ severity: 'error', message: result.expectedMessage, languageNode: n, languageProperty: 'op' })
        }
      },
      UnaryExpression: (n, accept) => {
        if (!astNodeHasDocument(n) || n.op !== '-' || !numberT) {
          return
        }
        const ot = safeInferType(typir, n.operand)
        if (!ot || !typir.Assignability.isAssignable(ot, numberT)) {
          accept({
            severity: 'error',
            message: 'Unary `-` expects a number operand.',
            languageNode: n,
            languageProperty: 'operand',
          })
        }
      },
      StringTemplateExpression: (n, accept) => {
        if (!astNodeHasDocument(n)) {
          return
        }
        for (const seg of n.segments) {
          const inferred = safeInferType(typir, seg.expression)
          if (!inferred) {
            continue
          }
          if (!isDisplayablePrimitive(typir, inferred, { textT, numberT, booleanT }, { actionT, viewT })) {
            accept({
              severity: 'error',
              message: `String template interpolation must be text, number, or boolean (got '${
                typir.Printer.printTypeName(inferred)
              }').`,
              languageNode: seg,
              languageProperty: 'expression',
            })
          }
        }
      },
    })
  }

  /** onNewAstNode registers nominal types for each `type Name is base` declaration and local parameter
   * types (`Title is text`). Primitive-based types become Typir primitives marked as subtypes of their
   * base; struct-based types become opaque nominal primitives so field access and field-shape checks
   * (handled by the validator and inference helpers) compose with the rest of the assignability graph. */
  onNewAstNode(node: AST.Node, typir: TaoTypirServices): void {
    if (AST.isParameterDeclaration(node) && node.localSuperType && astNodeHasDocument(node)) {
      registerLocalParameterType(node, typir)
      return
    }
    if (!AST.isTypeDeclaration(node) || !astNodeHasDocument(node)) {
      return
    }
    if (typir.factory.Primitives.get({ primitiveName: node.name })) {
      return
    }
    const resolved = resolveTypeExpression(node.base)
    if (resolved.kind === 'primitive') {
      const base = typir.factory.Primitives.get({ primitiveName: resolved.primitive })
      if (!base) {
        return
      }
      const named = typir.factory.Primitives.create({ primitiveName: node.name }).finish()
      typir.Subtype.markAsSubType(named, base)
      return
    }
    if (resolved.kind === 'struct') {
      // Struct nominal types are opaque primitives in Typir; the validator owns field-shape and field-type
      // enforcement (see `validateTypedStructLiteralFields`).
      typir.factory.Primitives.create({ primitiveName: node.name }).finish()
    }
  }
}

/** registerLocalParameterType registers a Typir primitive for a local parameter type (`Title is text`).
 * Uses qualified `Owner.Param` as the Typir identity (e.g. `Badge.Title`). Marks as subtype of the
 * resolved super type so `Badge.Title <: text` holds but `text !<: Badge.Title`. */
function registerLocalParameterType(param: AST.ParameterDeclaration, typir: TaoTypirServices): void {
  const owner = owningCallableOf(param)
  if (!owner) {
    return
  }
  const qualifiedName = `${owner.name}.${param.name}`
  if (typir.factory.Primitives.get({ primitiveName: qualifiedName })) {
    return
  }

  const resolved = resolveTypeExpression(param.localSuperType)
  if (resolved.kind === 'primitive') {
    const base = typir.factory.Primitives.get({ primitiveName: resolved.primitive })
    if (!base) {
      return
    }
    const named = typir.factory.Primitives.create({ primitiveName: qualifiedName }).finish()
    typir.Subtype.markAsSubType(named, base)
    if (resolved.nominalDecl) {
      const nominalBase = typir.factory.Primitives.get({ primitiveName: resolved.nominalDecl.name })
      if (nominalBase) {
        typir.Subtype.markAsSubType(named, nominalBase)
      }
    }
    return
  }
  if (resolved.kind === 'struct') {
    typir.factory.Primitives.create({ primitiveName: qualifiedName }).finish()
  }
}

/** parameterDeclarationType resolves a parameter's declared type to a Typir `Type`, walking through nominal
 * aliases (`type Y is text`) and named references to declared types. Handles both explicit (`Name text`),
 * shorthand (`Title`), and local-super-type (`Title is text`) forms. Returns `undefined` when the type
 * has not been registered yet (e.g. unresolved cross-reference). */
export function parameterDeclarationType(
  param: AST.ParameterDeclaration,
  typir: TaoTypirServices,
): Type | undefined {
  if (param.localSuperType) {
    const owner = owningCallableOf(param)
    if (!owner) {
      return undefined
    }
    return typir.factory.Primitives.get({ primitiveName: `${owner.name}.${param.name}` })
  }
  if (param.type) {
    if (AST.isPrimitiveTypeRef(param.type)) {
      return typir.factory.Primitives.get({ primitiveName: param.type.primitive })
    }
    if (AST.isNamedTypeRef(param.type)) {
      return namedTypeRefType(param.type, typir)
    }
    return undefined
  }
  const resolved = parameterResolvedType(param)
  if (resolved.kind === 'primitive') {
    return resolved.nominalDecl
      ? typir.factory.Primitives.get({ primitiveName: resolved.nominalDecl.name })
      : typir.factory.Primitives.get({ primitiveName: resolved.primitive })
  }
  if (resolved.kind === 'struct' && resolved.nominalDecl) {
    return typir.factory.Primitives.get({ primitiveName: resolved.nominalDecl.name })
  }
  return undefined
}

/** namedTypeRefType resolves a named type reference (`Person`, `Person.Job`) to a Typir type. Bare refs map to
 * the nominal primitive registered for the type declaration; segmented refs resolve through the declared field
 * types and produce the type at the path leaf. */
function namedTypeRefType(node: AST.NamedTypeRef, typir: TaoTypirServices): Type | undefined {
  if (node.segments.length === 0) {
    const decl = node.ref?.ref
    if (!AST.isTypeDeclaration(decl)) {
      return undefined
    }
    return typir.factory.Primitives.get({ primitiveName: decl.name })
  }
  const resolved = resolveTypeExpression(node)
  if (resolved.kind === 'primitive') {
    return typir.factory.Primitives.get({ primitiveName: resolved.primitive })
  }
  // Nested struct shapes don't have their own nominal Typir type yet — leave as `undefined` so callers fall
  // through to validator-only checks.
  return undefined
}

/** inferMemberPathType handles `Root.a.b.c` inference. The path resolves either through a typed struct literal
 * shape (nominal field types) or through a static object-literal shape (anonymous field types). */
function inferMemberPathType(
  node: AST.MemberAccessExpression,
  ref: AST.Referenceable,
  typir: TaoTypirServices,
): Type | undefined {
  if (AST.isParameterDeclaration(ref)) {
    return inferMemberPathThroughParameter(ref, node.properties, typir)
  }
  if (!AST.isAssignmentDeclaration(ref)) {
    return undefined
  }
  // First try to resolve through a declared struct shape (typed struct literal). This gives us nominal field
  // types when a field's declared type is a named primitive (`Age number` → number).
  const structFieldType = inferStructFieldTypeAtPath(ref, node.properties, typir)
  if (structFieldType !== undefined) {
    return structFieldType
  }
  // Fall back to static-object-shape walking for anonymous object literals.
  const seen = new Set<AST.AssignmentDeclaration>([ref])
  const valExpr = staticValueExprAtMemberPath(ref, node.properties, seen)
  return safeInferType(typir, valExpr)
}

/** inferMemberPathThroughParameter walks a struct-typed parameter (`view V P Person { … P.Name }`,
 * `view Show J Person.Job { … J.Title }`) through its declared field shape, including `Person.Job`-style
 * `NamedTypeRef.segments` so the member path is resolved from the correct nested struct root. */
function inferMemberPathThroughParameter(
  param: AST.ParameterDeclaration,
  path: readonly string[],
  typir: TaoTypirServices,
): Type | undefined {
  const resolved = parameterResolvedType(param)
  if (resolved.kind !== 'struct') {
    return undefined
  }
  return resolveStructPathToType(resolved.struct, path, typir)
}

/** inferStructFieldTypeAtPath walks an alias/state declaration's typed-struct-literal shape by `path`,
 * returning the Typir type at the leaf field. Returns `undefined` when the value isn't a typed struct or the
 * path leaves the struct world. */
function inferStructFieldTypeAtPath(
  decl: AST.AssignmentDeclaration,
  path: readonly string[],
  typir: TaoTypirServices,
): Type | undefined {
  const struct = declaredStructShapeOfExpr(decl.value)
  if (struct === undefined) {
    return undefined
  }
  return resolveStructPathToType(struct, path, typir)
}

/** resolveStructPathToType walks a struct shape through `path`, returning the Typir type of the field at the
 * leaf. Intermediate steps must resolve to nested struct shapes; otherwise returns `undefined`. */
function resolveStructPathToType(
  struct: AST.StructTypeExpression,
  path: readonly string[],
  typir: TaoTypirServices,
): Type | undefined {
  const leafType = typeExpressionAtStructFieldPath(struct, path)
  return leafType ? typirTypeOfTypeExpression(leafType, typir) : undefined
}

/** typirTypeOfTypeExpression resolves a `TypeExpression` to its Typir type. Primitive refs and bare named refs
 * map to registered Typir primitives; struct shapes have no first-class Typir type today (inferred via shape). */
function typirTypeOfTypeExpression(expr: AST.TypeExpression, typir: TaoTypirServices): Type | undefined {
  if (AST.isPrimitiveTypeRef(expr)) {
    return typir.factory.Primitives.get({ primitiveName: expr.primitive })
  }
  if (AST.isNamedTypeRef(expr)) {
    return namedTypeRefType(expr, typir)
  }
  return undefined
}

/** validateCallSiteArguments runs the shared argument-binding resolver for a `ViewRender` or `ActionRender`
 * host, then surfaces both Typir assignability errors (per resolved binding) and structural diagnostics from
 * the resolver (unknown name, ambiguous type match, missing argument, …). Centralizing here means all call
 * sites share one matching algorithm and one set of error messages. */
function validateCallSiteArguments(
  host: AST.ArgumentListHost,
  accept: TypirCallSiteValidationAccept,
  typir: TaoTypirServices,
): void {
  if (!astNodeHasDocument(host)) {
    return
  }
  const callee = getCalleeDeclaration(host)
  if (callee === undefined) {
    return
  }
  const result = resolveArgumentBindings(callee, host.argumentList)
  for (const [arg, param] of result.bindings) {
    enforceArgumentAssignability(arg, param, typir, accept)
  }
  for (const diag of result.diagnostics) {
    reportArgumentBindingDiagnostic(diag, host, callee, accept)
  }
}

/** enforceArgumentAssignability runs Typir's `ensureNodeIsAssignable` for one bound argument/parameter pair,
 * tolerating the "no document" race that can occur during partial linking. */
function enforceArgumentAssignability(
  arg: AST.Expression,
  param: AST.ParameterDeclaration,
  typir: TaoTypirServices,
  accept: TypirCallSiteValidationAccept,
): void {
  const expected = parameterDeclarationType(param, typir)
  if (expected === undefined) {
    return
  }
  if (!astNodeHasDocument(arg)) {
    return
  }
  try {
    const label = parameterName(param)
    typir.validation.Constraints.ensureNodeIsAssignable(arg, expected, accept, (actual, _expected) => ({
      severity: 'error',
      message: `Argument '${label}' of type '${actual.name}' is not assignable to parameter of type '${
        parameterTypeName(param)
      }'.`,
      languageNode: arg,
    }))
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes(NO_DOCUMENT_ERROR)) {
      throw err
    }
  }
}

/** reportArgumentBindingDiagnostic translates a structural binding diagnostic into a Typir-style validation
 * problem (severity / message / languageNode / languageProperty), choosing the location that gives the
 * cleanest squiggle for each failure mode. */
function reportArgumentBindingDiagnostic(
  diag: ArgumentBindingDiagnostic,
  host: AST.ArgumentListHost,
  _callee: CalleeDeclaration,
  accept: TypirCallSiteValidationAccept,
): void {
  switch (diag.kind) {
    case 'no-matching-parameter-by-type':
    case 'ambiguous-argument-by-type':
      accept({
        severity: 'error',
        message: diag.message,
        languageNode: diag.argument,
      })
      return
    case 'missing-argument':
      accept({
        severity: 'error',
        message: diag.message,
        languageNode: host,
        languageProperty: AST.isViewRender(host) ? 'view' : 'action',
      })
      return
  }
}
