import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { isKnownNonObjectExpr, staticObjectShapeOf } from '../static-object-shape'
import {
  declaredStructShapeOfExpr,
  findLexicalTypeDeclaration,
  parameterResolvedType,
  parameterTypeName,
  resolveTypeExpression,
  structFieldTypeAt,
  structShapeOfTypedLiteral,
} from '../tao-type-shapes'
import { getCalleeDeclaration, isCallableDeclaration, resolveArgumentBindings } from '../typing/tao-argument-bindings'
import {
  findEnclosingArgumentContext,
  getLocalParameterType,
  typedLiteralType,
} from '../typing/tao-local-parameter-types'
import { makeValidater, type Reporter } from './ValidationReporter'

const useMemberAccessToScalarField = '(use a member access to a scalar field).'

/** typeSystemValidationMessages are diagnostics for nominal types, struct literals, and static object shape rules. */
export const typeSystemValidationMessages = {
  objectNotAllowedInCallArgument:
    `Object-shaped values cannot be passed to primitive-typed parameters ${useMemberAccessToScalarField}`,
  doMustReferenceAction: (kind: string) => `'do' can only invoke an action declaration, not a '${kind}'.`,
  objectNotAllowedInPlusOperator: `'+' cannot operate on object-shaped values ${useMemberAccessToScalarField}`,
  memberAccessNotOnObject: (key: string) => `Cannot access property '${key}': expression is not an object.`,
  unknownObjectProperty: (key: string) => `Property '${key}' does not exist on this object.`,
  unknownStructField: (typeName: string, key: string) => `Field '${key}' does not exist on type '${typeName}'.`,
  missingStructField: (typeName: string, key: string) => `Missing field '${key}' for type '${typeName}'.`,
  typedLiteralInterpolation:
    'Typed literals must be constant literals; string template interpolation is not allowed here.',
  typedLiteralWrongValueShape: (typeName: string, expected: string) =>
    `Typed literal '${typeName}' expects a ${expected} value.`,
  structFieldWrongValueShape: (qualifiedField: string, expected: string) =>
    `Field '${qualifiedField}' expects a ${expected} value.`,
  unknownNestedTypeSegment: (name: string, segment: string) => `Type '${name}' has no nested type '${segment}'.`,
  duplicateStructField: (name: string) => `Duplicate struct field '${name}'.`,
  typeIsNotAValue: (name: string) =>
    `'${name}' is a type, not a value. Use '${name} <value>' to construct a value of type ${name}.`,
  ambiguousLocalTypeConstructor: (name: string, calleeName: string) =>
    `Ambiguous type constructor '${name}' in argument to ${calleeName}. Resolved to '${calleeName}.${name}'. Use '.${name}' or '${calleeName}.${name}' to make this explicit.`,
  dotLocalOutsideArgumentContext: (dotName: string) =>
    `'${dotName}' can only be used as shorthand for a callee-local type in an argument position.`,
  dotLocalOnNonCallableCallee: (dotName: string) =>
    `'${dotName}' shorthand requires a callable callee with local parameter types.`,
  dotLocalMissingType: (calleeKind: string, calleeName: string, dotName: string) =>
    `${calleeKind} '${calleeName}' has no local parameter type '${dotName}'.`,
} as const

/** typeSystemValidator holds Langium checks for typed literals, struct types, named type refs, member paths, and object-shaped expressions in + / call-site arguments. */
export const typeSystemValidator: Pick<
  langium.ValidationChecks<AST.TaoLangAstType>,
  | 'TypedLiteralExpression'
  | 'StructTypeExpression'
  | 'NamedTypeRef'
  | 'MemberAccessExpression'
  | 'BinaryExpression'
  | 'ViewRender'
  | 'ActionRender'
> = {
  TypedLiteralExpression: makeValidater((node, report) => {
    validateDotLocalTypeRef(node, report)
    validateTypedLiteralHasNoInterpolation(node, report)
    validateTypedLiteralValueShape(node, report)
    validateTypedStructLiteralFields(node, report)
    validateLocalTypeConstructorAmbiguity(node, report)
  }),

  StructTypeExpression: makeValidater((node, report) => {
    validateDuplicateStructFieldNames(node, report)
  }),

  NamedTypeRef: makeValidater((node, report) => {
    validateNamedTypeRef(node, report)
  }),

  MemberAccessExpression: makeValidater((node, report) => {
    validateBareTypeAsValue(node, report)
    validateMemberAccessPath(node, report)
  }),

  BinaryExpression: makeValidater((node, report) => {
    validateNoObjectInPlusOperator(node, report)
  }),

  ViewRender: makeValidater((node, report) => {
    validateNoObjectInCallArgument(node, report)
  }),

  ActionRender: makeValidater((node, report) => {
    validateActionRenderCallee(node, report)
    validateNoObjectInCallArgument(node, report)
  }),
}

