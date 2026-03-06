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

export type TaoWorkspaceConfig = {
  stdLibRoot?: string
}

export class TaoWorkspace {
  readonly shared: LSP.LangiumSharedServices
  readonly documents: langium.LangiumDocuments
  readonly documentBuilder: langium.DocumentBuilder
  readonly fileExtensions: readonly string[]
  readonly documentFactory: langium.LangiumDocumentFactory
  readonly formatter: LSP.Formatter & TaoFormatter
  readonly definitionProvider: LSP.DefinitionProvider
  readonly stdLibRoot?: string

  private readonly seenFilePaths = new Set<string>()

  constructor(opts: {
    shared: LSP.LangiumSharedServices
    documents: langium.LangiumDocuments
    documentBuilder: langium.DocumentBuilder
    fileExtensions: readonly string[]
    documentFactory: langium.LangiumDocumentFactory
    formatter: LSP.Formatter & TaoFormatter
    definitionProvider: LSP.DefinitionProvider
    stdLibRoot?: string
  }) {
    this.shared = opts.shared
    this.documents = opts.documents
    this.documentBuilder = opts.documentBuilder
    this.fileExtensions = opts.fileExtensions
    this.documentFactory = opts.documentFactory
    this.formatter = opts.formatter
    this.definitionProvider = opts.definitionProvider
    this.stdLibRoot = opts.stdLibRoot
  }

  // addDocument adds the document to the workspace only if its uri.path has not been seen before.
  addDocument(document: langium.LangiumDocument): void {
    const path = document.uri.path
    if (this.seenFilePaths.has(path)) {
      return
    }
    this.seenFilePaths.add(path)
    this.documents.addDocument(document)
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
  })

  if (!context.connection) {
    // We're not inside a language server, so
    // initialize the configuration provider instantly
    TaoModule.shared.workspace.ConfigurationProvider.initialized({})
  }

  // TODO: Is there a difference between sharedTaoModule and TaoModule.shared?
  return new TaoWorkspace({
    shared: sharedTaoModule,
    documents: TaoModule.shared.workspace.LangiumDocuments,
    documentBuilder: TaoModule.shared.workspace.DocumentBuilder,
    fileExtensions: TaoModule.LanguageMetaData.fileExtensions,
    documentFactory: TaoModule.shared.workspace.LangiumDocumentFactory,
    formatter: TaoModule.lsp.Formatter,
    definitionProvider: TaoModule.lsp.DefinitionProvider,
    stdLibRoot: config.stdLibRoot,
  })
}

