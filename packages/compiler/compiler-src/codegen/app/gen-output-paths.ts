import { AST } from '@parser/parser'
import { FS } from '@shared'

/** longestCommonDirectoryPrefix returns the longest directory prefix shared by all absolute file paths. */
export function longestCommonDirectoryPrefix(absolutePaths: string[]): string {
  if (absolutePaths.length === 0) {
    return ''
  }
  const sorted = absolutePaths.map(FS.normalizePath).sort()
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  let i = 0
  const n = Math.min(first.length, last.length)
  while (i < n && first[i] === last[i]) {
    i++
  }
  const prefix = first.slice(0, i)
  if (!prefix) {
    return ''
  }
  return FS.dirname(prefix)
}

/** emitPathUnderTaoApp returns the path relative to the `tao-app/` directory for a Tao source file.
 * Avoid Tao basenames that match generated support module paths ignoring case (e.g. `InstantDB.tao` vs `instantdb/instantdb.ts`); on case-insensitive hosts both import paths can resolve to the same module. */
export function emitPathUnderTaoApp(
  sourceAbsolutePath: string,
  projectRoot: string,
  stdLibRoot: string | undefined,
): string {
  const normSource = FS.normalizePath(sourceAbsolutePath)
  if (stdLibRoot && normSource.startsWith(FS.normalizePath(stdLibRoot + FS.sep))) {
    const rel = FS.relativePathWithPosixSlashes(stdLibRoot, normSource)
    const parts = rel.split('/').filter(Boolean)
    if (parts.length === 0) {
      throw new Error(`Invalid stdlib-relative path for ${sourceAbsolutePath}`)
    }
    parts[0] = `@${parts[0]}`
    const withExt = parts.join('/').replace(/\.tao$/i, '.tsx')
    return FS.posixPath('use', ...withExt.split('/').filter(Boolean))
  }
  const rel = FS.relativePathWithPosixSlashes(projectRoot, normSource)
  const withExt = rel.replace(/\.tao$/i, '.tsx')
  return FS.posixPath('app', withExt)
}

/** computeProjectRoot returns the directory used to mirror user app sources under `tao-app/app/`. */
export function computeProjectRoot(entryAbsolutePath: string, appSourceAbsolutePaths: string[]): string {
  const unique = [...new Set(appSourceAbsolutePaths.map(p => FS.normalizePath(p)))]
  if (unique.length === 0) {
    return FS.dirname(entryAbsolutePath)
  }
  const prefix = longestCommonDirectoryPrefix(unique)
  return prefix.length > 0 ? prefix : FS.dirname(entryAbsolutePath)
}

/** buildUriToEmitPath maps each Tao document URI string to a path relative to `tao-app/` (posix slashes). */
export function buildUriToEmitPath(
  allTaoFiles: AST.TaoFile[],
  entryAbsolutePath: string,
  stdLibRoot: string | undefined,
): { uriToEmitPath: Map<string, string>; projectRoot: string } {
  const fileEntries: { uri: string; fsPath: string }[] = []
  for (const t of allTaoFiles) {
    const doc = t.$document
    if (!doc || doc.uri.scheme !== 'file') {
      continue
    }
    fileEntries.push({ uri: doc.uri.toString(), fsPath: doc.uri.fsPath })
  }
  const stdRoot = stdLibRoot ? FS.normalizePath(stdLibRoot + FS.sep) : undefined
  const appPaths = fileEntries.map(e => e.fsPath).filter(p => !stdRoot || !p.startsWith(stdRoot))
  const projectRoot = computeProjectRoot(FS.normalizePath(entryAbsolutePath), appPaths)
  const uriToEmitPath = new Map<string, string>()
  for (const { uri, fsPath } of fileEntries) {
    const emitPath = emitPathUnderTaoApp(fsPath, projectRoot, stdLibRoot)
    uriToEmitPath.set(uri, emitPath.replace(/\\/g, '/'))
  }
  return { uriToEmitPath, projectRoot }
}

/** emitRelativeImport returns a relative ES import path from `fromEmitPath` to `toEmitPath` (tao-app-relative, posix). */
export function emitRelativeImport(fromEmitPath: string, toEmitPath: string): string {
  const fromDir = FS.posixDirname(fromEmitPath)
  let rel = FS.posixRelative(fromDir, toEmitPath)
  if (!rel.startsWith('.')) {
    rel = `./${rel}`
  }
  return rel.replace(/\.tsx$/i, '')
}
