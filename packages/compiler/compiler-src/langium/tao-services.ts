import { LGM as langium } from '@parser'
import * as LSP from '@parser/lsp'

import { validator } from '@compiler/validation/tao-lang-validator'
import { UseStatementValidator } from '@compiler/validation/UseStatementValidator'
import TaoFormatter from '@formatter/TaoFormatter'
import { AST, TaoTokenBuilder } from '@parser/parser'
import { createTypirLangiumServices, initializeLangiumTypirServices } from 'typir-langium'
import { TaoTypeSystem, type TaoTypirServices } from '../typing/tao-type-system'
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
    private readonly typir: TaoTypirServices,
    private readonly stdLibRoot?: string,
  ) {
  }

  /** getTypir returns the Tao Typir service graph (primitives, inference, validation). Exposed primarily for tests and debugging. */
  getTypir(): TaoTypirServices {
    return this.typir
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

  /** hasStdLib returns true when a non-empty std-lib root path is configured. */
  hasStdLib(): boolean {
    return Boolean(this.stdLibRoot)
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
    AST.GeneratedSharedModule,
    {
      workspace: {
        WorkspaceManager: (services: langium.LangiumSharedCoreServices) =>
          new TaoWorkspaceManager(services, config.stdLibRoot),
      },
    },
  )

  const TaoModule = langium.inject(
    LSP.createDefaultModule({ shared: sharedTaoModule }),
    AST.GeneratedModule,
    {
      lsp: {
        Formatter: () => new TaoFormatter(),
        DefinitionProvider: (services: LSP.LangiumServices) => new TaoDefinitionProvider(services, config.stdLibRoot),
      },
      parser: {
        // TaoTokenBuilder returns a Chevrotain multi-mode lexer for native string-template parsing
        // (default / string / interp modes). See `tao-token-builder.ts`.
        TokenBuilder: () => new TaoTokenBuilder(),
      },
      references: {
        ScopeComputation: (services: langium.LangiumCoreServices) => new TaoScopeComputation(services),
        ScopeProvider: (services: langium.LangiumCoreServices) => new TaoScopeProvider(services, config.stdLibRoot),
      },
      // Typir services are built per-language so they share the Langium document lifecycle; `initializeLangiumTypirServices` must run once after `ServiceRegistry.register`.
      typir: () => createTypirLangiumServices(sharedTaoModule, AST.reflection, new TaoTypeSystem(), {}),
    },
  )

  TaoModule.shared.ServiceRegistry.register(TaoModule)

  initializeLangiumTypirServices(TaoModule, TaoModule.typir)

  // Validation registration
  const useStatementValidator = new UseStatementValidator(
    sharedTaoModule.workspace.IndexManager,
    sharedTaoModule.workspace.LangiumDocuments,
    config.stdLibRoot,
  )

  // Spread `validator` so every Langium check stays registered (avoids drift vs hand-picked keys); override
  // `UseStatement` with the module-resolution-aware implementation until it is merged into `validator`.
  TaoModule.validation.ValidationRegistry.register<AST.TaoLangAstType>({
    ...validator,
    UseStatement: useStatementValidator.checkUseStatement.bind(useStatementValidator),
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
    TaoModule.typir,
    config.stdLibRoot,
  )
}
