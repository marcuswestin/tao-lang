import * as langium from 'langium'
import * as LSP from 'langium/lsp'

import { TaoLangGeneratedModule, TaoLangGeneratedSharedModule } from '@tao-compiler/_gen-tao-parser/module'

import { validator } from '@tao-compiler/validation/tao-lang-validator.js'

export type TaoServices = LSP.LangiumServices

type TaoServicesResult = {
  shared: LSP.LangiumSharedServices
  Tao: LSP.LangiumServices
}

// Create the services required by Langium.
// This is a pretty opaque process, but it's how langium expects it.
export function createTaoServices(context: LSP.DefaultSharedModuleContext): TaoServicesResult {
  const shared = langium.inject(
    LSP.createDefaultSharedModule(context),
    TaoLangGeneratedSharedModule,
  )
  const Tao = langium.inject(
    LSP.createDefaultModule({ shared }),
    TaoLangGeneratedModule,
    {
      validation: {
        TaoLangValidator: () => validator,
      },
    },
  )

  shared.ServiceRegistry.register(Tao)
  Tao.validation.ValidationRegistry.register(validator, Tao.validation.TaoLangValidator)

  if (!context.connection) {
    // We're not inside a language server, so
    // initialize the configuration provider instantly
    shared.workspace.ConfigurationProvider.initialized({})
  }
  return { shared, Tao }
}
