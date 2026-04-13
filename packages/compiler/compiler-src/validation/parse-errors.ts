import * as ChevrotainTypes from '@chevrotain/types'
import { LGM as Langium } from '@parser'
import * as VSCodeTypes from '@parser/vscode-languageserver'

// Parser errors
////////////////

type Chev_LexingError = ChevrotainTypes.ILexingError
type Chev_ParserError = ChevrotainTypes.IRecognitionException
type VSCode_Diagnostic = VSCodeTypes.Diagnostic

export type ParseError = {
  readonly hasError: () => boolean
  readonly lexerErrors: Chev_LexingError[]
  readonly parserErrors: Chev_ParserError[]
  readonly diagnostics: VSCode_Diagnostic[]
  readonly getHumanErrorMessage: () => string
  readonly getHumanErrorMessages: () => string[]
  /** errorCount returns the total lexer, parser, and diagnostic issue count. */
  readonly errorCount: () => number
}

// Error helpers
////////////////

/** getParseError aggregates lexer, parser, and diagnostic errors from documents. */
export function getParseError(...documents: Langium.LangiumDocument[]): ParseError {
  return new ParseErrorImpl(documents.map(document =>
    new DocumentErrors(
      document.parseResult.lexerErrors,
      document.parseResult.parserErrors,
      document.diagnostics || [],
    )
  ))
}

class DocumentErrors {
  constructor(
    public readonly lexerErrors: Chev_LexingError[],
    public readonly parserErrors: Chev_ParserError[],
    public readonly diagnostics: VSCode_Diagnostic[],
  ) {}

  /** errorCount returns the total lexer, parser, and diagnostic issue count. */
  errorCount() {
    return this.lexerErrors.length + this.parserErrors.length + this.diagnostics.length
  }

  get humanErrorMessage(): string {
    return this.getHumanErrorMessage()
  }

  /** getHumanErrorMessage returns concatenated human-readable error lines for this document. */
  private getHumanErrorMessage() {
    const errors: string[] = []
    if (this.lexerErrors.length > 0) {
      errors.push('Lexer errors: ' + this.lexerErrors.map(e => e.message).join('\n  '))
    }
    if (this.parserErrors.length > 0) {
      errors.push(`Parser errors: ${this.parserErrors.map(e => e.message).join('\n  ')}`)
    }
    if (this.diagnostics.length > 0) {
      errors.push(`Diagnostics errors: ${this.diagnostics.map(e => e.message).join('\n  ')}`)
    }
    return errors.join('\n')
  }

  /** hasError returns true if this document has lexer, parser, or diagnostic issues. */
  hasError() {
    return Boolean(
      this.lexerErrors.length
        || this.parserErrors.length
        || this.diagnostics.length,
    )
  }
}

class ParseErrorImpl extends Error implements ParseError {
  public override readonly name = 'ParseError'

  /** message returns the same string as getHumanErrorMessage for Error compatibility. */
  override get message() {
    return this.getHumanErrorMessage()
  }

  constructor(
    private readonly documentErrors: DocumentErrors[],
  ) {
    super()
  }

  get lexerErrors(): Chev_LexingError[] {
    return this.documentErrors.flatMap(e => e.lexerErrors)
  }
  get parserErrors(): Chev_ParserError[] {
    return this.documentErrors.flatMap(e => e.parserErrors)
  }
  get diagnostics(): VSCode_Diagnostic[] {
    return this.documentErrors.flatMap(e => e.diagnostics)
  }

  /** errorCount returns the sum of errors across all documents. */
  errorCount() {
    return this.documentErrors.reduce((acc, e) => acc + e.errorCount(), 0)
  }

  /** hasError returns true if any document has errors. */
  hasError() {
    return this.documentErrors.some(e => e.hasError())
  }

  /** getHumanErrorMessage returns per-document human error strings. */
  getHumanErrorMessages(): string[] {
    return this.documentErrors.map(e => e.humanErrorMessage).filter(Boolean)
  }

  get humanErrorMessage(): string {
    return this.getHumanErrorMessage()
  }
  /** getHumanErrorMessage returns a single string of all human errors. */
  getHumanErrorMessage(): string {
    return this.getHumanErrorMessages().join('\n')
  }
}
