// view state declaration compile:
// `const <NAME> = wrapReact(useState(<INITIAL VALUE>))`
// ...
// <NAME>.read()
// ...
// action { <NAME>.write(<NEW VALUE EXPRESSION>) }

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
