import * as ChevrotainTypes from '@chevrotain/types'
import * as Langium from 'langium'
import * as VSCodeTypes from 'vscode-languageserver-types'
import { BaseTaoError, TaoWrappedError } from './@shared/TaoErrors'

// Parse Error types
////////////////////

export function isTaoParserError(error: unknown): error is TaoParserError {
  return error instanceof TaoParserError
}
export function throwTaoParserError(errorReport: ErrorReport): never {
  throw new TaoParserError(errorReport, 'There was an error parsing your code.')
}

export function isCaughtAndWrappedError(error: unknown): error is TaoWrappedError {
  return error instanceof Error && '_isCaughtError' in error
}
export function throwAndWrapCaughtError(error: unknown, humanMessage: string): never {
  throw new TaoWrappedError(humanMessage, error as Error)
}

// Error implementations
////////////////////////

class TaoParserError extends BaseTaoError {
  constructor(
    public readonly errorReport: ErrorReport,
    public override readonly humanMessage: string,
  ) {
    super(humanMessage)
  }
}

// Parser errors
////////////////

type Chev_LexingError = ChevrotainTypes.ILexingError
type Chev_ParserError = ChevrotainTypes.IRecognitionException
type VSCode_Diagnostic = VSCodeTypes.Diagnostic

export type ErrorReport = {
  ioError?: Error
  lexerErrors?: Chev_LexingError[]
  parserErrors?: Chev_ParserError[]
  diagnostics?: VSCode_Diagnostic[]
  errorString?: string
}

// Error helpers
////////////////

export function getDocumentErrors(document: Langium.LangiumDocument): ErrorReport | undefined {
  const lexerErrors = document.parseResult.lexerErrors
  const parserErrors = document.parseResult.parserErrors
  const diagnostics = document.diagnostics || []
  const errorStrings = getErrorStrings(lexerErrors, parserErrors, diagnostics)
  if (errorStrings.length > 0) {
    return { lexerErrors, parserErrors, diagnostics, errorString: errorStrings.join('\n') }
  }
  return undefined
}

function getErrorStrings(
  lexerErrors: Chev_LexingError[],
  parserErrors: Chev_ParserError[],
  diagnostics: VSCode_Diagnostic[],
): string[] {
  const errors: string[] = []
  if (lexerErrors.length > 0) {
    errors.push(`Lexer errors: ${lexerErrors.join('\n  ')}`)
  }
  if (parserErrors.length > 0) {
    errors.push(`Parser errors: ${parserErrors.map(e => e.message).join('\n  ')}`)
  }
  if (diagnostics.length > 0) {
    errors.push(`Diagnostics errors: ${diagnostics.map(e => e.message).join('\n  ')}`)
  }
  return errors
}