/** validateTypedLiteralHasNoInterpolation ensures `TypeName "…"` uses a constant string — interpolation holes are rejected
 * because a typed literal is supposed to be a nominal literal value, not a computed expression. */
function validateTypedLiteralHasNoInterpolation(
  node: AST.TypedLiteralExpression,
  report: Reporter<AST.TypedLiteralExpression>,
): void {
  if (!AST.isStringTemplateExpression(node.value)) {
    return
  }
  if (node.value.segments.some(s => s.expression !== undefined)) {
    report.error(typeSystemValidationMessages.typedLiteralInterpolation, { node, property: 'value' })
  }
}

/** validateTypedLiteralValueShape rejects mismatches between the declared base kind and the literal value, e.g.
 * `Person "Hi"` (struct type with a string value) or `Greeting { … }` (text type with an object value). */
function validateTypedLiteralValueShape(
  node: AST.TypedLiteralExpression,
  report: Reporter<AST.TypedLiteralExpression>,
): void {
  const tl = typedLiteralType(node)
  if (!tl) {
    return
  }
  const decl = tl.typeDecl
  const resolved = resolveTypeExpression(decl.base)
  if (resolved.kind === 'struct') {
    if (!AST.isObjectLiteral(node.value)) {
      report.error(
        typeSystemValidationMessages.typedLiteralWrongValueShape(tl.identityKey, 'struct literal `{ … }`'),
        { node, property: 'value' },
      )
    }
    return
  }
  if (resolved.kind === 'primitive' && AST.isObjectLiteral(node.value)) {
    report.error(
      typeSystemValidationMessages.typedLiteralWrongValueShape(tl.identityKey, `${resolved.primitive} literal`),
      { node, property: 'value' },
    )
  }
}

/** validateTypedStructLiteralFields enforces that a `Person { … }` literal lists exactly the fields declared on
 * `Person`'s struct shape, and that each field value's shape matches the declared field type. Recurses into
 * nested struct fields so deeply-nested object literals are checked against their declared sub-struct shape.
 * Field-type mismatches at the primitive level are surfaced by Typir; the validator focuses on shape (object vs
 * scalar) and presence/absence of fields. */
function validateTypedStructLiteralFields(
  node: AST.TypedLiteralExpression,
  report: Reporter<AST.TypedLiteralExpression>,
): void {
  if (!AST.isObjectLiteral(node.value)) {
    return
  }
  const struct = structShapeOfTypedLiteral(node)
  if (struct === undefined) {
    return
  }
  const tl = typedLiteralType(node)
  if (!tl) {
    return
  }
  validateStructFieldList(node.value, struct, tl.identityKey, report)
}

/** validateLocalTypeConstructorAmbiguity emits a production-blocking warning when a bare type constructor
 * in argument context resolves to a callee-local parameter type AND normal lexical/imported lookup also
 * resolves the same name to a different target. Qualified (`Badge.Title`) and dot-local (`.Title`) never warn. */
function validateLocalTypeConstructorAmbiguity(
  node: AST.TypedLiteralExpression,
  report: Reporter<AST.TypedLiteralExpression>,
): void {
  if (AST.isDotLocalTypeRef(node.type)) {
    return
  }
  if (!AST.isNamedTypeRef(node.type) || node.type.segments.length > 0) {
    return
  }
  const ref = node.type.ref?.ref
  if (!AST.isTypeDeclaration(ref)) {
    return
  }
  if (!ref.name.includes('.')) {
    return
  }

  const argCtx = findEnclosingArgumentContext(node)
  if (!argCtx) {
    return
  }

  const bareTypeName = node.type.ref?.$refText
  if (!bareTypeName) {
    return
  }

  const normalLexical = findLexicalTypeDeclaration(node, bareTypeName)
  if (!normalLexical) {
    return
  }
  if (normalLexical === ref) {
    return
  }

  report.warning(
    typeSystemValidationMessages.ambiguousLocalTypeConstructor(bareTypeName, argCtx.callee.name),
    { node, property: 'type' },
  )
}

