// This file abstracts which test framework is used.
// It allows e.g for switching to vitest.

import { getDocumentErrors, TaoErrorReport } from '@compiler/parse-errors'
import { TaoParser } from '@compiler/parser'
import type { TaoWorkspace } from '@compiler/tao-services'
import { createTaoWorkspace } from '@compiler/tao-services'
import { TaoFile } from '@parser/ast'
import { Assert } from '@shared/TaoErrors'
import * as Langium from 'langium'
import { NodeFileSystem } from 'langium/node'
import { wrap, Wrapped } from './AST-Wrapper'

export { describe, expect, test } from 'bun:test'

// Lexing
/////////

// lex the code, and check only for lexing errors - skip parse, link and validation errors
export async function lexTokens(code: string, stdLibRoot = '') {
  const result = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: 'lexing' })
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
      `lexTokensWithErrors expected an error involving "${ch}", but none of the ${lexErrors.length} error(s) matched: ${
        lexErrors.map(e => e.message).join(', ')
      }`,
    )
  }
  return lexErrors
}

// parse the code, and check only for lex and parse errors - Skips link and validation errors
export async function parseAST(code: string, stdLibRoot = ''): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: 'parsing' })
  Assert(
    !errorReport.hasError(),
    'parseAST expected no errors, but got: ' + errorReport.getHumanErrorMessage(),
  )
  return wrap(taoFileAST!)
}

// parse the code, and check for all errors - lex, parse, link and validation errors
export async function parseASTWithErrors(code: string, stdLibRoot = ''): Promise<TaoErrorReport> {
  const { errorReport } = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: 'all' })
  Assert(errorReport.hasError(), 'parseASTWithErrors expected at least one error report, but got none.')
  return errorReport
}

// parse the code and resolve reference links - skips validation errors
export async function resolveReferences(code: string, stdLibRoot = ''): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: 'linking' })
  Assert(!errorReport.hasError(), 'Expected no errors, but got: ' + errorReport.getHumanErrorMessage())
  return wrap(taoFileAST!)
}

export async function parseTaoFully(code: string, stdLibRoot = ''): Promise<Wrapped<TaoFile>> {
  const { errorReport, taoFileAST } = await TaoParser.parseString(code, { stdLibRoot, validateUpToStage: 'all' })
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

export type ParseMultipleFilesOpts = {
  stdLibRoot?: string
}

// buildWorkspaceAndDocuments creates a workspace, adds virtual files, and builds. Shared by parseMultipleFiles and buildWorkspaceWithFiles.
async function buildWorkspaceAndDocuments(
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

// parseMultipleFiles parses virtual files together, allowing cross-file references.
// Pass stdLibRoot to resolve std-lib imports (tao/...) against virtual file paths.
export async function parseMultipleFiles(
  files: VirtualFile[],
  opts: ParseMultipleFilesOpts = { stdLibRoot: '' },
): Promise<MultiFileParseResult> {
  const { documents } = await buildWorkspaceAndDocuments(files, opts.stdLibRoot)

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

// buildWorkspaceWithFiles parses virtual files and returns the workspace plus documents.
// Use this when you need access to LSP services (e.g. definitionProvider) for testing.
export async function buildWorkspaceWithFiles(
  files: VirtualFile[],
  opts: ParseMultipleFilesOpts = {},
): Promise<{
  workspace: TaoWorkspace
  documents: Map<string, Langium.LangiumDocument<TaoFile>>
  getFile: (path: string) => Wrapped<TaoFile>
  getErrors: () => TaoErrorReport
}> {
  const { workspace, documents } = await buildWorkspaceAndDocuments(files, opts.stdLibRoot ?? undefined)

  return {
    workspace,
    documents,
    getFile(path: string): Wrapped<TaoFile> {
      const doc = documents.get(path)
      Assert(doc, `No document found for path: ${path}`)
      const errorReports = getDocumentErrors(...documents.values())
      Assert(!errorReports.hasError(), `Expected no errors: ${errorReports.getHumanErrorMessage()}`)
      return wrap(doc.parseResult.value)
    },
    getErrors(): TaoErrorReport {
      return getDocumentErrors(...documents.values())
    },
  }
}
