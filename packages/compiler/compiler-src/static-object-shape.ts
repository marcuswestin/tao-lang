import { AST } from '@parser/parser'

/** staticObjectShapeOf returns the `ObjectLiteral` that `expr` statically resolves to, or `undefined` when the shape cannot be determined (parameters, runtime-only values, or chains through unresolvable references). `seen` guards against declaration cycles. Typed struct literals (`Person { … }`) unwrap to their inner `ObjectLiteral` so callers see one shape model regardless of whether the struct is nominal or anonymous. */
export function staticObjectShapeOf(
  expr: AST.Expression | AST.ObjectLiteral | undefined,
  seen: Set<AST.AssignmentDeclaration> = new Set(),
): AST.ObjectLiteral | undefined {
  if (AST.isObjectLiteral(expr)) {
    return expr
  }
  if (AST.isTypedLiteralExpression(expr) && AST.isObjectLiteral(expr.value)) {
    return expr.value
  }
  if (!AST.isMemberAccessExpression(expr)) {
    return undefined
  }
  const decl = expr.root.ref
  if (!AST.isAssignmentDeclaration(decl) || seen.has(decl)) {
    return undefined
  }
  seen.add(decl)
  const rootShape = staticObjectShapeOf(decl.value, seen)
  return walkStaticPathToObjectLiteral(rootShape, expr.properties, seen)
}

/** walkStaticPathToObjectLiteral descends `shape` through `path`, returning the `ObjectLiteral` at each terminal segment, or `undefined` when any step is missing or not an object. */
function walkStaticPathToObjectLiteral(
  shape: AST.ObjectLiteral | undefined,
  path: readonly string[],
  seen: Set<AST.AssignmentDeclaration>,
): AST.ObjectLiteral | undefined {
  let current = shape
  for (const key of path) {
    if (current === undefined) {
      return undefined
    }
    const prop = current.properties.find(p => p.name === key)
    if (prop === undefined) {
      return undefined
    }
    current = staticObjectShapeOf(prop.value, seen)
  }
  return current
}

/** staticValueExprAtMemberPath returns the value expression at `path` on `decl`'s statically-known object literal root, or `undefined` when the path cannot be resolved. */
export function staticValueExprAtMemberPath(
  decl: AST.AssignmentDeclaration,
  path: readonly string[],
  seen: Set<AST.AssignmentDeclaration> = new Set(),
): AST.Expression | undefined {
  if (path.length === 0) {
    return undefined
  }
  let shape = staticObjectShapeOf(decl.value, seen)
  for (const key of path) {
    if (shape === undefined) {
      return undefined
    }
    const prop = shape.properties.find(p => p.name === key)
    if (prop === undefined) {
      return undefined
    }
    shape = staticObjectShapeOf(prop.value, seen)
  }
  return undefined
}

/** isKnownNonObjectExpr returns true when `expr` is statically a scalar (literal / arithmetic / action / string template / non-struct typed literal), i.e. definitely not an object. */
export function isKnownNonObjectExpr(expr: AST.Expression | AST.ObjectLiteral): boolean {
  if (AST.isObjectLiteral(expr)) {
    return false
  }
  if (
    AST.isStringTemplateExpression(expr)
    || AST.isNumberLiteral(expr)
    || AST.isBinaryExpression(expr)
    || AST.isUnaryExpression(expr)
    || AST.isActionExpression(expr)
  ) {
    return true
  }
  if (AST.isTypedLiteralExpression(expr)) {
    return !AST.isObjectLiteral(expr.value)
  }
  return false
}
