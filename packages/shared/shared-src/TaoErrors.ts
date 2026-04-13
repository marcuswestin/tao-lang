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

/** throwUserInputRejectionError throws `UserInputRejectionError` for bad CLI args, missing files, or other
 * user-correctable problems (as opposed to internal bugs—use `throwUnexpectedBehaviorError` / `Assert` for those). */
export function throwUserInputRejectionError(humanMessage: string): never {
  throw new UserInputRejectionError(humanMessage)
}

/** throwUnexpectedBehaviorError throws `UnexpectedBehaviorError` with a cause chain; `humanMessage` is shown to
 * the user when set, otherwise a generic sorry message. Non-`Error` causes are wrapped and serialized into `logInfo`. */
export function throwUnexpectedBehaviorError(context: UnexpectedBehaviorContext): never {
  throw new UnexpectedBehaviorError(context)
}

/** throwNotYetImplementedError throws `NotYetImplementedError` with a message built from `ability` and optional
 * `because_X_Y_and_Z`; `info` is appended to the log line when present. */
export function throwNotYetImplementedError(
  ability: string,
  info?: Map<string, unknown>,
  because_X_Y_and_Z?: string,
): never {
  throw new NotYetImplementedError(ability, info, because_X_Y_and_Z)
}

/** Assert throws `UnexpectedBehaviorError` when `condition` is falsy, embedding `expectedConditionDescription`
 * and merging optional `logInfo` objects into the error’s diagnostic payload. */
export function Assert<T>(
  condition: T,
  expectedConditionDescription: string,
  ...logInfo: Record<string, unknown>[]
): asserts condition is NonNullable<T> {
  if (!condition) {
    throw new UnexpectedBehaviorError({
      humanMessage: `Expected: ${expectedConditionDescription}`,
      cause: new Error('AssertError'),
      logInfo: { condition: condition, info: logInfo },
    })
  }
}

/** Halt throws `UnexpectedBehaviorError` tagged as a deliberate halt (`HaltError` cause, optional message). */
export function Halt(humanMessage?: string): never {
  throw new UnexpectedBehaviorError({
    humanMessage: humanMessage ?? 'Halt called',
    cause: new Error('HaltError'),
    logInfo: { humanMessage },
  })
}

/** isTaoError returns true when error is a TaoError instance. */
export function isTaoError(error: unknown): error is TaoError {
  return error instanceof BaseTaoError
}

/** getTaoError returns Tao errors unchanged; anything else becomes `UnexpectedBehaviorError` with a generic
 * end-user message, the original value as `cause` (or wrapped), and merged `logInfo`. */
export function getTaoError(error: unknown, logInfo?: Record<string, unknown>): TaoError {
  if (isTaoError(error)) {
    return error
  }
  return new UnexpectedBehaviorError({
    humanMessage: 'Something went wrong. So sorry :(',
    cause: error,
    logInfo,
  })
}

/** isUserInputRejectionError returns true when error is UserInputRejectionError. */
export function isUserInputRejectionError(error: unknown): error is UserInputRejectionError {
  return error instanceof UserInputRejectionError
}

/** isUnexpectedBehaviorError returns true when error is UnexpectedBehaviorError. */
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

export class UserInputRejectionError extends BaseTaoError {
  override readonly name = 'UserInputRejectionError'

  /** getLogMessage returns the log line for user input rejection. */
  getLogMessage(): string {
    return 'UserInputRejectionError: ' + this.messageForEndUser
  }

  constructor(humanMessage: string) {
    super(humanMessage)
  }
}

class NotYetImplementedError extends BaseTaoError {
  override readonly name = 'NotYetImplementedError'

  /** getLogMessage returns the log line for not-yet-implemented error. */
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
  cause: unknown
  humanMessage?: string
  logInfo?: Record<string, unknown>
}

class UnexpectedBehaviorError extends BaseTaoError {
  override readonly name = 'UnexpectedBehaviorError'

  /** getLogMessage returns the full diagnostic log line including cause stack hint. */
  getLogMessage(): string {
    return `${this.name}: ${this.messageForEndUser}. ${safeJSONStringifyAdditionalInfo(this.logInfo)}. ${this.stack}`
  }

  /** Stored separately from `Error.cause` so we do not fight `override` rules across TypeScript versions. */
  private readonly _taoCause: Error
  readonly logInfo?: Record<string, unknown>

  get cause(): Error {
    return this._taoCause
  }

  constructor(opts: UnexpectedBehaviorContext) {
    const { cause, logInfo } = UnexpectedBehaviorError.getCauseErrorAndLogInfo(opts)
    super(opts.humanMessage ?? 'Something went wrong. So sorry :(', cause)

    this._taoCause = cause
    this.logInfo = logInfo

    // Exclude this constructor from the stack so traces start at the call site.
    // We do this because constructor frames add noise without diagnostic value.
    // Error.captureStackTrace.(this, UnexpectedBehaviorError)
  }

  /** getCauseErrorAndLogInfo normalizes opts.cause to an Error and merges log info. */
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
    const causeStack = getStackMessage(this._taoCause.name, this._taoCause.stack)

    return (
      myStack + '\n'
      + 'Caused by: ' + this._indentStack(causeStack)
    )
  }

  /** _indentStack indents each line of a stack string for nested display. */
  private _indentStack(stack: string): string {
    return stack.replace(/^/gm, '    ')
  }
}

/** getStackMessage returns the stack or a placeholder when missing. */
function getStackMessage(errorName: string, stack?: string): string {
  return stack || `<Stack missing for ${errorName}>`
}

/** safeJSONStringifyAdditionalInfo stringifies value or returns a fallback on failure. */
function safeJSONStringifyAdditionalInfo(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch (_error) {
    return '<Could not JSON.stringify additional info>'
  }
}
