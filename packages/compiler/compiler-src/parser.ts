import * as Langium from 'langium'
import { NodeFileSystem } from 'langium/node'
import path from 'node:path'

import { createHash } from 'node:crypto'
import { statSync } from 'node:fs'
import { createTaoServices } from 'tao-compiler'
import { Log } from './@shared/Log'
import { throwUserInputRejectionError } from './@shared/TaoErrors'
import { AST } from './grammar'
import { ErrorReport, getDocumentErrors } from './parse-errors'

export type ParseOptions = {
  validateUpToStage?: 'lexing' | 'parsing' | 'linking' | 'all' | 'none'
  skipSlowValidation?: boolean
  suppressThrowOnError?: boolean
}

export type ParseResult = {
  taoFileAST?: AST.TaoFile
  document?: Langium.LangiumDocument<AST.TaoFile>
  errorReport?: ErrorReport
}

export const TaoParser = {
  parseString,
  parseFile,
}

const STRICT_URIs = true

function getCodeHash(code: string) {
  // Bun.hash(code).toString(16)
  return createHash('sha256').update(code).digest('hex')
}

async function parseString(code: string, opts: ParseOptions = {}): Promise<ParseResult> {
  const codeHash = getCodeHash(code)
  const evalCodeUri = `tao-string://v0/hash/${codeHash}.tao`
  const uri = Langium.URI.parse(evalCodeUri, STRICT_URIs)
  return await internalParseTaoCode(uri, opts, code)
}

async function parseFile(filePath: string, opts: ParseOptions = {}): Promise<ParseResult> {
  const uri = Langium.URI.parse(`file://${filePath}`, STRICT_URIs)
  // const uri = Langium.URI.parse(filePath, STRICT_URIs)
  if (uri.scheme !== 'file') {
    const ioError = new Error(`Unsupported scheme: ${uri.scheme}`)
    return createErrorResult(opts, { ioError })
  }
  if (!fileExists(uri.path)) {
    const message = `Missing file: ${filePath}. No file at ${uri.fsPath}`
    return { errorReport: { ioError: new Error(message) } }
  }
  return await internalParseTaoCode(uri, opts, null)
}

// Internal functions
/////////////////////

async function internalParseTaoCode(
  uri: Langium.URI,
  opts: ParseOptions,
  evalString: string | null,
): Promise<ParseResult> {
  const { shared, Tao } = createTaoServices(NodeFileSystem)

  const extension = path.extname(uri.path)
  const supportedExtensions = Tao.LanguageMetaData.fileExtensions
  if (!supportedExtensions.includes(extension)) {
    throwUserInputRejectionError(
      `Unsupported extension: ${extension}. Choose a file with ${supportedExtensions.join(', ')}.`,
    )
  }

  const services: Langium.LangiumCoreServices = Tao
  Log('TODO: Use shared for .. what? imports?')

  Log('TODO: Which function to use')
  // const document = await Tao.shared.workspace.LangiumDocuments.getOrCreateDocument(uri)
  const documentFactory = Tao.shared.workspace.LangiumDocumentFactory
  const document = await (evalString
    ? documentFactory.fromString<AST.TaoFile>(evalString, uri)
    : documentFactory.fromUri<AST.TaoFile>(uri))

  services.shared.workspace.LangiumDocuments.addDocument(document)
  Log.warn('TODO: ADD Standard Library and Document Imports')

  // Why is this shared, vs Tao.shared?
  const buildOptions = { validation: getValidationOptions(opts) }
  await shared.workspace.DocumentBuilder.build([document], buildOptions)
  const errorReport = getDocumentErrors(document)
  return { taoFileAST: document.parseResult.value, document, errorReport }
}

function createErrorResult(opts: ParseOptions, errorReport: ErrorReport): ParseResult {
  if (opts.suppressThrowOnError) {
    return { errorReport }
  } else {
    const additionalHumanInfoMessage = JSON.stringify(errorReport, null, 2)
    throwUserInputRejectionError(
      `There was an error parsing your code: ${additionalHumanInfoMessage}`,
    )
  }
}

function getValidationOptions(opts: ParseOptions): Langium.ValidationOptions | boolean {
  const categories = opts.skipSlowValidation ? ['fast'] : undefined
  switch (opts.validateUpToStage ?? 'all') {
    case 'none':
      return false
    case 'all':
      return { categories }
    case 'lexing':
      return { categories, stopAfterLexingErrors: true }
    case 'parsing':
      return { categories, stopAfterParsingErrors: true }
    case 'linking':
      return { categories, stopAfterLinkingErrors: true }
  }
}

// TODO WE NEED TO SHARE THESE
function fileExists(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false // does not exist or inaccessible
  }
}
