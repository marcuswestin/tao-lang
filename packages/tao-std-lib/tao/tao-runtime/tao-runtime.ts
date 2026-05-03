import * as LegendAppState from '@legendapp/state'
import * as LegendAppStateReact from '@legendapp/state/react'
import React from 'react'

import { Assert, switch_Exhaustive } from './runtime-utils'
import { Views } from './Views'

export namespace I {
  // Internal types
  /////////////////

  export type JSAtomValue = string | number | boolean
  /** JSObjectValue is a plain object tree used for Tao object literals and object state. */
  export type JSObjectValue = { [k: string]: JSValue }
  export type JSValue = JSAtomValue | JSObjectValue
  export type Name = string // & { __name: true }
  export type Rendered = React.ReactNode

  export type Store = {
    snapshotValue(): Value
    set(value: Value): void
  }

  // External types
  /////////////////

  export type Scope = Record<string, any>

  export interface Expression {
    evaluate(): Value
    useReactiveHandle(): Expression
  }

  export interface Reference<I> {
    resolve(): I
  }

  export interface ImmutableExpression extends Expression {
  }
  export interface MutableState extends Expression {
    updateValue(operator: string, value: I.Expression, propertyPath?: readonly string[]): void
  }
}

// TAO RUNTIME
//////////////

export const TR: _TaoRuntime = {
  // Scoping
  BlockScope,
  Declare,
  ForEachQueryRow,

  // Atom Value Expressions
  Literal,
  AppState,
  ViewState,

  // Compound Expressions
  Alias,
  BinaryOperation,
  MemberAccess,
  Object: TaoObject,
  StringTemplate,
  UnaryOperation,

  // Invocable Expressions
  Action,

  // Views. TODO: Move this to @tao/ui
  Views,
} as const

export type _TaoRuntime = {
  BlockScope: typeof BlockScope
  Declare: typeof Declare
  ForEachQueryRow: typeof ForEachQueryRow

  Literal: typeof Literal
  AppState: typeof AppState
  ViewState: typeof ViewState

  Alias: typeof Alias
  BinaryOperation: typeof BinaryOperation
  MemberAccess: typeof MemberAccess
  Object: typeof TaoObject
  StringTemplate: typeof StringTemplate
  UnaryOperation: typeof UnaryOperation

  Action: typeof Action

  Views: typeof Views
}

// SCOPES & Runtime safety
//////////////////////////

function BlockScope<ScopeT extends I.Scope, ReturnT>(parentScope: ScopeT, fn: (scope: ScopeT) => ReturnT) {
  const _Scope = Object.create(parentScope ?? Object.prototype) as ScopeT
  return fn(_Scope)
}

/** queryResultRowsForListQuery returns `scope[queryAlias].data` when it is an array; otherwise an empty list. */
function queryResultRowsForListQuery(scope: I.Scope, queryAlias: string): readonly unknown[] {
  const data = scope[queryAlias]?.data
  return Array.isArray(data) ? data : []
}

/** queryForEachRowReactKey prefers a string `id` on object-shaped rows; otherwise falls back to the row index. */
function queryForEachRowReactKey(item: unknown, fallbackIndex: number): string {
  if (typeof item === 'object' && item !== null) {
    const id = Reflect.get(item, 'id')
    if (typeof id === 'string' && id.length > 0) {
      return id
    }
  }
  return String(fallbackIndex)
}

/** castQueryRowToJSValue is the single boundary where a provider row is treated as {@link I.JSValue} for {@link Literal} (Tao-validated query rows are object-shaped). */
function castQueryRowToJSValue(row: object): I.JSValue {
  return row as I.JSValue
}

/** bindQueryRowLiteral exposes the current row on `scope` under `bindingName` as a literal expression. */
function bindQueryRowLiteral(scope: I.Scope, bindingName: string, row: unknown): void {
  Assert(row !== null && typeof row === 'object', 'For-each query row must be an object (validator contract).')
  Object.assign(scope, { [bindingName]: Literal(castQueryRowToJSValue(row)) })
}

/** ForEachQueryRow maps `scope[queryAlias].data` rows into keyed fragments, binding each row as `Literal` on `bindingName` in a child scope before `renderRow`. */
function ForEachQueryRow<ScopeT extends I.Scope>(
  parentScope: ScopeT,
  queryAlias: string,
  bindingName: string,
  renderRow: (rowScope: ScopeT) => I.Rendered,
): I.Rendered {
  const rows = queryResultRowsForListQuery(parentScope, queryAlias)
  return React.createElement(
    React.Fragment,
    null,
    ...rows.map((item, idx) =>
      BlockScope(parentScope, (rowScope) => {
        bindQueryRowLiteral(rowScope, bindingName, item)
        const inner = renderRow(rowScope)
        return React.createElement(React.Fragment, { key: queryForEachRowReactKey(item, idx) }, inner)
      })
    ),
  )
}

/**
 * Declare asserts that `scope` now has the properties of `declarations` as well
 * Usage:
 *   const a = { a: 1 }
 *   Declare(a, { b: 2 })
 *   a.b // now typed as number
 */
