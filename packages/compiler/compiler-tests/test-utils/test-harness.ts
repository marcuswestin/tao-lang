// This file abstracts which test framework is used.
// It allows e.g for switching to vitest.

import { Assert } from '@tao-compiler/@shared/TaoErrors'
import { TaoFile } from '@tao-compiler/_gen-tao-parser/ast'
import { ErrorReport, getDocumentErrors } from '@tao-compiler/parse-errors'
import { TaoParser } from '@tao-compiler/parser'
import * as BunTest from 'bun:test'
import * as Langium from 'langium'
import { NodeFileSystem } from 'langium/node'
import { createTaoServices } from 'tao-compiler'
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

// Multi-file parsing
/////////////////////

export type VirtualFile = {
  /** Virtual path, e.g. '/project/ui/views.tao' */
  path: string
  code: string
}

export type MultiFileParseResult = {
  /** Get the parsed AST for a specific file path */
  getFile(path: string): Wrapped<TaoFile>
  /** Get errors for a specific file path, or undefined if no errors */
  getErrors(path: string): ErrorReport | undefined
  /** All documents keyed by path */
  documents: Map<string, Langium.LangiumDocument<TaoFile>>
}

/**
 * Parse multiple virtual files together, allowing cross-file references.
 * Files are given virtual paths to simulate a directory structure.
 */
export async function parseMultipleFiles(files: VirtualFile[]): Promise<MultiFileParseResult> {
  const { shared, Tao } = createTaoServices(NodeFileSystem)
  const documentFactory = Tao.shared.workspace.LangiumDocumentFactory
  const documents = new Map<string, Langium.LangiumDocument<TaoFile>>()

  // Create all documents
  for (const file of files) {
    const uri = Langium.URI.parse(`file://${file.path}`, true)
    const document = documentFactory.fromString<TaoFile>(file.code, uri)
    Tao.shared.workspace.LangiumDocuments.addDocument(document)
    documents.set(file.path, document)
  }

  // Build all documents together
  const allDocs = Array.from(documents.values())
  await shared.workspace.DocumentBuilder.build(allDocs, { validation: true })

  return {
    getFile(path: string): Wrapped<TaoFile> {
      const doc = documents.get(path)
      Assert(doc, `No document found for path: ${path}`)
      const errorReport = getDocumentErrors(doc)
      Assert(!errorReport, `Expected no errors for ${path}, but got: ${errorReport?.humanErrorMessage}`)
      return wrap(doc.parseResult.value)
    },
    getErrors(path: string): ErrorReport | undefined {
      const doc = documents.get(path)
      Assert(doc, `No document found for path: ${path}`)
      return getDocumentErrors(doc)
    },
    documents,
  }
}
