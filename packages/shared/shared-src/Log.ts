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

export function setLogTransport(t: Transport) {
  // transport = t
}

let wrapIndent = 0
function indentWrap() {
  let indent = ' '.repeat(wrapIndent)
  wrapIndent += 2
  return indent
}
function dedentWrap() {
  wrapIndent -= 2
  return ' '.repeat(wrapIndent)
}

function log(...args: unknown[]) {
  transport.log(...args)
}
function debug(message: string, ...args: unknown[]) {
  transport.debug(message, ...args)
}
function info(message: string, ...args: unknown[]) {
  transport.info(message, ...args)
}
function warn(message: string, ...args: unknown[]) {
  transport.warn(message, ...args)
}
function error(message: string, ...args: unknown[]) {
  const mappedArgs = Array.from(args).map(arg => arg instanceof Error ? arg.stack : arg)
  transport.error(message, ...mappedArgs)
}
function taoError(error: TaoError, ...args: unknown[]) {
  transport.taoError(error, ...args)
}
function trace(message: string, ...args: unknown[]) {
  const mappedArgs = Array.from(args).map(arg => arg instanceof Error ? arg.stack : arg)
  transport.trace(message, ...mappedArgs)
}
function success(message: string) {
  transport.success(message)
}
function instruct(message: string) {
  transport.instruct(message)
}
function reject(message: string) {
  transport.reject(message)
}

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
  },
)
