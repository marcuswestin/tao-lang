// This file abstracts which test framework is used.
// It allows e.g for switching to vitest.

import { Assert } from '@tao-compiler/@shared/TaoErrors'
import { TaoFile } from '@tao-compiler/_gen-tao-parser/ast'
import { ErrorReport } from '@tao-compiler/parse-errors'
import { TaoParser } from '@tao-compiler/parser'
import * as BunTest from 'bun:test'
import { wrap, Wrapped } from './AST-Wrapper'

export const describe = BunTest.describe
export const expect = BunTest.expect
export const test = BunTest.test

// Lexing
/////////

// lex the code, and check only for lexing errors - skip parse, link and validation errors
export async function lexTokens(code: string) {
  const result = await TaoParser.parseString(code, { validateUpToStage: 'lexing', suppressThrowOnError: true })
  return result.errorReport?.lexerErrors ?? []
}

// lex the code, and expect lexing errors.
export async function lexTokensWithErrors(code: string, ...unexpectedCharacters: string[]) {
  const lexErrors = await lexTokens(code)
  Assert(lexErrors.length > 0, 'lexTokensWithErrors expected lexing errors, but got none.')
  return lexErrors
}

// parse the code, and check only for lex and parse errors - Skips link and validation errors
export async function parseAST(code: string): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { validateUpToStage: 'parsing' })
  Assert(!errorReport, 'paseAST expected no errors, but got: ' + errorReport?.humanErrorMessage)
  return wrap(taoFileAST!)
}

// parse the code, and check for all errors - lex, parse, link and validation errors
export async function parseASTWithErrors(code: string): Promise<ErrorReport> {
  const { errorReport } = await TaoParser.parseString(code, { validateUpToStage: 'all' })
  Assert(errorReport, 'parseASTWithErrors expected an error report, but got none.')
  return errorReport
}

// parse the code and resolve reference links - skips validation errors
export async function resolveReferences(code: string): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { validateUpToStage: 'linking' })
  Assert(!errorReport, 'Expected no errors, but got: ' + errorReport?.humanErrorMessage)
  return wrap(taoFileAST!)
}

export async function parseTaoFully(code: string): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { validateUpToStage: 'all' })
  Assert(!errorReport, 'Expected no errors, but got: ' + errorReport?.humanErrorMessage)
  return wrap(taoFileAST!)
}
