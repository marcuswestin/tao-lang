import * as langium from 'langium'
import * as LSP from 'langium/lsp'

import { validator } from '@compiler/validation/tao-lang-validator'
import { UseStatementValidator } from '@compiler/validation/UseStatementValidator'
import TaoFormatter from '@formatter/TaoFormatter'
import { AST, TaoLangGeneratedModule, TaoLangGeneratedSharedModule } from '@parser'
import { TaoDefinitionProvider } from './TaoDefinitionProvider'
import { TaoScopeComputation } from './TaoScopeComputation'
import { TaoScopeProvider } from './TaoScopeProvider'
import { TaoWorkspaceManager } from './TaoWorkspaceManager'

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

  /** addDocument registers the document if its uri.path was not already added. */
  addDocument(document: langium.LangiumDocument): void {
    const path = document.uri.path
    if (this.seenFilePaths.has(path)) {
      return
    }
    this.seenFilePaths.add(path)
    this.documents.addDocument(document)
  }

  /** supportsExtension returns true when ext is a supported Tao file extension. */
  supportsExtension(ext: string): boolean {
    return this.fileExtensions.includes(ext)
  }

  /** getFileExtensions returns the supported file extensions for Tao sources. */
  getFileExtensions(): readonly string[] {
    return this.fileExtensions
  }

  /** getStdLibRoot returns the configured std-lib root directory, if any. */
  getStdLibRoot(): string | undefined {
    return this.stdLibRoot
  }

  /** getShared returns Langium shared services (e.g. for language server wiring). */
  getShared(): LSP.LangiumSharedServices {
    return this.shared
  }

  /** hasStdLib returns true when a std-lib root is configured. */
  hasStdLib(): boolean {
    return this.stdLibRoot !== undefined
  }

  /** buildDocument parses, links, and validates a single document. */
  async buildDocument(doc: TaoDocument, opts?: TaoWorkspaceBuildOptions): Promise<void> {
    await this.documentBuilder.build([doc], opts)
  }

  /** buildDocuments parses, links, and validates multiple documents. */
  async buildDocuments(docs: TaoDocument[], opts?: TaoWorkspaceBuildOptions): Promise<void> {
    await this.documentBuilder.build(docs, opts)
  }

  /** createDocumentFromString builds an in-memory document from source and URI. */
  createDocumentFromString(content: string, uri: langium.URI): TaoDocument {
    return this.documentFactory.fromString<AST.TaoFile>(content, uri) as TaoDocument
  }

  /** createDocumentFromUri loads document content from the given URI. */
  async createDocumentFromUri(uri: langium.URI): Promise<TaoDocument> {
    return await this.documentFactory.fromUri<AST.TaoFile>(uri)
  }

  /** getAllDocuments returns all documents currently registered. */
  getAllDocuments(): TaoDocument[] {
    return Array.from(this.documents.all) as TaoDocument[]
  }

  /** formatDocument produces LSP text edits for the document. */
  async formatDocument(
    document: langium.LangiumDocument,
    options: Parameters<LSP.Formatter['formatDocument']>[1],
  ): Promise<ReturnType<LSP.Formatter['formatDocument']>> {
    return await this.formatter.formatDocument(document, options)
  }

  /** getDocumentDefinition returns go-to-definition results at the given position in doc. */
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

/** createTaoWorkspace wires the Langium Tao module and returns a TaoWorkspace API. */
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
    TaoFile: validator.TaoFile,
    Block: validator.Block,
    AppDeclaration: validator.AppDeclaration,
    Declaration: validator.Declaration,
    ParameterDeclaration: validator.ParameterDeclaration,
  })

  if (!context.connection) {
    // We're not inside a language server, so
    // initialize the configuration provider instantly
    void TaoModule.shared.workspace.ConfigurationProvider.initialized({})
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
