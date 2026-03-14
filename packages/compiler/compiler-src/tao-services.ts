import * as langium from 'langium'
import * as LSP from 'langium/lsp'

import { TaoLangGeneratedModule, TaoLangGeneratedSharedModule } from '@tao-compiler/_gen-tao-parser/module'

import { TaoDefinitionProvider } from '@tao-compiler/TaoDefinitionProvider'
import { TaoScopeComputation } from '@tao-compiler/TaoScopeComputation'
import { TaoScopeProvider } from '@tao-compiler/TaoScopeProvider'
import { TaoWorkspaceManager } from '@tao-compiler/TaoWorkspaceManager'
import { validator } from '@tao-compiler/validation/tao-lang-validator'
import { UseStatementValidator } from '@tao-compiler/validation/UseStatementValidator'
import TaoFormatter from '../formatter-src/TaoFormatter'
import { AST } from './grammar'

// TaoWorkspaceConfig configures createTaoWorkspace (e.g. std lib root path).
export type TaoWorkspaceConfig = {
  stdLibRoot?: string
}

// TaoWorkspaceBuildOptions options passed to buildDocument/buildDocuments (validation and eagerLinking).
export type TaoWorkspaceBuildOptions = {
  validation?: langium.ValidationOptions | boolean
  eagerLinking?: boolean
}

// TaoDocument is a Langium document whose parse result is a TaoFile AST.
export type TaoDocument = langium.LangiumDocument<AST.TaoFile>

// TaoWorkspace holds Langium services for parsing, validating, and formatting Tao files; provides a focused API for documents and building.
export class TaoWorkspace {
  constructor(
    private readonly shared: LSP.LangiumSharedServices,
    private readonly documents: langium.LangiumDocuments,
    private readonly documentBuilder: langium.DocumentBuilder,
    private readonly fileExtensions: readonly string[],
    private readonly documentFactory: langium.LangiumDocumentFactory,
    private readonly formatter: LSP.Formatter & TaoFormatter,
    private readonly definitionProvider: LSP.DefinitionProvider,
    private readonly stdLibRoot?: string,
  ) {
  }

  private readonly seenFilePaths = new Set<string>()

  // addDocument adds the document to the workspace only if its uri.path has not been seen before.
  addDocument(document: langium.LangiumDocument): void {
    const path = document.uri.path
    if (this.seenFilePaths.has(path)) {
      return
    }
    this.seenFilePaths.add(path)
    this.documents.addDocument(document)
  }

  // supportsExtension returns whether the given file extension is supported (e.g. .tao).
  supportsExtension(ext: string): boolean {
    return this.fileExtensions.includes(ext)
  }

  // getFileExtensions returns the list of supported file extensions.
  getFileExtensions(): readonly string[] {
    return this.fileExtensions
  }

  // getStdLibRoot returns the configured standard library root path, or undefined.
  getStdLibRoot(): string | undefined {
    return this.stdLibRoot
  }

  // getShared returns the Langium shared services (e.g. for startLanguageServer).
  getShared(): LSP.LangiumSharedServices {
    return this.shared
  }

  // hasStdLib returns true when a standard library root is configured.
  hasStdLib(): boolean {
    return this.stdLibRoot !== undefined
  }

  // buildDocument builds a single document with optional validation and eagerLinking.
  async buildDocument(doc: TaoDocument, opts?: TaoWorkspaceBuildOptions): Promise<void> {
    await this.documentBuilder.build([doc], opts)
  }

  // buildDocuments builds multiple documents with optional validation and eagerLinking.
  async buildDocuments(docs: TaoDocument[], opts?: TaoWorkspaceBuildOptions): Promise<void> {
    await this.documentBuilder.build(docs, opts)
  }

  // createDocumentFromString creates a Tao document from a string and URI (synchronous).
  createDocumentFromString(content: string, uri: langium.URI): TaoDocument {
    return this.documentFactory.fromString<AST.TaoFile>(content, uri) as TaoDocument
  }

  // createDocumentFromUri creates a Tao document by loading from the given URI.
  async createDocumentFromUri(uri: langium.URI): Promise<TaoDocument> {
    return await this.documentFactory.fromUri<AST.TaoFile>(uri)
  }

  // getAllDocuments returns all documents currently in the workspace.
  getAllDocuments(): TaoDocument[] {
    return Array.from(this.documents.all) as TaoDocument[]
  }

  // formatDocument runs the formatter on the document and returns text edits.
  async formatDocument(
    document: langium.LangiumDocument,
    options: Parameters<LSP.Formatter['formatDocument']>[1],
  ): Promise<ReturnType<LSP.Formatter['formatDocument']>> {
    return await this.formatter.formatDocument(document, options)
  }

  // getDocumentDefinition returns definition locations for the given document and position (go-to-definition).
  getDocumentDefinition(
    doc: TaoDocument,
    position: { line: number; character: number },
  ): ReturnType<LSP.DefinitionProvider['getDefinition']> {
    return this.definitionProvider.getDefinition(doc, {
      textDocument: { uri: doc.uri.toString() },
      position,
    })
  }
}

// createTaoWorkspace creates the Langium services for parsing and validating Tao files.
// TODO: Return named object with factory, builder, etc directly named instead of `shared`
export function createTaoWorkspace(
  context: LSP.DefaultSharedModuleContext,
  config: TaoWorkspaceConfig = {},
): TaoWorkspace {
  const sharedTaoModule = langium.inject(
    LSP.createDefaultSharedModule(context),
    TaoLangGeneratedSharedModule,
    {
      workspace: {
        WorkspaceManager: (services: langium.LangiumSharedCoreServices) =>
          new TaoWorkspaceManager(services, config.stdLibRoot),
      },
    },
  )

  const TaoModule = langium.inject(
    LSP.createDefaultModule({ shared: sharedTaoModule }),
    TaoLangGeneratedModule,
    {
      lsp: {
        Formatter: () => new TaoFormatter(),
        DefinitionProvider: (services: LSP.LangiumServices) => new TaoDefinitionProvider(services, config.stdLibRoot),
      },
      references: {
        ScopeComputation: (services: langium.LangiumCoreServices) => new TaoScopeComputation(services),
        ScopeProvider: (services: langium.LangiumCoreServices) => new TaoScopeProvider(services, config.stdLibRoot),
      },
    },
  )

  TaoModule.shared.ServiceRegistry.register(TaoModule)

  // Validation registration
  const useStatementValidator = new UseStatementValidator(
    sharedTaoModule.workspace.IndexManager,
    sharedTaoModule.workspace.LangiumDocuments,
    config.stdLibRoot,
  )
  TaoModule.validation.ValidationRegistry.register<AST.TaoLangAstType>({
    // TODO: Use validator instead of separate class
    UseStatement: useStatementValidator.checkUseStatement.bind(useStatementValidator),
    AppDeclaration: validator.AppDeclaration,
    AliasDeclaration: validator.AliasDeclaration,
  })

  if (!context.connection) {
    // We're not inside a language server, so
    // initialize the configuration provider instantly
    TaoModule.shared.workspace.ConfigurationProvider.initialized({})
  }

  // TODO: Is there a difference between sharedTaoModule and TaoModule.shared?
  return new TaoWorkspace(
    sharedTaoModule,
    TaoModule.shared.workspace.LangiumDocuments,
    TaoModule.shared.workspace.DocumentBuilder,
    TaoModule.LanguageMetaData.fileExtensions,
    TaoModule.shared.workspace.LangiumDocumentFactory,
    TaoModule.lsp.Formatter,
    TaoModule.lsp.DefinitionProvider,
    config.stdLibRoot,
  )
}
