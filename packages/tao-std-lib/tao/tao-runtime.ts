import React from 'react'

/** StateUse pairs a snapshot getter with React's useState setter for Tao compiled state. */
export class StateUse<T> {
  constructor(
    readonly value: T,
    readonly setter: (val: T) => void,
  ) {}

  read(): T {
    return this.value
  }

  update(fn: (val: T) => T) {
    this.setter(fn(this.value))
  }
}

interface ExpressionI<T> {
  use(): T
}
interface StateI<T> extends ExpressionI<T> {
  update(value: T): void
}

abstract class Expression<T> implements ExpressionI<T> {
  constructor(protected value: T) {
  }

  use() {
    return this.value
  }
}

class StringLiteral extends Expression<string> {
}

class Action extends Expression<() => void> {
  invoke() {
    return this.value()
  }
}

class Function extends Expression<(...args: any[]) => any> {
  use(...args: any[]) {
    return this.value(...args)
  }
}

class NumberLiteral extends Expression<number> {
}

type ReferenceName = string & { __ReferenceName: true }

export const TaoRuntime = new class TaoRuntime {
  /** useState allocates React state and returns a StateUse for read/write. */
  useState<T>(initialValue: T) {
    const [value, setter] = React.useState<T>(initialValue)
    return new StateUse<T>(value, setter)
  }

  /** useNamedReference reads StateUse in expressions; passes actions and other refs through unchanged. */
  useNamedReference<T>(ref: T): T {
    if (ref instanceof StateUse) {
      return ref.read()
    } else {
      return ref
    }
  }

  useExpression<T>(expression: Expression<T>) {
    return expression
    // return expression.use()
  }

  StringLiteral(value: string) {
    return value
    // return new StringLiteral(value)
  }

  NumberLiteral(value: number) {
    return value
    // return new NumberLiteral(value)
  }

  Function(func: (...args: any[]) => any) {
    return func
    // return new Function(func)
  }

  Alias<T>(value: ExpressionI<T>) {
    return value
    // return value
  }

  Action(action: () => void) {
    return action
    // return new Action(action)
  }

  /** updateState applies =, +=, or -= to a StateUse-backed cell. */
  updateState<T>(stateRef: StateUse<T>, op: string, value: T) {
    stateRef.update((curr) => OperatorMap[op]<T>(curr, value))
  }
}()

const OperatorMap = {
  '=': <T>(_curr: T, operand: T) => operand as number,
  '+=': <T>(curr: T, operand: T) => (curr as number) + (operand as number),
  '-=': <T>(curr: T, operand: T) => (curr as number) - (operand as number),
} as const
