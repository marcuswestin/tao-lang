// TODO: This could have helpful options for crafting a message for the user.

// Shared Error handling across all tao code
////////////////////////////////////////////

// There are two types of errors:
//
// - User input rejection errors
// - Unexpected behavior errors
//
// That's it. All error logging, handling, reporting,
// and user informing comes from these two types of errors.

// Export interfaces instead of InstanceType to avoid exposing private members
export type TaoError = NotYetImplemented | UnexpectedBehavior | UserInputRejection

export interface BaseTaoErrorInterface {
  readonly name: 'NotYetImplementedError' | 'UnexpectedBehaviorError' | 'UserInputRejectionError'
  readonly messageForEndUser: string
  getLogMessage(): string
}

export interface NotYetImplemented extends BaseTaoErrorInterface {
  readonly name: 'NotYetImplementedError'
}

export interface UnexpectedBehavior extends BaseTaoErrorInterface {
  readonly name: 'UnexpectedBehaviorError'
  readonly cause: Error
  readonly logInfo?: Record<string, unknown>
}

export interface UserInputRejection extends BaseTaoErrorInterface {
  readonly name: 'UserInputRejectionError'
}

// Halt execution because of user input. It could be missing, malformed, etc
export function throwUserInputRejectionError(humanMessage: string): never {
  throw new UserInputRejectionError(humanMessage)
}

// Halt execution because of unintended and unexpected behavior - aka a bug.
export function throwUnexpectedBehaviorError(context: UnexpectedBehaviorContext): never {
  throw new UnexpectedBehaviorError(context)
}

// Halt execution because we haven't implemented something yet.
export function throwNotYetImplementedError(
  ability: string,
  info?: Map<string, unknown>,
  because_X_Y_and_Z?: string,
): never {
  throw new NotYetImplementedError(ability, info, because_X_Y_and_Z)
}

// Assert condition is true. If not, halt execution with an unexpected behavior error.
export function Assert<T>(condition: T, expectedConditionDescription: string): asserts condition is NonNullable<T> {
  if (!condition) {
    throw new UnexpectedBehaviorError({
      humanMessage: `Expected ${expectedConditionDescription}`,
      cause: new Error('AssertError'),
      logInfo: { condition: condition },
    })
  }
}

// Check if an error is a Tao error
export function isTaoError(error: unknown): error is TaoError {
  return error instanceof BaseTaoError
}

export function getTaoError(error: TaoError | unknown, logInfo?: Record<string, unknown>): TaoError {
  if (isTaoError(error)) {
    return error
  }
  return new UnexpectedBehaviorError({
    humanMessage: 'Something went wrong. So sorry :(',
    cause: error,
    logInfo,
  })
}

// Check if an error is a user input rejection error
export function isUserInputRejectionError(error: unknown): error is UserInputRejectionError {
  return error instanceof UserInputRejectionError
}

// Check if an error is an unexpected behavior error
export function isUnexpectedBehaviorError(error: unknown): error is UnexpectedBehaviorError {
  return error instanceof UnexpectedBehaviorError
}

// Class Implementations
////////////////////////

abstract class BaseTaoError extends Error {
  public get messageForEndUser(): string {
    return this.humanMessage
  }

  constructor(
    private readonly humanMessage: string,
    cause?: Error,
  ) {
    super(humanMessage, { cause })
  }
}

class UserInputRejectionError extends BaseTaoError {
  override readonly name = 'UserInputRejectionError'

  getLogMessage(): string {
    return 'UserInputRejectionError: ' + this.messageForEndUser
  }

  constructor(humanMessage: string) {
    super(humanMessage)
  }
}

class NotYetImplementedError extends BaseTaoError {
  override readonly name = 'NotYetImplementedError'

  getLogMessage(): string {
    const additionalInfo = safeJSONStringifyAdditionalInfo(this.info)
    return `NotYetImplementedError: ${this.messageForEndUser}${additionalInfo ? ` - info: ${additionalInfo}` : ''}`
  }

  constructor(ability: string, private readonly info?: Map<string, unknown>, because_X_Y_and_Z?: string) {
    const excuse = because_X_Y_and_Z ? `, because ${because_X_Y_and_Z}` : ''
    const humanMessage = `${ability} has still not been implemented${excuse}.`
    super(humanMessage)
  }
}

export type UnexpectedBehaviorContext = {
  cause: Error | unknown
  humanMessage?: string
  logInfo?: Record<string, unknown>
}

class UnexpectedBehaviorError extends BaseTaoError {
  override readonly name = 'UnexpectedBehaviorError'

  getLogMessage(): string {
    return `${this.name}: ${this.messageForEndUser}. ${safeJSONStringifyAdditionalInfo(this.logInfo)}. ${this.stack}`
  }

  override readonly cause: Error
  readonly logInfo?: Record<string, unknown>

  constructor(opts: UnexpectedBehaviorContext) {
    const { cause, logInfo } = UnexpectedBehaviorError.getCauseErrorAndLogInfo(opts)
    super(opts.humanMessage ?? 'Something went wrong. So sorry :(', cause)

    this.name = 'UnexpectedBehaviorError'
    this.cause = cause
    this.logInfo = logInfo

    // Exclude this constructor from the stack so traces start at the call site.
    // We do this because constructor frames add noise without diagnostic value.
    Error.captureStackTrace?.(this, UnexpectedBehaviorError)
  }

  private static getCauseErrorAndLogInfo(
    opts: UnexpectedBehaviorContext,
  ): { cause: Error; logInfo?: Record<string, unknown> } {
    if (opts.cause instanceof Error) {
      return { cause: opts.cause, logInfo: opts.logInfo }
    } else {
      const cause = new Error('UnknownUnexpectedBehaviorError')
      const __unknownUnexpectedBehaviorObject = safeJSONStringifyAdditionalInfo(opts.cause)
      return {
        cause,
        logInfo: { ...opts.logInfo, __unknownUnexpectedBehaviorObject },
      }
    }
  }

  override get stack(): string | undefined {
    const myStack = getStackMessage(this.name, super.stack)
    const causeStack = getStackMessage(this.cause.name, this.cause.stack)

    return (
      myStack + '\n'
      + 'Caused by: ' + this._indentStack(causeStack)
    )
  }

  private _indentStack(stack: string): string {
    return stack.replace(/^/gm, '    ')
  }
}

function getStackMessage(errorName: string, stack?: string): string {
  return stack || `<Stack missing for ${errorName}>`
}

function safeJSONStringifyAdditionalInfo(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return '<Could not JSON.stringify additional info>'
  }
}
