import * as langium from 'langium'
import * as LSP from 'langium/lsp'

import { TaoLangGeneratedModule, TaoLangGeneratedSharedModule } from '@tao-compiler/_gen-tao-parser/module'

import { TaoScopeComputation } from '@tao-compiler/TaoScopeComputation'
import { TaoScopeProvider } from '@tao-compiler/TaoScopeProvider'
import { validator } from '@tao-compiler/validation/tao-lang-validator'
import { UseStatementValidator } from '@tao-compiler/validation/UseStatementValidator'
import TaoFormatter from '../formatter-src/TaoFormatter'
import { AST } from './grammar'

export type TaoWorkspace = {
  documents: langium.LangiumDocuments
  documentBuilder: langium.DocumentBuilder
  fileExtensions: readonly string[]
  documentFactory: langium.LangiumDocumentFactory
  formatter: LSP.Formatter & TaoFormatter
}

// Create the parser services required by Langium.
// This is a pretty opaque process, but it's how langium expects it.
// TODO: Return named object with factory, builder, etc directly named instead of `shared`
export function createTaoWorkspace(context: LSP.DefaultSharedModuleContext): TaoWorkspace {
  const sharedTaoModule = langium.inject(
    LSP.createDefaultSharedModule(context),
    TaoLangGeneratedSharedModule,
  )

  const TaoModule = langium.inject(
    LSP.createDefaultModule({ shared: sharedTaoModule }),
    TaoLangGeneratedModule,
    {
      lsp: {
        Formatter: () => new TaoFormatter(),
      },
      references: {
        ScopeComputation: (services: langium.LangiumCoreServices) => new TaoScopeComputation(services),
        ScopeProvider: (services: langium.LangiumCoreServices) => new TaoScopeProvider(services),
      },
    },
  )

  TaoModule.shared.ServiceRegistry.register(TaoModule)

  // Validation registration
  const useStatementValidator = new UseStatementValidator(
    sharedTaoModule.workspace.IndexManager,
    sharedTaoModule.workspace.LangiumDocuments,
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
  return {
    documents: TaoModule.shared.workspace.LangiumDocuments,
    documentBuilder: TaoModule.shared.workspace.DocumentBuilder,
    fileExtensions: TaoModule.LanguageMetaData.fileExtensions,
    documentFactory: TaoModule.shared.workspace.LangiumDocumentFactory,
    formatter: TaoModule.lsp.Formatter,
  }
}

// class TaoWorkspace {
//   constructor(private readonly shared: LSP.LangiumSharedServices, private readonly Tao: LSP.LangiumServices) {
//   }

//   get documents() {
//     return this.shared.workspace.LangiumDocuments
//   }

//   buildDocument()

//   get builder() {
//     return this.shared.workspace.DocumentBuilder
//   }
// }
