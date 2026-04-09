import React from 'react'

export function wrapReactUseState<T>([val, setter]: [T, (val: T) => void]) {
  return new StateAccessUse(() => val, setter)
}

class StateAccessUse<T> {
  constructor(
    readonly get: () => T,
    readonly set: (val: T) => void,
  ) {
  }

  read(): T {
    return this.get()
  }

  write(val: T) {
    this.set(val)
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

class ReactState<T> extends Expression<T> {
  private setter: (value: T) => void

  use() {
    const [value, setter] = React.useState(this.value)
    this.setter = setter
    return value
  }

  update(value: T) {
    this.setter(value)
  }
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
  useState<T>(value: T) {
    return value
    // return React.useState(value)
  }

  useNamedReference(name: string) {
    return name
    // return // ???
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

  updateState(stateRef: any, op: string, value: any) {
    return
    // return stateRef.update(op, value)
  }
}()
