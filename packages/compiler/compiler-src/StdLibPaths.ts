import { normalizeModulePath } from './Paths'

const STD_LIB_PREFIX = 'tao/'

/** isStdLibImport returns true when the module path starts with the tao/ std-lib prefix. */
export function isStdLibImport(modulePath: string): boolean {
  return modulePath.startsWith(STD_LIB_PREFIX)
}

/** resolveStdLibModuleDirectory returns the filesystem directory for a tao/... module under stdLibRoot. */
export function resolveStdLibModuleDirectory(modulePath: string, stdLibRoot: string): string {
  return normalizeModulePath(stdLibRoot, modulePath)
}
