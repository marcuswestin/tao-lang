import { observable } from '@legendapp/state'
import React from 'react'
import { OperatorMap } from './runtime-operators'
import { useStore } from './runtime-store'

type AnyFn = (...args: any[]) => any

interface ExpressionI<T> {
  read(): T
  useState(scope?: TaoScope): StateUseI<T>
}
interface StateUseI<T> {
  read(): T
}

interface WritableStateUseI<T> extends StateUseI<T> {
  update(fn: (val: T) => T): void
}

type TaoScope = Record<string, any>

abstract class Expression<T> implements ExpressionI<T> {
  constructor(protected value: T) {
  }

  read() {
    return this.value
  }
  useState(_scope?: TaoScope) {
    return this
  }
}

/** TaoAction wraps an action function. useState(scope) returns a scope-bound handle
 * so that .read() yields a closure that passes the caller's scope at invocation time. */
class TaoAction {
  constructor(private fn: AnyFn) {}

  read() {
    return this.fn
  }

  useState(scope?: TaoScope) {
    if (scope) {
      const fn = this.fn
      return { read: () => (...args: any[]) => fn(scope, ...args) }
    }
    return this
  }
}

class PrimitiveExpression<T> extends Expression<T> {
  override read() {
    return this.value
  }
}

export const TaoRuntime = new class TaoRuntime {
  // TODO: Confirm compiled Tao only passes stable `initialValue` (e.g. primitives); changing identity each render would recreate the observable.
  useViewState<T>(initialValue: T) {
    const state$ = React.useMemo(() => observable(initialValue), [initialValue])
    return useStore(state$)
  }

  TopLevelState<T>(initialValue: T) {
    const state$ = observable(initialValue)
    return useStore(state$)
  }

  /** pushScope returns a new scope that prototypally inherits from `parent` scope. */
  pushScope(parent: TaoScope): TaoScope {
    return Object.create(parent ?? Object.prototype) as TaoScope
  }

  useExpression<T>(expression: Expression<T>) {
    return expression
  }

  StringLiteral(value: string) {
    return new PrimitiveExpression(value)
  }

  NumberLiteral(value: number) {
    return new PrimitiveExpression(value)
  }

  Function(func: (...args: any[]) => any) {
    return func
  }

  Alias<T>(value: ExpressionI<T>) {
    return value
  }

  Action(action: AnyFn) {
    return new TaoAction(action)
  }

  /** updateState applies =, +=, or -= to a StateUse-backed cell. */
  updateState<T>(stateRef: WritableStateUseI<T>, op: string, operand: T) {
    stateRef.update((curr) => {
      return OperatorMap[op as keyof typeof OperatorMap]<T>(curr, operand) as T
    })
  }
}()