/** validateDotLocalTypeRef checks `.Title` shorthand is used correctly:
 * 1. Inside an argument context
 * 2. Callee is a callable declaration (view or action)
 * 3. Callee has a local parameter type matching the name */
function validateDotLocalTypeRef(
  node: AST.TypedLiteralExpression,
  report: Reporter<AST.TypedLiteralExpression>,
): void {
  if (!AST.isDotLocalTypeRef(node.type)) {
    return
  }
  const dotName = `.${node.type.name}`

  const argCtx = findEnclosingArgumentContext(node)
  if (!argCtx) {
    report.error(
      typeSystemValidationMessages.dotLocalOutsideArgumentContext(dotName),
      { node, property: 'type' },
    )
    return
  }

  if (!isCallableDeclaration(argCtx.callee)) {
    report.error(
      typeSystemValidationMessages.dotLocalOnNonCallableCallee(dotName),
      { node, property: 'type' },
    )
    return
  }

  const local = getLocalParameterType(argCtx.callee, node.type.name)
  if (!local) {
    const kind = AST.isViewDeclaration(argCtx.callee) ? 'View' : 'Action'
    report.error(
      typeSystemValidationMessages.dotLocalMissingType(kind, argCtx.callee.name, dotName),
      { node, property: 'type' },
    )
  }
}

/** validateStructFieldList is the recursive worker for typed-struct-literal field validation. `qualifierName` is
 * the dotted type path used in diagnostics (e.g. `Person`, then `Person.Job` for the nested call). The reporter
 * is generic so the same instance threads through nested object literals while still emitting diagnostics on
 * inner `ObjectProperty` / `ObjectLiteral` nodes. */
function validateStructFieldList<NodeT extends AST.Node>(
  literal: AST.ObjectLiteral,
  struct: AST.StructTypeExpression,
  qualifierName: string,
  report: Reporter<NodeT>,
): void {
  const declaredNames = new Set(struct.fields.map(f => f.name))
  const providedNames = new Set<string>()
  for (const prop of literal.properties) {
    providedNames.add(prop.name)
    if (!declaredNames.has(prop.name)) {
      report.error(
        typeSystemValidationMessages.unknownStructField(qualifierName, prop.name),
        { node: prop, property: 'name' },
      )
      continue
    }
    const fieldType = structFieldTypeAt(struct, prop.name)
    if (fieldType === undefined) {
      continue
    }
    const fieldQualifier = `${qualifierName}.${prop.name}`
    const fieldResolved = resolveTypeExpression(fieldType)
    if (fieldResolved.kind === 'struct') {
      if (!valueIsStructLike(prop.value)) {
        report.error(
          typeSystemValidationMessages.structFieldWrongValueShape(fieldQualifier, 'struct literal `{ … }`'),
          { node: prop, property: 'value' },
        )
        continue
      }
      // Recurse into a bare object literal so nested fields are checked against the declared sub-struct shape.
      // Inner `TypedLiteralExpression` values run their own `validateTypedStructLiteralFields` validator pass.
      if (AST.isObjectLiteral(prop.value)) {
        validateStructFieldList(prop.value, fieldResolved.struct, fieldQualifier, report)
      }
      continue
    }
    if (fieldResolved.kind === 'primitive' && AST.isObjectLiteral(prop.value)) {
      report.error(
        typeSystemValidationMessages.structFieldWrongValueShape(fieldQualifier, `${fieldResolved.primitive} literal`),
        { node: prop, property: 'value' },
      )
    }
  }
  for (const expected of struct.fields) {
    if (!providedNames.has(expected.name)) {
      report.error(
        typeSystemValidationMessages.missingStructField(qualifierName, expected.name),
        { node: literal, property: 'properties' },
      )
    }
  }
}

/** valueIsStructLike returns true when `expr` could plausibly satisfy a struct-typed field — either a typed
 * struct literal, a bare object literal, or a member access reaching into a struct shape. */
function valueIsStructLike(expr: AST.Expression | AST.ObjectLiteral): boolean {
  if (AST.isObjectLiteral(expr)) {
    return true
  }
  if (AST.isTypedLiteralExpression(expr)) {
    return AST.isObjectLiteral(expr.value)
  }
  if (AST.isMemberAccessExpression(expr)) {
    return declaredStructShapeOfExpr(expr) !== undefined || staticObjectShapeOf(expr) !== undefined
  }
  return false
}

