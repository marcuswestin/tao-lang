import { observable } from '@legendapp/state'
import React from 'react'
import { OperatorMap } from './runtime-operators'
import { useStore } from './runtime-store'

type AnyFn<Args extends unknown[] = unknown[], R = unknown> = (...args: Args) => R

interface ExpressionI<T> {
  read(): T
  useState(): StateUseI<T>
}
interface StateUseI<T> {
  read(): T
}

interface WritableStateUseI<T> extends StateUseI<T> {
  update(fn: (val: T) => T): void
}

abstract class Expression<T> implements ExpressionI<T> {
  constructor(protected value: T) {
  }

  read() {
    return this.value
  }
  useState() {
    return this
  }
}

class Action extends Expression<() => void> {
  invoke() {
    return this.value()
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

  useExpression<T>(expression: Expression<T>) {
    return expression
    // return expression.useState()
  }

  StringLiteral(value: string) {
    return new PrimitiveExpression(value)
  }

  NumberLiteral(value: number) {
    return new PrimitiveExpression(value)
  }

  Function(func: (...args: any[]) => any) {
    return func
    // return new Function(func)
  }

  Alias<T>(value: ExpressionI<T>) {
    return value
    // return value
  }

  Action(action: AnyFn<unknown[], void>) {
    return new Action(action)
  }

  /** updateState applies =, +=, or -= to a StateUse-backed cell. */
  updateState<T>(stateRef: WritableStateUseI<T>, op: string, operand: T) {
    stateRef.update((curr) => {
      return OperatorMap[op as keyof typeof OperatorMap]<T>(curr, operand) as T
    })
  }
}()
