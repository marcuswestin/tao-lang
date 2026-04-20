// TODO: import `switch_Exhaustive` / `Assert` from @shared once tao-std-lib can take that dependency (or via bundle).

/** switch_Exhaustive returns `handlers[value](value)` for a discriminated `value` with exhaustive `handlers` keys. */
export function switch_Exhaustive<T extends string | number | symbol, ResultT>(
  value: T,
  handlers: { [K in T]: (value: K) => ResultT },
): ResultT {
  return handlers[value](value)
}

/** Assert throws when `condition` is falsy, using `message` when provided. */
export function Assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed')
  }
}
