import * as ChevrotainTypes from '@chevrotain/types'
import * as Langium from 'langium'
import * as VSCodeTypes from 'vscode-languageserver-types'

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
  humanErrorMessage?: string
}

// Error helpers
////////////////

export function getDocumentErrors(document: Langium.LangiumDocument): ErrorReport | undefined {
  const lexerErrors = document.parseResult.lexerErrors
  const parserErrors = document.parseResult.parserErrors
  const diagnostics = document.diagnostics || []
  const errorStrings = getErrorStrings(lexerErrors, parserErrors, diagnostics)
  if (errorStrings.length > 0) {
    // TODO: Make this more human-readable
    const humanErrorMessage = errorStrings.join('\n')
    return { lexerErrors, parserErrors, diagnostics, humanErrorMessage }
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
