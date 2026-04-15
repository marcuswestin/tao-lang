// This file abstracts which test framework is used.
// It allows e.g for switching to vitest.

import { TaoParser } from '@compiler/langium/parser'
import type { TaoWorkspace } from '@compiler/langium/tao-services'
import { createTaoWorkspace } from '@compiler/langium/tao-services'
import { getParseError, ParseError } from '@compiler/validation/parse-errors'
import { LGM as Langium } from '@parser'
import { TaoFile } from '@parser/_gen-tao-parser/ast'
import { NodeFileSystem } from '@parser/node'
import { AST } from '@parser/parser'
import { Assert } from '@shared'
import { wrap, Wrapped } from './AST-Wrapper'

export { describe, expect, test } from 'bun:test'

// Lexing
/////////

/** lexTokens lexes `code` and returns lexer diagnostics only (`validateUpToStage: 'lexing'`); parse/link/validation
 * errors are not produced for this call. */
export async function lexTokens(code: string, stdLibRoot = '') {
  const result = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: 'lexing' })
  return result.errorReport.lexerErrors
}

/** lexTokensWithErrors requires at least one lexer error, then optionally checks each `unexpectedCharacters` entry
 * appears either at a reported offset in `code` or in an error message (quoted/highlighted forms) so tests stay precise. */
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
      `lexTokensWithErrors expected an error involving "${ch}", but none of the ${lexErrors.length} error(s) matched: ${
        lexErrors.map(e => e.message).join(', ')
      }`,
    )
  }
  return lexErrors
}

/** parseAST parses through the parsing stage; fails the test via `Assert` if lexer or parser reported any error. */
export async function parseAST(code: string, stdLibRoot = ''): Promise<Wrapped<AST.TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: 'parsing' })
  Assert(
    !errorReport.hasError(),
    'parseAST expected no errors, but got: ' + errorReport.getHumanErrorMessage(),
  )
  return wrap(taoFileAST!)
}

/** parseASTWithErrors runs the full pipeline and returns the aggregated `ParseError`; the test fails if the
 * pipeline produced no errors (use this only when you expect failure). */
export async function parseASTWithErrors(code: string, stdLibRoot = ''): Promise<ParseError> {
  const { errorReport } = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: 'all' })
  Assert(errorReport.hasError(), 'parseASTWithErrors expected at least one error report, but got none.')
  return errorReport
}

/** resolveReferences parses through linking; fails the test if lexer, parser, or linker reported errors (validation not run). */
export async function resolveReferences(code: string, stdLibRoot = ''): Promise<Wrapped<AST.TaoFile>> {
  return _parseUpToStage(code, stdLibRoot, 'linking')
}

/** parseTaoFully runs lex → parse → link → validation; fails the test on any reported error. */
export async function parseTaoFully(code: string, stdLibRoot = ''): Promise<Wrapped<TaoFile>> {
  return _parseUpToStage(code, stdLibRoot, 'all')
}

/** _parseUpToStage parses `code` through `stage` and fails the test when the parser reports errors. */
async function _parseUpToStage(
  code: string,
  stdLibRoot: string,
  stage: 'lexing' | 'parsing' | 'linking' | 'all' | 'none',
): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: stage })
  Assert(!errorReport.hasError(), 'Expected no errors, but got: ' + errorReport.getHumanErrorMessage())
  return wrap(taoFileAST!)
}

// Multi-file parsing
/////////////////////

export type VirtualFile = {
  /** path is the virtual file path used as the document URI (`file://${path}`); match keys across `getFile` and the map. */
  path: string
  code: string
}

export type MultiFileParseResult = {
  /** getFile returns the AST for `path` and asserts the whole workspace built cleanly (any error in any file fails the test). */
  getFile(path: string): Wrapped<TaoFile>
  /** getErrors returns the combined error report for all documents (no assertion). */
  getErrors(): ParseError
  /** workspace is the Langium workspace used to build and validate `documents` (e.g. LSP `getDocumentDefinition`). */
  workspace: TaoWorkspace
  /** documents maps each virtual path to its Langium document after `buildDocuments`. */
  documents: Map<string, Langium.LangiumDocument<TaoFile>>
}

export type ParseMultipleFilesOpts = {
  stdLibRoot?: string
}

/** parseMultipleFiles builds one workspace from `files` so imports/refs resolve across them; pass `stdLibRoot` to resolve
 * `tao/...` like the real compiler. `getFile` insists on zero errors workspace-wide.
 * It also exposes `workspace` for LSP-style services (e.g. go-to-definition). */
export async function parseMultipleFiles(
  files: VirtualFile[],
  opts: ParseMultipleFilesOpts = {},
): Promise<MultiFileParseResult> {
  const { workspace, documents } = await _buildWorkspaceAndDocuments(files, opts.stdLibRoot ?? '')

  return {
    workspace,
    documents,
    getFile(path: string): Wrapped<TaoFile> {
      const doc = documents.get(path)
      Assert(doc, `No document found for path: ${path}`)
      const errorReports = getParseError(...documents.values())
      Assert(
        !errorReports.hasError(),
        `Expected no errors for ${path}, but got: ${errorReports.getHumanErrorMessage()}`,
      )
      return wrap(doc.parseResult.value)
    },
    getErrors(): ParseError {
      return getParseError(...documents.values())
    },
  }
}

/** _buildWorkspaceAndDocuments registers each virtual file under `file://` URIs and runs `buildDocuments` with validation. */
async function _buildWorkspaceAndDocuments(
  files: VirtualFile[],
  stdLibRoot?: string,
): Promise<{ workspace: TaoWorkspace; documents: Map<string, Langium.LangiumDocument<TaoFile>> }> {
  const workspace = createTaoWorkspace(NodeFileSystem, { stdLibRoot })
  const documents = new Map<string, Langium.LangiumDocument<TaoFile>>()
  for (const file of files) {
    const uri = Langium.URI.parse(`file://${file.path}`, true)
    const document = workspace.createDocumentFromString(file.code, uri)
    workspace.addDocument(document)
    documents.set(file.path, document)
  }
  const allDocs = Array.from(documents.values())
  await workspace.buildDocuments(allDocs, { validation: true })
  return { workspace, documents }
}