function Declare<
  ScopeT extends I.Scope,
  Decls extends object,
>(_Scope: ScopeT): asserts _Scope is ScopeT & Decls {
  // Runtime no-op; type assertion only
}

// Atom Value Expressions
/////////////////////////

class Value {
  readonly $type: string = 'Value'

  constructor(
    readonly jsValue: I.JSValue,
  ) {}
  render(): I.Rendered {
    Assert(typeof this.jsValue !== 'object', 'Object-shaped values cannot be rendered (validator should reject).')
    return String(this.jsValue)
  }
}

function Literal<T extends I.JSValue>(value: T) {
  return new LiteralExpression(value)
}

class LiteralExpression extends Value implements I.ImmutableExpression {
  override readonly $type = 'LiteralExpression'

  evaluate(): Value {
    return new Value(this.jsValue) as Value
  }
  useReactiveHandle(): I.Expression {
    return this
  }
}

type StringTemplatePart =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'expr'; readonly expr: I.Expression }

/** StringTemplate concatenates literal text with evaluated primitive interpolation holes. */
function StringTemplate(parts: readonly StringTemplatePart[]) {
  return new StringTemplateExpression(parts)
}

class StringTemplateExpression implements I.Expression {
  readonly $type = 'StringTemplateExpression'

  constructor(readonly parts: readonly StringTemplatePart[]) {}

  evaluate(): Value {
    let s = ''
    for (const p of this.parts) {
      if (p.kind === 'text') {
        s += p.value
      } else {
        const v = p.expr.evaluate().jsValue
        Assert(
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
          'Template interpolation must be a primitive (string/number/boolean) value (validator should reject).',
        )
        s += String(v)
      }
    }
    return new Value(s)
  }

  useReactiveHandle(): I.Expression {
    for (const p of this.parts) {
      if (p.kind === 'expr') {
        p.expr.useReactiveHandle()
      }
    }
    return this
  }
}

function AppState(
  initialValue: I.ImmutableExpression,
): I.MutableState {
  const initialValueT = initialValue.evaluate().jsValue
  const store$ = LegendAppState.observable(initialValueT) as LegendAppState.Observable<I.JSValue>
  return new MutableState(store$)
}

function ViewState(
  initialValue: I.ImmutableExpression,
): I.MutableState {
  const initialValueT = initialValue.evaluate().jsValue
  const store$ = LegendAppStateReact.useObservable(initialValueT) as LegendAppState.Observable<I.JSValue>
  return new MutableState(store$)
}

type AssignmentOperator = '=' | '+=' | '-=' | '*=' | '/='
type CompoundAssignmentOperator = '+=' | '-=' | '*=' | '/='

/** compoundNumberResult applies a compound assignment operator to two numbers. */
function compoundNumberResult(operator: CompoundAssignmentOperator, current: number, newValue: number): number {
  return switch_Exhaustive(operator, {
    '+=': (_op) => current + newValue,
    '-=': (_op) => current - newValue,
    '*=': (_op) => current * newValue,
    '/=': (_op) => current / newValue,
  })
}

class MutableState implements I.MutableState {
  constructor(
    private store$: LegendAppState.Observable<I.JSValue>,
  ) {}

  /** observableAt returns the Legend observable at nested propertyPath (each key indexes nested observables). Validator guarantees the path exists on the state's static shape. */
  observableAt(propertyPath: readonly string[]): LegendAppState.ObservableParam {
    let target$ = this.store$ as LegendAppState.ObservableParam
    for (const key of propertyPath) {
      target$ = (target$ as unknown as Record<string, LegendAppState.ObservableParam>)[key]!
    }
    return target$
  }

  evaluate(): Value {
    const val = this.store$.get() as I.JSValue
    return new Value(val) as Value
  }
  updateValue(operator: AssignmentOperator, value: I.Expression, propertyPath: readonly string[] = []) {
    const target$ = this.observableAt(propertyPath)
    const newValue = value.evaluate().jsValue
    if (operator === '=') {
      target$.set(newValue)
      return
    }
    const current = target$.peek() as I.JSValue
    Assert(typeof current === 'number' && typeof newValue === 'number', 'Compound assignment requires numeric operands')
    target$.set(compoundNumberResult(operator, current, newValue))
  }
  useReactiveHandle() {
    LegendAppStateReact.useSelector(this.store$)
    return this
  }
}

// Compound Expressions
///////////////////////

function Alias(value: I.Expression) {
  return value
}

type BinaryOperators = '+' | '-' | '*' | '/'

/** UnaryOperation builds a unary numeric expression (currently `-` only). */
function UnaryOperation(op: string, operand: I.Expression): I.Expression {
  return new UnaryOperationExpression(op, operand)
}

class UnaryOperationExpression implements I.Expression {
  readonly $type = 'UnaryOperation'

  constructor(
    readonly op: string,
    readonly operand: I.Expression,
  ) {}