/** validateBareTypeAsValue reports when a `MemberAccessExpression` refers to a `TypeDeclaration` as a value
 * (bare, no property path). Types are not values — use `Type <value>` to construct one. */
function validateBareTypeAsValue(
  node: AST.MemberAccessExpression,
  report: Reporter<AST.MemberAccessExpression>,
): void {
  if (node.properties.length > 0) {
    return
  }
  const ref = node.root.ref
  if (!AST.isTypeDeclaration(ref)) {
    return
  }
  report.error(
    typeSystemValidationMessages.typeIsNotAValue(ref.name),
    { node, property: 'root' },
  )
}

/** validateDuplicateStructFieldNames reports when a struct type declaration repeats the same field name. */
function validateDuplicateStructFieldNames(
  node: AST.StructTypeExpression,
  report: Reporter<AST.StructTypeExpression>,
): void {
  const seen = new Set<string>()
  for (const field of node.fields) {
    if (seen.has(field.name)) {
      report.error(typeSystemValidationMessages.duplicateStructField(field.name), { node: field, property: 'name' })
    }
    seen.add(field.name)
  }
}

/** validateNamedTypeRef rejects nested-type segments (`Person.Job`) that don't resolve to a declared field on the
 * referenced type's struct shape. The bare-ref case is already handled by Langium's "Could not resolve" check. */
function validateNamedTypeRef(node: AST.NamedTypeRef, report: Reporter<AST.NamedTypeRef>): void {
  if (node.segments.length === 0) {
    return
  }
  const decl = node.ref?.ref
  if (!AST.isTypeDeclaration(decl)) {
    return
  }
  const resolved = resolveTypeExpression(node)
  if (resolved.kind !== 'unresolved') {
    return
  }
  const headName = node.ref?.$refText ?? decl.name
  report.error(
    typeSystemValidationMessages.unknownNestedTypeSegment(headName, node.segments.join('.')),
    { node, property: 'segments' },
  )
}

/** isStaticallyObjectShapedExpr returns true when `expr` statically resolves to an object literal. */
function isStaticallyObjectShapedExpr(expr: AST.Expression): boolean {
  return staticObjectShapeOf(expr) !== undefined
}

/** validateMemberAccessPath reports `Name.a.b.c` chains whose segments cannot exist given statically-known object shapes.
 * Assignment roots use object-literal shape; parameter roots use declared struct / `Person.Job` type shape. Skips when
 * the parameter's type cannot be resolved (e.g. broken cross-ref — Langium reports separately). */
function validateMemberAccessPath(
  node: AST.MemberAccessExpression,
  report: Reporter<AST.MemberAccessExpression>,
): void {
  if (node.properties.length === 0) {
    return
  }
  const root = node.root.ref
  if (AST.isParameterDeclaration(root)) {
    validateParameterMemberAccessPath(node, root, report)
    return
  }
  if (!AST.isAssignmentDeclaration(root)) {
    return
  }
  const decl = root
  const seen = new Set<AST.AssignmentDeclaration>([decl])
  let shape = staticObjectShapeOf(decl.value, seen)
  if (shape === undefined) {
    if (isKnownNonObjectExpr(decl.value)) {
      const firstKey = node.properties[0]!
      report.error(
        typeSystemValidationMessages.memberAccessNotOnObject(firstKey),
        { node, property: 'properties', index: 0 },
      )
    }
    return
  }
  for (let i = 0; i < node.properties.length; i++) {
    const key = node.properties[i]!
    const prop = shape.properties.find(p => p.name === key)
    if (prop === undefined) {
      report.error(
        typeSystemValidationMessages.unknownObjectProperty(key),
        { node, property: 'properties', index: i },
      )
      return
    }
    const isLast = i === node.properties.length - 1
    if (isLast) {
      return
    }
    const nextShape = staticObjectShapeOf(prop.value, seen)
    if (nextShape === undefined) {
      if (isKnownNonObjectExpr(prop.value)) {
        const nextKey = node.properties[i + 1]!
        report.error(
          typeSystemValidationMessages.memberAccessNotOnObject(nextKey),
          { node, property: 'properties', index: i + 1 },
        )
      }
      return
    }
    shape = nextShape
  }
}

