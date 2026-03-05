import { createTaoWorkspace, TaoWorkspace } from '@tao-compiler/tao-services'
import * as Langium from 'langium'
import { NodeFileSystem } from 'langium/node'
import { createHash } from 'node:crypto'
import path from 'node:path'
import {
  throwNotYetImplementedError,
  throwUserInputRejectionError,
} from './@shared/TaoErrors'
import { assertNever } from './compiler-utils'
import { AST } from './grammar'
import { getDocumentErrors, TaoErrorReport } from './parse-errors'
import { fileExists, readDir } from './Paths'

export type ParseOptions = {
  validateUpToStage?: 'lexing' | 'parsing' | 'linking' | 'all' | 'none'
  skipSlowValidation?: boolean
}

export type ParseResult = {
  taoFileAST?: AST.TaoFile
  document?: Langium.LangiumDocument<AST.TaoFile>
  errorReport: TaoErrorReport
}

export const TaoParser = {
  parseString,
  parseFile,
}

// parseString parses a Tao code string into a TaoFile AST.
async function parseString(code: string, opts: ParseOptions = {}): Promise<ParseResult> {
  const codeHash = getCodeHash(code)
  const evalCodeUri = `tao-string://v0/hash/${codeHash}.tao`
  const uri = Langium.URI.parse(evalCodeUri, STRICT_URIs)
  return await internalParseTaoCode(uri, opts, code)
}

// parseFile parses a Tao file into a TaoFile AST.
async function parseFile(filePath: string, opts: ParseOptions = {}): Promise<ParseResult> {
  const resolvedPath = path.resolve(filePath)
  const uri = toLangiumFileURI(resolvedPath)
  if (uri.scheme !== 'file') {
    throwUserInputRejectionError(`Unsupported scheme: ${uri.scheme}`)
  }
  if (!fileExists(uri.path)) {
    throwUserInputRejectionError(`Missing file: ${filePath}. No file at ${uri.fsPath}`)
  }
  return await internalParseTaoCode(uri, opts, null)
}

// Internal functions
/////////////////////
const STRICT_URIs = true

function getCodeHash(code: string) {
  // Bun.hash(code).toString(16)
  return createHash('sha256').update(code).digest('hex')
}

// internalParseTaoCode parses a Tao code string or file into a TaoFile AST.
async function internalParseTaoCode(
  uri: Langium.URI,
  opts: ParseOptions,
  evalString: string | null,
): Promise<ParseResult> {
  const workspace = createTaoWorkspace(NodeFileSystem)
  const ext = path.extname(uri.path)
  if (!workspace.fileExtensions.includes(ext)) {
    throwUserInputRejectionError(
      `Unsupported extension: ${ext}. (Supported: ${workspace.fileExtensions.join(', ')})`,
    )
  }

  const { entryDocument, documentsToBuild } = await loadEntryAndReachable(uri, evalString, workspace)
  const buildOptions = { validation: getValidationOptions(opts), eagerLinking: true }
  await workspace.documentBuilder.build(documentsToBuild, buildOptions)
  const errorReport = getDocumentErrors(...documentsToBuild)
  return { taoFileAST: entryDocument.parseResult.value, document: entryDocument, errorReport }
}

// loadEntryAndReachable loads the entry document (from string or file) and returns it plus the list of documents to build.
async function loadEntryAndReachable(
  uri: Langium.URI,
  evalString: string | null,
  workspace: TaoWorkspace,
): Promise<{
  entryDocument: Langium.LangiumDocument<AST.TaoFile>
  documentsToBuild: Langium.LangiumDocument<AST.TaoFile>[]
}> {
  const documentFactory = workspace.documentFactory
  const entryDocument = await (evalString !== null
    ? documentFactory.fromString<AST.TaoFile>(evalString, uri)
    : documentFactory.fromUri<AST.TaoFile>(uri))

  workspace.documents.addDocument(entryDocument)

  await addReachableTaoFiles(entryDocument, workspace)
  await addSameDirectoryTaoFiles(entryDocument, workspace)
  const documentsToBuild = Array.from(workspace.documents.all) as Langium.LangiumDocument<AST.TaoFile>[]
  // Ensure the entry document is last in the list, so it's built last.
  documentsToBuild.reverse()
  return { entryDocument, documentsToBuild }
}

