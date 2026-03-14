import { createTaoWorkspace, TaoWorkspace } from '@tao-compiler/tao-services'
import * as Langium from 'langium'
import { NodeFileSystem } from 'langium/node'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { throwUserInputRejectionError } from './@shared/TaoErrors'
import { assertNever } from './compiler-utils'
import { AST } from './grammar'
import { getDocumentErrors, TaoErrorReport } from './parse-errors'
import { fileExists, readDir, streamFilesIn } from './Paths'
import { isStdLibImport, resolveStdLibModuleDirectory } from './StdLibPaths'

export type ParseOptions = {
  stdLibRoot?: string
  validateUpToStage?: 'lexing' | 'parsing' | 'linking' | 'all' | 'none'
  skipSlowValidation?: boolean
}

export type ParseResult = {
  taoFileAST?: AST.TaoFile
  usedFilesASTs: AST.TaoFile[]
  errorReport: TaoErrorReport
}

export const TaoParser = {
  parseString,
  parseFile,
}

// parseString parses a Tao code string into a TaoFile AST.
async function parseString(code: string, opts: ParseOptions): Promise<ParseResult> {
  const codeHash = getCodeHash(code)
  const evalCodeUri = `tao-string://v0/hash/${codeHash}.tao`
  const uri = Langium.URI.parse(evalCodeUri, STRICT_URIs)
  return await internalParseTaoCode(uri, opts, code)
}

// parseFile parses a Tao file into a TaoFile AST.
async function parseFile(filePath: string, opts: ParseOptions): Promise<ParseResult> {
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
  const workspace = createTaoWorkspace(NodeFileSystem, { stdLibRoot: opts.stdLibRoot })
  const ext = path.extname(uri.path)
  if (!workspace.supportsExtension(ext)) {
    throwUserInputRejectionError(
      `Unsupported extension: ${ext}. (Supported: ${workspace.getFileExtensions().join(', ')})`,
    )
  }

  const { entryDocument, usedDocuments } = await loadEntryAndReachable(uri, evalString, workspace)
  const validation = getValidationOptions(opts)
  await workspace.buildDocuments(usedDocuments, { validation, eagerLinking: true })
  await workspace.buildDocument(entryDocument, { validation, eagerLinking: true })
  const errorReport = getDocumentErrors(entryDocument, ...usedDocuments)

  return {
    taoFileAST: entryDocument.parseResult.value,
    usedFilesASTs: usedDocuments.map(doc => doc.parseResult.value),
    errorReport,
  }
}

// loadEntryAndReachable loads the entry document (from string or file) and returns it plus the list of documents to build.
async function loadEntryAndReachable(
  uri: Langium.URI,
  evalString: string | null,
  workspace: TaoWorkspace,
): Promise<{
  entryDocument: Langium.LangiumDocument<AST.TaoFile>
  usedDocuments: Langium.LangiumDocument<AST.TaoFile>[]
}> {
  const entryDocument = evalString !== null
    ? workspace.createDocumentFromString(evalString, uri)
    : await workspace.createDocumentFromUri(uri)

  workspace.addDocument(entryDocument)

  await addAllStdLibFiles(workspace)
  await addReachableTaoFiles(entryDocument, workspace)
  await addSameDirectoryTaoFiles(entryDocument, workspace)
  const allDocuments = workspace.getAllDocuments()
  // Ensure use references are built before the files that depend on them.
  const usedDocuments = allDocuments.reverse().filter(doc => doc.uri.path !== entryDocument.uri.path)
  return { entryDocument, usedDocuments }
}

// addAllStdLibFiles loads all .tao files from stdLibRoot into the workspace.
async function addAllStdLibFiles(workspace: TaoWorkspace) {
  if (!workspace.hasStdLib()) {
    return
  }
  const taoFilesStream = streamFilesIn(workspace.getStdLibRoot()!, {
    includeOnlyExtensions: workspace.getFileExtensions(),
  })
  for await (const filePath of taoFilesStream) {
    await addReachableTaoFileDocument(workspace, filePath)
  }
}

// getUseStatementModuleDirectory returns the directory of a use statement's module.
// Returns undefined for same-module imports (no modulePath), which are handled by addSameDirectoryTaoFiles.
function getUseStatementModuleDirectory(
  ast: AST.UseStatement,
  currentDir: string,
  stdLibRoot?: string,
): string | undefined {
  if (!ast.modulePath) {
    return undefined
  }
  if (isStdLibImport(ast.modulePath)) {
    return resolveStdLibModuleDirectory(ast.modulePath, stdLibRoot!)
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
): Promise<void> {
  const seenFilePaths = new Set<string>(document.uri.path)

  for (const ast of document.parseResult.value.topLevelStatements) {
    if (!AST.isUseStatement(ast)) {
      continue
    }

    const directory = getUseStatementModuleDirectory(
      ast,
      path.dirname(document.uri.path),
      workspace.getStdLibRoot(),
    )
    if (!directory) {
      continue
    }
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
  return readDir(directory)
    .filter((name) => workspace.supportsExtension(path.extname(name)))
    .map((name) => path.resolve(directory, name))
}

// addReachableTaoFileDocument adds a .tao file document to the parser's workspace if not already present.
async function addReachableTaoFileDocument(workspace: TaoWorkspace, filePath: string): Promise<void> {
  const langiumUri = toLangiumFileURI(filePath)
  const doc = await workspace.createDocumentFromUri(langiumUri)
  workspace.addDocument(doc)
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
