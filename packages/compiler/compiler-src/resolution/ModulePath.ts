import { FS } from '@shared'
import { Assert } from '@shared'

export type ModulePath = string & { __brand: 'ModulePath' }

/** normalizeModulePath joins and normalizes path segments and strips trailing slashes. */
export function normalizeModulePath(...parts: string[]): ModulePath {
  return FS.normalizePath(FS.joinPath(...parts)).replace(/\/+$/, '') as ModulePath
}

/** normalizedDirOfPath returns the normalized parent directory of a file path. */
export function normalizedDirOfPath(filePath: string): ModulePath {
  return normalizeModulePath(FS.dirname(filePath))
}

/** resolveModulePathFromFile resolves modulePath relative to the filePath directory. */
export function resolveModulePathFromFile(filePath: string, modulePath: string): ModulePath {
  return normalizeModulePath(normalizedDirOfPath(filePath), modulePath)
}

/** Prefix for Tao standard-library modules (`@tao/ui` → `<stdLibRoot>/tao/ui/...` on disk). */
export const TAO_MODULE_PREFIX = '@tao/'

/** isModuleImport returns true for scoped module paths (`@scope/...` in `use ... from`), not relative `./` or `../`. */
export function isModuleImport(modulePath: string): boolean {
  return modulePath.startsWith('@')
}

/** isTaoModuleImport returns true when `modulePath` is the built-in Tao standard library (`@tao/...`). */
export function isTaoModuleImport(modulePath: string): boolean {
  return modulePath.startsWith(TAO_MODULE_PREFIX)
}

/** resolveModuleImportDirectory maps a module import to an on-disk module directory. Today only `@tao/...` is supported,
 * resolved under `opts.stdLibRoot` (local tree); other `@` scopes will use other roots (e.g. remotes) later. */
export function resolveModuleImportDirectory(
  modulePath: string,
  opts: { stdLibRoot?: string },
): string {
  Assert(isModuleImport(modulePath), 'modulePath must be a module import (e.g. @scope/...)', { modulePath })
  if (isTaoModuleImport(modulePath)) {
    Assert(opts.stdLibRoot, 'Standard library root is required for @tao/... imports.', { modulePath })
    return normalizeModulePath(opts.stdLibRoot, modulePath.slice(1))
  }
  throw new Error(`Unsupported module import: ${modulePath}`)
}
