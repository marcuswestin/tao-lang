import * as Langium from 'langium'
import { NodeFileSystem } from 'langium/node'
import path from 'node:path'

import { createTaoServices } from 'tao-compiler'
import { Log } from './@shared/Log'
import { AST } from './grammar'
import { ErrorReport, getDocumentErrors, throwTaoParserError } from './parse-errors'

export type ParseOptions = {
  validate?: 'all' | 'lexing' | 'parsing' | 'linking' | 'none'
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

async function parseString(code: string, opts: ParseOptions = {}): Promise<ParseResult> {
  const codeHash = Bun.hash(code).toString(16)
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
  const file = Bun.file(uri.path)
  if (!file.exists()) {
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
    return createErrorResult(opts, {
      ioError: new Error(`Unsupported extension: ${extension}. Choose a file with ${supportedExtensions.join(', ')}.`),
    })
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
    throwTaoParserError(errorReport)
  }
}

function getValidationOptions(opts: ParseOptions): Langium.ValidationOptions | boolean {
  const categories = opts.skipSlowValidation ? ['fast'] : undefined
  switch (opts.validate ?? 'all') {
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