  evaluate(): Value {
    const value = this.operand.evaluate().jsValue
    Assert(typeof value === 'number')
    return switch_Exhaustive(this.op, {
      '-': () => new Value(-value),
    })
  }

  useReactiveHandle(): I.Expression {
    this.operand.useReactiveHandle()
    return this
  }
}

function BinaryOperation<
  LeftT extends I.Expression,
  RightT extends I.Expression,
>(left: LeftT, operator: BinaryOperators, right: RightT): I.Expression {
  return new BinaryOperationExpression(left, operator, right)
}

class BinaryOperationExpression<
  LeftT extends I.Expression,
  RightT extends I.Expression,
> implements I.Expression {
  readonly $type = 'BinaryOperation'

  constructor(
    readonly left: LeftT,
    readonly operator: BinaryOperators,
    readonly right: RightT,
  ) {}
  evaluate(): Value {
    const leftJSValue = this.left.evaluate().jsValue
    const rightJSValue = this.right.evaluate().jsValue
    const leftType = typeof leftJSValue
    const rightType = typeof rightJSValue

    Assert(leftType !== 'object' && rightType !== 'object', 'Object-shaped operands are not allowed.')

    return switch_Exhaustive(this.operator, {
      '+': () => {
        if (leftType === 'string' && rightType === 'string') {
          return new Value((leftJSValue as string) + (rightJSValue as string))
        }
        Assert(leftType === 'number' && rightType === 'number', '`+` requires text + text or number + number')
        return new Value((leftJSValue as number) + (rightJSValue as number))
      },
      '*': () => {
        if (leftType === 'string' && rightType === 'number') {
          return new Value((leftJSValue as string).repeat(Number(rightJSValue as number)))
        }
        Assert(leftType === 'number' && rightType === 'number', '`*` requires number * number or text * number')
        return new Value((leftJSValue as number) * (rightJSValue as number))
      },
      '-': () => {
        Assert(leftType === 'number' && rightType === 'number', '`-` requires number - number')
        return new Value((leftJSValue as number) - (rightJSValue as number))
      },
      '/': () => {
        Assert(leftType === 'number' && rightType === 'number', '`/` requires number / number')
        return new Value((leftJSValue as number) / (rightJSValue as number))
      },
    })
  }

  useReactiveHandle(): I.Expression {
    this.left.useReactiveHandle()
    this.right.useReactiveHandle()
    return this
  }
}

/** TaoObject builds a plain object value from property name to sub-expressions. */
function TaoObject(properties: Record<string, I.Expression>) {
  return new ObjectExpression(properties)
}

class ObjectExpression implements I.Expression {
  readonly $type = 'ObjectExpression'
  constructor(readonly properties: Record<string, I.Expression>) {}
  evaluate(): Value {
    const out: I.JSObjectValue = {}
    for (const [k, expr] of Object.entries(this.properties)) {
      out[k] = expr.evaluate().jsValue
    }
    return new Value(out)
  }
  useReactiveHandle(): I.Expression {
    return this
  }
}

/** MemberAccess reads a nested `path` of properties off `root`. The path is flat (codegen emits the full chain in one call); empty paths are not produced by the compiler. */
function MemberAccess(root: I.Expression, path: readonly string[]) {
  return new MemberAccessExpression(root, path)
}

class MemberAccessExpression implements I.Expression {
  constructor(
    readonly root: I.Expression,
    readonly path: readonly string[],
  ) {}
  evaluate(): Value {
    if (this.root instanceof MutableState) {
      const leaf$ = this.root.observableAt(this.path) as LegendAppState.Observable<I.JSValue>
      return new Value(leaf$.peek() as I.JSValue)
    }
    if (this.path.length === 0) {
      return new Value(this.root.evaluate().jsValue)
    }
    let current: I.JSValue = this.root.evaluate().jsValue
    for (const key of this.path) {
      const object = current as I.JSObjectValue
      current = object[key]!
    }
    return new Value(current)
  }
  useReactiveHandle(): I.Expression {
    if (this.root instanceof MutableState) {
      LegendAppStateReact.useSelector(this.root.observableAt(this.path))
    } else {
      this.root.useReactiveHandle()
    }
    return this
  }
}

// INVOCABLES
/////////////

/** ActionProps is the bag of evaluated `TR.Expression` values that an action invocation passes for the
 * callee's parameters. The compiler's argument-binding resolver keys this record on the resolved parameter
 * name (after by-type matching), so the action body can read `_ActionProps.<ParamName>` directly. */
export type ActionProps = Record<string, I.Expression>

function Action(fn: (props: ActionProps) => void) {
  return new Invocable<void>(fn)
}

class Invocable<ReturnType> {
  readonly $type = 'Invocable'

  constructor(
    readonly fn: (props: ActionProps) => ReturnType,
  ) {}
  /** invoke runs the action's body. `props` carries the per-parameter expressions resolved by the call site
   * (see `ActionRender` codegen); paramless actions ignore the argument. */
  invoke(props: ActionProps): ReturnType {
    return this.fn(props)
  }
  useReactiveHandle() {
    return this
  }
}
