import { Assert } from '@shared/TaoErrors'
import { isTaoModuleImport } from './ModulePaths'
import { normalizeModulePath } from './Paths'

/** isStdLibImport returns true when the module path is the built-in Tao standard library (`@tao/...`). */
export function isStdLibImport(modulePath: string): boolean {
  return isTaoModuleImport(modulePath)
}

/** resolveStdLibModuleDirectory returns the filesystem directory for a std-lib module path under stdLibRoot
 * (`@tao/ui` → `<stdLibRoot>/tao/ui`, matching on-disk layout under `tao-std-lib`). */
export function resolveStdLibModuleDirectory(modulePath: string, stdLibRoot: string): string {
  Assert(isStdLibImport(modulePath), 'modulePath is not a std-lib import', { modulePath })
  return normalizeModulePath(stdLibRoot, modulePath.slice('@'.length))
}
