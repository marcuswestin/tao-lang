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

export async function parseWithErrors(code: string): Promise<ErrorReport> {
  const { errorReport } = await TaoParser.parseString(code, { validate: 'all' })
  Assert(errorReport, 'Expected error report, but got none.')
  return errorReport
}

export async function parseTestCode(code: string): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code)
  Assert(!errorReport, 'Expected no errors, but got: ' + errorReport?.errorString)
  return wrap(taoFileAST!)
}
