import * as ChevrotainTypes from '@chevrotain/types'
import * as Langium from 'langium'
import * as VSCodeTypes from 'vscode-languageserver-types'

// Parser errors
////////////////

type Chev_LexingError = ChevrotainTypes.ILexingError
type Chev_ParserError = ChevrotainTypes.IRecognitionException
type VSCode_Diagnostic = VSCodeTypes.Diagnostic

export type ErrorReport = {
  lexerErrors?: Chev_LexingError[]
  parserErrors?: Chev_ParserError[]
  diagnostics?: VSCode_Diagnostic[]
  humanErrorMessage: string
}

// Error helpers
////////////////

/** getDocumentErrors aggregates lexer, parser, and diagnostic errors from documents. */
export function getDocumentErrors(...documents: Langium.LangiumDocument[]): TaoErrorReport {
  return new TaoErrorReport(documents.map(document =>
    new DocumentErrors(
      document.parseResult.lexerErrors,
      document.parseResult.parserErrors,
      document.diagnostics || [],
    )
  ))
}

export class DocumentErrors {
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
    return this.getHumanErrorMessages()
  }

  /** getHumanErrorMessages returns concatenated human-readable error lines for this document. */
  getHumanErrorMessages() {
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

export class TaoErrorReport extends Error {
  public override readonly name = 'TaoErrorReport'

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

  /** getHumanErrorMessages returns per-document human error strings. */
  getHumanErrorMessages() {
    return this.documentErrors.map(e => e.getHumanErrorMessages()).filter(Boolean)
  }

  /** getHumanErrorMessage returns a single string of all human errors. */
  getHumanErrorMessage() {
    return this.getHumanErrorMessages().join('\n')
  }
}
