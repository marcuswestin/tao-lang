// Shared Error handling across all tao code
////////////////////////////////////////////

export function isTaoAssertError(error: unknown): error is TaoAssertError {
  return error instanceof TaoAssertError
}

export function Assert<T>(condition: T, humanMessage: string): asserts condition is NonNullable<T> {
  if (!condition) {
    throw new TaoAssertError(humanMessage)
  }
}
/** @deprecated Use `Assert()` instead. */
export function throwTaoAssertError(humanMessage: string): never {
  throw new TaoAssertError(humanMessage)
}

export function isTaoError(error: unknown): error is TaoError {
  return error instanceof BaseTaoError
}

export interface TaoError {
  humanMessage: string
  __brand__TaoError: symbol
}

// Class Implementations
////////////////////////

export abstract class BaseTaoError extends Error implements TaoError {
  public readonly __brand__TaoError = Symbol('TaoErrorBrand')

  constructor(public readonly humanMessage: string, cause?: Error) {
    super(humanMessage, { cause })
  }
}

class TaoAssertError extends BaseTaoError {
  constructor(
    public override readonly humanMessage: string,
  ) {
    super(humanMessage)
  }
}

export function isTaoWrappedError(error: unknown): error is TaoWrappedError {
  return error instanceof TaoWrappedError
}

export class TaoWrappedError extends BaseTaoError {
  override readonly cause?: Error

  constructor(humanMessage: string, cause?: Error) {
    super(humanMessage, cause)
    this.name = 'WrappedError'
    this.cause = cause

    // Exclude this constructor from the stack so traces start at the call site.
    // We do this because constructor frames add noise without diagnostic value.
    Error.captureStackTrace?.(this, TaoWrappedError)
  }

  override get stack(): string | undefined {
    const startingStack = super.stack
    if (!startingStack) {
      return undefined
    }

    const causeStack = this.cause?.stack
    if (!causeStack) {
      return startingStack
    }

    return (
      startingStack
      + '\nCaused by: '
      + this.indentStack(causeStack)
    )
  }

  private indentStack(stack: string): string {
    return stack.replace(/^/gm, '    ')
  }
}
