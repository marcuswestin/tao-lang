// This file abstracts which test framework is used.
// It allows e.g for switching to vitest.

import { Assert } from '@tao-compiler/@shared/TaoErrors'
import { TaoFile } from '@tao-compiler/_gen-tao-parser/ast'
import { getDocumentErrors, TaoErrorReport } from '@tao-compiler/parse-errors'
import { TaoParser } from '@tao-compiler/parser'
import { createTaoWorkspace } from '@tao-compiler/tao-services'
import * as Langium from 'langium'
import { NodeFileSystem } from 'langium/node'
import { wrap, Wrapped } from './AST-Wrapper'

export { describe, expect, test } from 'bun:test'

// Lexing
/////////

// lex the code, and check only for lexing errors - skip parse, link and validation errors
export async function lexTokens(code: string) {
  const result = await TaoParser.parseString(code, { validateUpToStage: 'lexing' })
  return result.errorReport.lexerErrors
}

// lex the code, and expect lexing errors. Optionally assert each unexpectedCharacter appears in some error (message or at offset in code).
export async function lexTokensWithErrors(code: string, ...unexpectedCharacters: string[]) {
  const lexErrors = await lexTokens(code)
  Assert(lexErrors.length > 0, 'lexTokensWithErrors expected lexing errors, but got none.')
  for (const ch of unexpectedCharacters) {
    const atOffset = lexErrors.some((e) => {
      const offset = (e as { offset?: number }).offset
      return typeof offset === 'number' && code.slice(offset).startsWith(ch)
    })
    // Only use message when character isn't at offset (e.g. unclosed string – error may point at EOF). Match quoted/highlighted form to avoid false positives (e.g. "x" in "offset").
    const inMessage = lexErrors.some((e) => {
      const msg = (e as { message?: string }).message ?? ''
      return msg.includes(`->${ch}<-`) || msg.includes(`"${ch}"`) || msg.includes(`'${ch}'`)
    })
    Assert(
      atOffset || inMessage,
      `lexTokensWithErrors expected an error involving "${ch}", but none of the ${lexErrors.length} error(s) matched.`,
    )
  }
  return lexErrors
}

// parse the code, and check only for lex and parse errors - Skips link and validation errors
export async function parseAST(code: string): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { validateUpToStage: 'parsing' })
  Assert(
    !errorReport.hasError(),
    'parseAST expected no errors, but got: ' + errorReport.getHumanErrorMessage(),
  )
  return wrap(taoFileAST!)
}

// parse the code, and check for all errors - lex, parse, link and validation errors
export async function parseASTWithErrors(code: string): Promise<TaoErrorReport> {
  const { errorReport } = await TaoParser.parseString(code, { validateUpToStage: 'all' })
  Assert(errorReport.hasError(), 'parseASTWithErrors expected at least one error report, but got none.')
  return errorReport
}

// parse the code and resolve reference links - skips validation errors
export async function resolveReferences(code: string): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { validateUpToStage: 'linking' })
  Assert(!errorReport.hasError(), 'Expected no errors, but got: ' + errorReport.getHumanErrorMessage())
  return wrap(taoFileAST!)
}

export async function parseTaoFully(code: string): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { validateUpToStage: 'all' })
  Assert(!errorReport.hasError(), 'Expected no errors, but got: ' + errorReport.getHumanErrorMessage())
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
  getErrors(): TaoErrorReport
  /** All documents keyed by path */
  documents: Map<string, Langium.LangiumDocument<TaoFile>>
}

/**
 * Parse multiple virtual files together, allowing cross-file references.
 * Files are given virtual paths to simulate a directory structure.
 */
export async function parseMultipleFiles(files: VirtualFile[]): Promise<MultiFileParseResult> {
  const workspace = createTaoWorkspace(NodeFileSystem)
  const documentFactory = workspace.documentFactory
  const documents = new Map<string, Langium.LangiumDocument<TaoFile>>()

  // Create all documents
  for (const file of files) {
    const uri = Langium.URI.parse(`file://${file.path}`, true)
    const document = documentFactory.fromString<TaoFile>(file.code, uri)
    workspace.documents.addDocument(document)
    documents.set(file.path, document)
  }

  // Build all documents together
  const allDocs = Array.from(documents.values())
  await workspace.documentBuilder.build(allDocs, { validation: true })

  return {
    getFile(path: string): Wrapped<TaoFile> {
      const doc = documents.get(path)
      Assert(doc, `No document found for path: ${path}`)
      const errorReports = getDocumentErrors(...documents.values())
      Assert(
        !errorReports.hasError(),
        `Expected no errors for ${path}, but got: ${errorReports.getHumanErrorMessage()}`,
      )
      return wrap(doc.parseResult.value)
    },
    getErrors(): TaoErrorReport {
      return getDocumentErrors(...documents.values())
    },
    documents,
  }
}
