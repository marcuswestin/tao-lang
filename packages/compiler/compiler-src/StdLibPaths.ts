import { normalizeModulePath } from './Paths'

const STD_LIB_PREFIX = 'tao/'

// isStdLibImport returns true when a module path refers to the standard library (e.g. "tao/ui").
export function isStdLibImport(modulePath: string): boolean {
  return modulePath.startsWith(STD_LIB_PREFIX)
}

// resolveStdLibModuleDirectory maps a std-lib module path to a filesystem directory.
// e.g. "tao/ui" with stdLibRoot "/repo/packages/tao-std-lib" → "/repo/packages/tao-std-lib/tao/ui"
export function resolveStdLibModuleDirectory(modulePath: string, stdLibRoot: string): string {
  return normalizeModulePath(stdLibRoot, modulePath)
}
