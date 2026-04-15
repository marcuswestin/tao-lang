import { TaoError } from './TaoErrors'

type Transport = {
  log: (...args: unknown[]) => void
  wrap: (indent: string, level: string, label: string, fnName: string) => void
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  taoError: (error: TaoError, ...args: unknown[]) => void
  trace: (message: string, ...args: unknown[]) => void
  success: (message: string) => void
  instruct: (message: string) => void
  reject: (message: string) => void
} // TODO

let transport: Transport = {
  log: console.log,
  wrap: console.debug,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
  taoError: console.error,
  trace: console.trace,
  success: (message) => console.info(Bun.inspect(message, { colors: true })),
  instruct: console.info,
  reject: console.error,
}

// Silence the console
// Object.keys(transport).forEach(f => transport[f as keyof Transport] = () => {})

/** setLogTransport swaps the process-wide transport used by all `Log` helpers (e.g. VS Code extension sets channel-based sinks). */
export function setLogTransport(t: Transport) {
  transport = t
}

let wrapIndent = 0
/** indentWrap increases wrap indent and returns the current indent string. */
function indentWrap() {
  let indent = ' '.repeat(wrapIndent)
  wrapIndent += 2
  return indent
}
/** dedentWrap decreases wrap indent and returns the current indent string. */
function dedentWrap() {
  wrapIndent -= 2
  return ' '.repeat(wrapIndent)
}

/** log forwards to transport.log. */
function log(...args: unknown[]) {
  transport.log(...args)
}

/** verbose forwards to transport.log only when `TAO_DEV_VERBOSE=1`. */
function verbose(...args: unknown[]) {
  if (process.env['TAO_DEV_VERBOSE'] === '1') {
    transport.log(...args)
  }
}

/** verboseSuccess forwards to transport.success only when `TAO_DEV_VERBOSE=1`. */
function verboseSuccess(message: string) {
  if (process.env['TAO_DEV_VERBOSE'] === '1') {
    transport.success(message)
  }
}

const verboseWithSuccess = Object.assign(verbose, { success: verboseSuccess })
/** debug forwards to transport.debug. */
function debug(message: string, ...args: unknown[]) {
  transport.debug(message, ...args)
}
/** info forwards to transport.info. */
function info(message: string, ...args: unknown[]) {
  transport.info(message, ...args)
}
/** warn forwards to transport.warn. */
function warn(message: string, ...args: unknown[]) {
  transport.warn(message, ...args)
}
/** error forwards to transport.error, mapping Error args to stack strings. */
function error(message: string, ...args: unknown[]) {
  const mappedArgs = Array.from(args).map(arg => arg instanceof Error ? arg.stack : arg)
  transport.error(message, ...mappedArgs)
}
/** taoError forwards a TaoError to the transport. */
function taoError(error: TaoError, ...args: unknown[]) {
  transport.taoError(error, ...args)
}
/** trace forwards to transport.trace, mapping Error args to stack strings. */
function trace(message: string, ...args: unknown[]) {
  const mappedArgs = Array.from(args).map(arg => arg instanceof Error ? arg.stack : arg)
  transport.trace(message, ...mappedArgs)
}
/** success logs a success message via transport.success. */
function success(message: string) {
  transport.success(message)
}
/** instruct logs an instruct message via transport.instruct. */
function instruct(message: string) {
  transport.instruct(message)
}
/** reject logs a reject message via transport.reject. */
function reject(message: string) {
  transport.reject(message)
}

/** wrap returns an async function that logs enter/exit via `transport.wrap` and `indentWrap`/`dedentWrap`, awaiting `fn`
 * so sync and async implementations both work. */
function wrap<T extends (...args: any[]) => any>(label: string, fn: T): T {
  let wrappedFn = (async (...args: Parameters<T>) => {
    transport.wrap(indentWrap(), 'RUN', label, fn.name)
    try {
      const result = await fn(...args)
      transport.wrap(dedentWrap(), 'RET', label, fn.name)
      return result
    } catch (error) {
      transport.error(dedentWrap(), 'ERR', label, fn.name, error)
      throw error
    }
  }) as T

  const namedFn = { [label]: ((...args: any[]) => wrappedFn(...args)) as unknown as T }[label]
  return namedFn as T
}

export const Log = Object.assign(
  log,
  {
    log,
    debug,
    info,
    warn,
    error,
    taoError,
    trace,
    success,
    instruct,
    reject,
    wrap,
    verbose: verboseWithSuccess,
  },
)
