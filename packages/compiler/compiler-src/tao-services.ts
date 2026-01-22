import * as langium from 'langium'
import * as LSP from 'langium/lsp'

import { TaoLangGeneratedModule, TaoLangGeneratedSharedModule } from '@tao-compiler/_gen-tao-parser/module'

import { TaoScopeComputation } from '@tao-compiler/TaoScopeComputation'
import { TaoScopeProvider } from '@tao-compiler/TaoScopeProvider'
import { validator } from '@tao-compiler/validation/tao-lang-validator.js'
import TaoFormatter from '../formatter-src/TaoFormatter'

export type TaoServices = LSP.LangiumServices

export type TaoServicesResult = {
  shared: LSP.LangiumSharedServices
  Tao: LSP.LangiumServices
  metaData: langium.LanguageMetaData
}

// Create the services required by Langium.
// This is a pretty opaque process, but it's how langium expects it.
export function createTaoServices(context: LSP.DefaultSharedModuleContext): TaoServicesResult {
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
      validation: {
        TaoLangValidator: () => validator,
      },
    },
  )

  TaoModule.shared.ServiceRegistry.register(TaoModule)
  TaoModule.validation.ValidationRegistry.register(validator, TaoModule.validation.TaoLangValidator)

  if (!context.connection) {
    // We're not inside a language server, so
    // initialize the configuration provider instantly
    TaoModule.shared.workspace.ConfigurationProvider.initialized({})
  }

  // TODO: Is there a difference between sharedTaoModule and TaoModule.shared?
  return { shared: sharedTaoModule, Tao: TaoModule, metaData: TaoModule.LanguageMetaData }
}
