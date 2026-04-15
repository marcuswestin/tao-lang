import { NodeFileSystem } from '@parser/node'
import { AST, LGM } from '@parser/parser'
import { Assert, FS } from '@shared'
import { createHash } from '@shared/crypto'
import { throwUserInputRejectionError } from '@shared/TaoErrors'
import { isTaoModuleImport, resolveModuleImportDirectory } from '../resolution/ModulePath'
import { getParseError, ParseError } from '../validation/parse-errors'
import { createTaoWorkspace, TaoWorkspace } from './tao-services'

export type ParseOptions = {
  stdLibRoot?: string
  validateUpToStage?: 'lexing' | 'parsing' | 'linking' | 'all' | 'none'
  skipSlowValidation?: boolean
}

export type ParseResult = {
  taoFileAST?: AST.TaoFile
  usedFilesASTs: AST.TaoFile[]
  errorReport: ParseError
}

export const TaoParser = {
  /** parseFile parses a Tao code file into a `TaoFile` AST node and its related documents. */
  async parseFile(filePath: string, opts: ParseOptions): Promise<ParseResult> {
    const resolvedPath = FS.resolvePath(filePath)
    const uri = toLangiumFileURI(resolvedPath)
    if (uri.scheme !== 'file') {
      throwUserInputRejectionError(`Unsupported scheme: ${uri.scheme}`)
    }
    if (!FS.isFile(uri.path)) {
      throwUserInputRejectionError(`Missing file: ${filePath}. No file at ${uri.fsPath}`)
    }
    return await internalParseTaoCode(uri, opts, null)
  },
  /** parseString is like parseFile, but takes a string of code. Used for testing. */
  async parseString(code: string, opts: ParseOptions): Promise<ParseResult> {
    // codeHash creates a stable URI for the code string. Same code -> same URI.
    const codeHash = createHash('sha256').update(code).digest('hex')
    const evalCodeUri = `tao-string://v0/hash/${codeHash}.tao`
    const uri = LGM.URI.parse(evalCodeUri, STRICT_URIs)
    return await internalParseTaoCode(uri, opts, code)
  },
}

// Internal functions
/////////////////////
const STRICT_URIs = true

/** internalParseTaoCode parses from URI with optional in-memory string content. */
async function internalParseTaoCode(
  uri: LGM.URI,
  opts: ParseOptions,
  evalString: string | null,
): Promise<ParseResult> {
  const workspace = createTaoWorkspace(NodeFileSystem, { stdLibRoot: opts.stdLibRoot })
  const ext = FS.extname(uri.path)
  if (!workspace.supportsExtension(ext)) {
    throwUserInputRejectionError(
      `Unsupported extension: ${ext}. (Supported: ${workspace.getFileExtensions().join(', ')})`,
    )
  }

  const { entryDocument, usedDocuments } = await loadEntryAndReachable(uri, evalString, workspace)
  const validation = getValidationOptions(opts)
  await workspace.buildDocuments(usedDocuments, { validation, eagerLinking: true })
  await workspace.buildDocument(entryDocument, { validation, eagerLinking: true })
  const errorReport = getParseError(entryDocument, ...usedDocuments)

  return {
    taoFileAST: entryDocument.parseResult.value,
    usedFilesASTs: usedDocuments.map(doc => doc.parseResult.value),
    errorReport,
  }
}

/** loadEntryAndReachable loads the entry document and all docs to build (stdlib, imports, same dir). */
async function loadEntryAndReachable(
  uri: LGM.URI,
  evalString: string | null,
  workspace: TaoWorkspace,
): Promise<{
  entryDocument: AST.Document
  usedDocuments: AST.Document[]
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

/** addAllStdLibFiles adds every .tao file under the std lib root to the workspace. */
async function addAllStdLibFiles(workspace: TaoWorkspace) {
  if (!workspace.hasStdLib()) {
    return
  }
  const taoFilesStream = FS.streamFilesIn(workspace.getStdLibRoot()!, {
    includeOnlyExtensions: workspace.getFileExtensions(),
  })
  for await (const filePath of taoFilesStream) {
    await addReachableTaoFileDocument(workspace, filePath)
  }
}

/** getUseStatementModuleDirectory returns the resolved module directory for a use path, or undefined for same-module imports. */
function getUseStatementModuleDirectory(
  ast: AST.UseStatement,
  currentDir: string,
  stdLibRoot?: string,
): string | undefined {
  if (!ast.modulePath) {
    return undefined
  }
  if (isTaoModuleImport(ast.modulePath)) {
    if (!stdLibRoot) {
      return undefined
    }
    return resolveModuleImportDirectory(ast.modulePath, { stdLibRoot })
  }
  return FS.resolvePath(currentDir, ast.modulePath)
}

/** addSameDirectoryTaoFiles adds sibling .tao files in the entry file directory. */
async function addSameDirectoryTaoFiles(
  document: AST.Document,
  workspace: TaoWorkspace,
) {
  const entryPath = document.uri.path
  const dir = FS.dirname(entryPath)
  const sameDirFiles = getModuleTaoFiles(workspace, dir)
  for (const filePath of sameDirFiles) {
    if (filePath === entryPath) {
      continue
    }
    await addReachableTaoFileDocument(workspace, filePath)
  }
}

/** addReachableTaoFiles adds .tao files reachable from the entry via use statements. */
async function addReachableTaoFiles(
  document: AST.Document,
  workspace: TaoWorkspace,
): Promise<void> {
  const seenFilePaths = new Set<string>(document.uri.path)

  for (const ast of document.parseResult.value.statements) {
    if (!AST.isUseStatement(ast)) {
      continue
    }

    const directory = getUseStatementModuleDirectory(
      ast,
      FS.dirname(document.uri.path),
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

/** getModuleTaoFiles returns absolute paths to supported Tao files in a directory. */
function getModuleTaoFiles(workspace: TaoWorkspace, directory: string): string[] {
  return FS.readDir(directory)
    .filter((name) => workspace.supportsExtension(FS.extname(name)))
    .map((name) => FS.resolvePath(directory, name))
}

/** addReachableTaoFileDocument creates and adds a document for a .tao file path. */
async function addReachableTaoFileDocument(workspace: TaoWorkspace, filePath: string): Promise<void> {
  const langiumUri = toLangiumFileURI(filePath)
  const doc = await workspace.createDocumentFromUri(langiumUri)
  workspace.addDocument(doc)
}

/** toLangiumFileURI builds a Langium file URI from an absolute filesystem path. */
function toLangiumFileURI(absolutePath: string): LGM.URI {
  return LGM.URI.parse(`file://${absolutePath}`, STRICT_URIs)
}

/** getValidationOptions maps ParseOptions to Langium validation flags. */
function getValidationOptions(opts: ParseOptions): LGM.ValidationOptions | boolean {
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
      Assert.never(validateUpToStage)
  }
}
