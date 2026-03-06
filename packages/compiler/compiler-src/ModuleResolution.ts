import { TAO_EXT } from './@shared/TaoPaths'
import { normalizedDirOfPath, resolveModulePathFromFile } from './Paths'
import { isStdLibImport, resolveStdLibModuleDirectory } from './StdLibPaths'

// UriAndPath pairs a document URI string with its filesystem path for module resolution.
export type UriAndPath = { uri: string; path: string }

// isSameModuleImport returns true when a use statement targets the same module (directory).
// No modulePath or `from ./`-style path that resolves to the current directory counts as same-module.
export function isSameModuleImport(
  useStatement: { modulePath?: string | null },
  documentPath: string,
): boolean {
  const modulePath = useStatement.modulePath
  if (!modulePath) {
    return true
  }
  if (isStdLibImport(modulePath)) {
    return false
  }
  const currentDir = normalizedDirOfPath(documentPath)
  const targetPath = resolveModulePathFromFile(documentPath, modulePath)
  return targetPath === currentDir
}

// getSameModuleUris returns document URIs for all files in the same directory as the given document, excluding the document itself.
export function getSameModuleUris(
  documentPath: string,
  documentUri: string,
  allUrisAndPaths: Iterable<UriAndPath>,
): string[] {
  const currentDir = normalizedDirOfPath(documentPath)
  const uris: string[] = []
  for (const { uri, path } of allUrisAndPaths) {
    const docDir = normalizedDirOfPath(path)
    if (docDir === currentDir && uri !== documentUri) {
      uris.push(uri)
    }
  }
  return [...new Set(uris)]
}

// resolveModulePathToUris resolves a module path (relative or std-lib) to the list of document URIs in that module.
// Returns empty array if modulePath is std-lib and stdLibRoot is undefined.
export function resolveModulePathToUris(
  modulePath: string,
  documentPath: string,
  stdLibRoot: string | undefined,
  allUrisAndPaths: Iterable<UriAndPath>,
): string[] {
  if (!modulePath) {
    return []
  }
  if (isStdLibImport(modulePath) && !stdLibRoot) {
    return []
  }
  try {
    const targetPath = isStdLibImport(modulePath)
      ? resolveStdLibModuleDirectory(modulePath, stdLibRoot!)
      : resolveModulePathFromFile(documentPath, modulePath)
    const targetFileWithExt = targetPath + TAO_EXT
    const uris: string[] = []
    for (const { uri, path } of allUrisAndPaths) {
      const docDir = normalizedDirOfPath(path)
      if (path === targetFileWithExt || docDir === targetPath) {
        uris.push(uri)
      }
    }
    return [...new Set(uris)]
  } catch {
    return []
  }
}
