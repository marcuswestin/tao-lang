import * as LegendAppState from '@legendapp/state'
import * as LegendAppStateReact from '@legendapp/state/react'

import { Assert, switch_Exhaustive } from './runtime-utils'
import { Views } from './Views'

export namespace I {
  // Internal types
  /////////////////

  export type JSAtomValue = string | number | boolean
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
    updateValue(operator: string, value: I.Expression): void
  }
}

// TAO RUNTIME
//////////////

export const TR: _TaoRuntime = {
  // Scoping
  BlockScope,
  Declare,

  // Atom Value Expressions
  Literal,
  AppState,
  ViewState,

  // Compound Expressions
  Alias,
  BinaryOperation,
  UnaryOperation,

  // Invocable Expressions
  Action,

  // Views. TODO: Move this to @tao/ui
  Views,
} as const

export type _TaoRuntime = {
  BlockScope: typeof BlockScope
  Declare: typeof Declare

  Literal: typeof Literal
  AppState: typeof AppState
  ViewState: typeof ViewState

  Alias: typeof Alias
  BinaryOperation: typeof BinaryOperation
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
    readonly jsValue: I.JSAtomValue,
  ) {}
  render(): I.Rendered {
    return this.jsValue
  }
}

function Literal(value: I.JSAtomValue) {
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

function AppState(
  initialValue: I.ImmutableExpression,
): I.MutableState {
  const initialValueT = initialValue.evaluate().jsValue
  const store$ = LegendAppState.observable(initialValueT)
  return new MutableState(store$)
}

function ViewState(
  initialValue: I.ImmutableExpression,
): I.MutableState {
  const initialValueT = initialValue.evaluate().jsValue
  const store$ = LegendAppStateReact.useObservable(initialValueT)
  return new MutableState(store$)
}

type AssignmentOperator = '=' | '+=' | '-=' | '*=' | '/='

class MutableState implements I.MutableState {
  constructor(
    private store$: LegendAppState.ObservablePrimitive<I.JSAtomValue>,
  ) {}

  evaluate(): Value {
    const val = this.store$.get()
    return new Value(val) as Value
  }
  updateValue(operator: AssignmentOperator, value: I.Expression) {
    const newValue = value.evaluate().jsValue
    if (operator === '=') {
      return this.store$.set(newValue)
    }
    const current = this.store$.peek()
    Assert(typeof current === 'number' && typeof newValue === 'number', 'Compound assignment requires numeric operands')
    this.store$.set(switch_Exhaustive(operator, {
      '+=': () => current + newValue,
      '-=': () => current - newValue,
      '*=': () => current * newValue,
      '/=': () => current / newValue,
    }))
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
  return new UnaryOperationClass(op, operand)
}

class UnaryOperationClass implements I.Expression {
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
    return this
  }
}

function BinaryOperation<
  LeftT extends I.Expression,
  RightT extends I.Expression,
>(left: LeftT, operator: BinaryOperators, right: RightT): I.Expression {
  return new BinaryOperationClass(left, operator, right)
}

class BinaryOperationClass<
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
    const leftJSValue = this.left.evaluate().jsValue as number
    const rightJSValue = this.right.evaluate().jsValue as number

    const leftType = typeof leftJSValue
    const rightType = typeof rightJSValue

    if (this.operator === '+') {
      Assert(
        (leftType === 'string' || rightType === 'string')
          || (leftType === 'number' && rightType === 'number'),
      )
    } else {
      Assert(leftType === 'number' && rightType === 'number')
    }

    return switch_Exhaustive(this.operator, {
      '+': () => new Value(leftJSValue + rightJSValue),
      '*': () => new Value(leftJSValue * rightJSValue),
      '-': () => new Value(leftJSValue - rightJSValue),
      '/': () => new Value(leftJSValue / rightJSValue),
    })
  }

  useReactiveHandle(): I.Expression {
    return this
  }
}

// INVOCABLES
/////////////

function Action(fn: () => void) {
  return new Invocable<void>(fn)
}

class Invocable<ReturnType> {
  readonly $type = 'Invocable'

  constructor(
    readonly fn: () => ReturnType,
  ) {}
  invoke(): ReturnType {
    return this.fn()
  }
  useReactiveHandle() {
    return this
  }
}
