import { appendFileSync } from 'node:fs'
import * as process from 'node:process'
import { bgWhiteBright, blackBright, bold, cyan, gray, red, yellow } from 'picocolors'
import { Log } from '../../compiler/compiler-src/@shared/Log'
import {
  getTaoError,
  NotYetImplemented,
  UnexpectedBehavior,
  UserInputRejection,
} from '../../compiler/compiler-src/@shared/TaoErrors'
import { assertNever } from '../../compiler/compiler-src/compiler-utils'

function print(message: string) {
  Log(message)
  appendFileSync('/tmp/hci.log', message + '\n')
}

const printToUser = function(message: string) {
  print('> ' + message)
}
const logInternal = function(message: string) {
  const date = new Date()
  const time = date.toLocaleTimeString('en-US', { hour12: false }) + '.'
    + date.getMilliseconds()
  print('[' + time + ' ' + message + ']')
}
export const hci = {
  _verbose: false,
  _debug: false,
  setVerbose(verbose: boolean): void {
    hci._verbose = verbose
  },
  setDebug(debug: boolean): void {
    hci._debug = debug
  },
  inform: (message: string) => {
    printToUser(cyan(message))
  },
  verboselyInform: (message: string) => {
    if (hci._verbose) {
      printToUser(gray(message))
    }
  },
  debug: (message: string) => {
    if (hci._debug) {
      printToUser(bgWhiteBright(blackBright(message)))
    }
  },
  reject: (error: UserInputRejection | NotYetImplemented) => {
    printToUser(yellow(bold(error.messageForEndUser)))
    logInternal(error.getLogMessage())
  },
  informUnexpectedBehavior: (error: UnexpectedBehavior) => {
    printToUser(red(error.messageForEndUser))
    logInternal(error.getLogMessage())
  },
  wrapExecution: async <T>(fn: () => Promise<T>) => {
    try {
      return await fn()
    } catch (error) {
      const taoError = getTaoError(error, { 'context': 'hci.wrapExecution' })
      switch (taoError.name) {
        case 'UnexpectedBehaviorError':
          hci.informUnexpectedBehavior(taoError)
          process.exit(1)
        case 'UserInputRejectionError':
          hci.reject(taoError)
          process.exit(1)
        case 'NotYetImplementedError':
          hci.reject(taoError)
          process.exit(1)
        default:
          assertNever(taoError)
      }
    }
  },
}
