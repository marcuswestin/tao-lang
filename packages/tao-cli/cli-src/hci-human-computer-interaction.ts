import { appendFileSync } from 'node:fs'
import { bgWhiteBright, blackBright, bold, cyan, gray, red, yellow } from 'picocolors'
import {
  getTaoError,
  NotYetImplemented,
  UnexpectedBehavior,
  UserInputRejection,
} from '../../compiler/compiler-src/@shared/TaoErrors'
import { assertNever } from '../../compiler/compiler-src/compiler-utils'

function print(message: string) {
  appendFileSync('/tmp/hci.log', message + '\n')
}

const printToUser = print
const logInternal = print
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