/** validateParameterMemberAccessPath checks `Param.field.sub` against the parameter's declared type (including
 * `Person.Job`-style refs). Surfaces unknown keys and chains that continue past a primitive field. */
function validateParameterMemberAccessPath(
  node: AST.MemberAccessExpression,
  param: AST.ParameterDeclaration,
  report: Reporter<AST.MemberAccessExpression>,
): void {
  const props = node.properties
  const resolved = parameterResolvedType(param)
  if (resolved.kind === 'unresolved') {
    return
  }
  if (resolved.kind === 'primitive') {
    report.error(typeSystemValidationMessages.memberAccessNotOnObject(props[0]!), {
      node,
      property: 'properties',
      index: 0,
    })
    return
  }
  let currentStruct = resolved.struct
  let typeQualifier = parameterTypeName(param)
  for (let i = 0; i < props.length; i++) {
    const key = props[i]!
    const fieldType = structFieldTypeAt(currentStruct, key)
    if (fieldType === undefined) {
      report.error(typeSystemValidationMessages.unknownStructField(typeQualifier, key), {
        node,
        property: 'properties',
        index: i,
      })
      return
    }
    if (i === props.length - 1) {
      return
    }
    const fieldResolved = resolveTypeExpression(fieldType)
    if (fieldResolved.kind !== 'struct') {
      const nextKey = props[i + 1]!
      report.error(typeSystemValidationMessages.memberAccessNotOnObject(nextKey), {
        node,
        property: 'properties',
        index: i + 1,
      })
      return
    }
    currentStruct = fieldResolved.struct
    typeQualifier = `${typeQualifier}.${key}`
  }
}

/** validateNoObjectInPlusOperator rejects `+` when either operand is statically object-shaped. */
function validateNoObjectInPlusOperator(node: AST.BinaryExpression, report: Reporter<AST.BinaryExpression>): void {
  if (node.op !== '+') {
    return
  }
  if (isStaticallyObjectShapedExpr(node.left)) {
    report.error(typeSystemValidationMessages.objectNotAllowedInPlusOperator, { node, property: 'left' })
  }
  if (isStaticallyObjectShapedExpr(node.right)) {
    report.error(typeSystemValidationMessages.objectNotAllowedInPlusOperator, { node, property: 'right' })
  }
}

/** validateNoObjectInCallArgument rejects object-shaped values for primitive-typed parameters at any
 * argument-list host (`ViewRender` or `ActionRender`). Uses `resolveArgumentBindings` to find the
 * resolved parameter for each argument, then checks whether that parameter accepts structs. */
function validateNoObjectInCallArgument<HostT extends AST.ArgumentListHost>(
  node: HostT,
  report: Reporter<HostT>,
): void {
  const callee = getCalleeDeclaration(node)
  if (callee === undefined) {
    return
  }
  const result = resolveArgumentBindings(callee, node.argumentList)
  for (const [arg, param] of result.bindings) {
    if (!isStaticallyObjectShapedExpr(arg)) {
      continue
    }
    if (parameterAcceptsStruct(param)) {
      continue
    }
    report.error(typeSystemValidationMessages.objectNotAllowedInCallArgument, arg as AST.Node)
  }
}

/** parameterAcceptsStruct returns true when the parameter's declared type resolves to a struct shape. */
function parameterAcceptsStruct(param: AST.ParameterDeclaration): boolean {
  return parameterResolvedType(param).kind === 'struct'
}

/** validateActionRenderCallee rejects `do <Name>` when the resolved callee is not an `action` declaration. */
function validateActionRenderCallee(node: AST.ActionRender, report: Reporter<AST.ActionRender>): void {
  const ref = node.action?.ref
  if (ref === undefined) {
    return
  }
  if (AST.isActionDeclaration(ref)) {
    return
  }
  const kind = calleeKind(ref)
  report.error(typeSystemValidationMessages.doMustReferenceAction(kind), { node, property: 'action' })
}

/** calleeKind returns a short user-visible kind label for a referenced declaration (used in `do` callee
 * diagnostics). */
function calleeKind(ref: AST.Declaration): string {
  if (AST.isViewDeclaration(ref)) {
    return 'view'
  }
  if (AST.isAssignmentDeclaration(ref)) {
    return ref.type
  }
  if (AST.isAppDeclaration(ref)) {
    return 'app'
  }
  if (AST.isTypeDeclaration(ref)) {
    return 'type'
  }
  return ref.$type
}