// getUseStatementModuleDirectory returns the directory of a use statement's module.
function getUseStatementModuleDirectory(ast: AST.UseStatement, currentDir: string): string {
  const isRelativeModulePath = ast.modulePath.startsWith('.')
  if (!isRelativeModulePath) {
    throwNotYetImplementedError('Named module imports are not supported yet')
  }
  return path.resolve(currentDir, ast.modulePath)
}

// addSameDirectoryTaoFiles adds all .tao files in the entry's directory so same-module scope can resolve (e.g. FridgeView in Fridge.tao).
async function addSameDirectoryTaoFiles(
  document: Langium.LangiumDocument<AST.TaoFile>,
  workspace: TaoWorkspace,
) {
  const entryPath = document.uri.path
  const dir = path.dirname(entryPath)
  const sameDirFiles = getModuleTaoFiles(workspace, dir)
  for (const filePath of sameDirFiles) {
    if (filePath === entryPath) {
      continue
    }
    await addReachableTaoFileDocument(workspace, filePath)
  }
}

// addReachableTaoFiles adds all .tao file paths reachable from the entry file via use statements.
// Used by file-based parsing so that imports resolve (UseStatementValidator and TaoScopeProvider need those documents in the workspace).
async function addReachableTaoFiles(
  document: Langium.LangiumDocument<AST.TaoFile>,
  workspace: TaoWorkspace,
) {
  const seenFilePaths = new Set<string>(document.uri.path)

  // collect all documents reachable from the entry document
  for (const ast of document.parseResult.value.topLevelStatements) {
    if (!AST.isUseStatement(ast) || !ast.modulePath) {
      continue
    }

    const directory = getUseStatementModuleDirectory(ast, path.dirname(document.uri.path))
    const moduleTaoFiles = getModuleTaoFiles(workspace, directory)
    for (const moduleTaoFile of moduleTaoFiles) {
      if (!seenFilePaths.has(moduleTaoFile)) {
        seenFilePaths.add(moduleTaoFile)
        await addReachableTaoFileDocument(workspace, moduleTaoFile)
      }
    }
  }
}

// getModuleTaoFiles returns all .tao files paths in a directory.
function getModuleTaoFiles(workspace: TaoWorkspace, directory: string): string[] {
  const fileExtensions = workspace.fileExtensions
  return readDir(directory)
    .filter((name) => fileExtensions.includes(path.extname(name)))
    .map((name) => path.resolve(directory, name))
}

// addReachableTaoFileDocument adds a .tao file document to the parser's workspace.
async function addReachableTaoFileDocument(workspace: TaoWorkspace, filePath: string) {
  const langiumUri = toLangiumFileURI(filePath)
  const docFactory = workspace.documentFactory
  const doc = await docFactory.fromUri<AST.TaoFile>(langiumUri)
  workspace.documents.addDocument(doc)
}

// toLangiumFileURI builds a Langium file URI from an absolute path. Use path.resolve first when needed.
function toLangiumFileURI(absolutePath: string): Langium.URI {
  return Langium.URI.parse(`file://${absolutePath}`, STRICT_URIs)
}

function getValidationOptions(opts: ParseOptions): Langium.ValidationOptions | boolean {
  const categories = opts.skipSlowValidation ? ['fast'] : undefined
  const validateUpToStage = opts.validateUpToStage ?? 'all'

  switch (validateUpToStage) {
    case 'none':
      return false
    case 'all':
      return true
    case 'lexing':
      return { categories, stopAfterLexingErrors: true }
    case 'parsing':
      return { categories, stopAfterParsingErrors: true }
    case 'linking':
      return { categories, stopAfterLinkingErrors: true }
    default:
      assertNever(validateUpToStage)
  }
}
