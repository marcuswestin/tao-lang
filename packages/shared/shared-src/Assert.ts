import { throwUnexpectedBehaviorError } from './TaoErrors'

/** Assert asserts truth or throws unexpected-behavior; `Assert.never` is for unreachable exhaustive-switch branches;
 * `Assert.is(value, guard, msg, ...logInfo)` narrows `value` when `guard(value)` is true. */
export const Assert: AssertFn = Object.assign(assertCondition, {
  never: AssertNeverFn,
  is: AssertIsFn,
})

/** assertCondition throws `UnexpectedBehaviorError` when `condition` is falsy, embedding `expectedConditionDescription`
 * and merging optional `logInfo` objects into the error’s diagnostic payload. */
function assertCondition<T>(
  condition: T,
  expectedConditionDescription: string,
  ...logInfo: Record<string, unknown>[]
): asserts condition is NonNullable<T> {
  if (!condition) {
    throwUnexpectedBehaviorError({
      humanMessage: `Expected: ${expectedConditionDescription}`,
      cause: new Error('AssertError'),
      logInfo: { condition: condition, info: logInfo },
    })
  }
}

/** AssertNeverFn throws at runtime when reached; use as exhaustive switch default so missing cases are a type error.
 * - Example: `default: Assert.never(expr)`. */
function AssertNeverFn<T extends never>(_arg: T): never {
  throw new Error(`Assert.never called`)
}

/** AssertIsFn throws when `guard(value)` is falsy; when it passes, narrows `value` to `T` (e.g.
 * `Assert.is(value, AST.isTaoFile, 'parse result must be TaoFile', { documentUri })`). */
function AssertIsFn<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  expectedConditionDescription: string,
  ...logInfo: Record<string, unknown>[]
): asserts value is T {
  assertCondition(guard(value), expectedConditionDescription, { value }, ...logInfo)
}

// Types
////////

/** AssertFn is the callable assertion plus `never` / `is`; explicit typing is required so TS accepts `Assert(...)` assertion calls. */
type AssertFn = {
  <T>(
    condition: T,
    expectedConditionDescription: string,
    ...logInfo: Record<string, unknown>[]
  ): asserts condition is NonNullable<T>
  never: <T extends never>(_arg: T) => never
  is: AssertIsMethod
}

type AssertIsMethod = <T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  expectedConditionDescription: string,
  ...logInfo: Record<string, unknown>[]
) => asserts value is T
