import { ModulePath, normalizeModulePath } from '@compiler/ModulePath'

/** ModuleImports tracks which modules were imported during codegen (see RuntimeGenCtx.moduleImports). */
export class ModuleImports {
  private importedModules = new Set<ModulePath>()
  add(module: ModulePath) {
    this.importedModules.add(normalizeModulePath(module))
  }
}
