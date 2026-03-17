import { TAO_EXT } from '@shared/TaoPaths'
import { normalizedDirOfPath, resolveModulePathFromFile } from './Paths'
import { isStdLibImport, resolveStdLibModuleDirectory } from './StdLibPaths'

// UriAndPath pairs a document URI string with its filesystem path for module resolution.
export type UriAndPath = { uri: string; path: string }

/** isSameModuleImport returns true when the use statement targets the current module directory. */
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

/** getSameModuleUris returns URIs of other .tao docs in the same directory as documentPath. */
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

/** resolveModulePathToUris returns document URIs for a module path, or empty if std lib has no root. */
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
