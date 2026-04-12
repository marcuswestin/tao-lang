import { nodePath } from '@compiler/util/libs'
import { AST } from '@parser'

/** longestCommonDirectoryPrefix returns the longest directory prefix shared by all absolute file paths. */
export function longestCommonDirectoryPrefix(absolutePaths: string[]): string {
  if (absolutePaths.length === 0) {
    return ''
  }
  const normalized = absolutePaths.map(p => nodePath.normalize(p))
  const sorted = [...normalized].sort()
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  let i = 0
  const minLen = Math.min(first.length, last.length)
  while (i < minLen && first[i] === last[i]) {
    i++
  }
  const prefix = first.slice(0, i)
  const lastSep = prefix.lastIndexOf(nodePath.sep)
  if (lastSep <= 0) {
    return prefix.length > 0 && prefix[0] === nodePath.sep ? nodePath.sep : ''
  }
  return prefix.slice(0, lastSep)
}

/** emitPathUnderTaoApp returns the path relative to the `tao-app/` directory for a Tao source file. */
export function emitPathUnderTaoApp(
  sourceAbsolutePath: string,
  projectRoot: string,
  stdLibRoot: string | undefined,
): string {
  const normSource = nodePath.normalize(sourceAbsolutePath)
  if (stdLibRoot && normSource.startsWith(nodePath.normalize(stdLibRoot + nodePath.sep))) {
    const rel = nodePath.relative(stdLibRoot, normSource).replace(/\\/g, '/')
    const parts = rel.split('/').filter(Boolean)
    if (parts.length === 0) {
      throw new Error(`Invalid stdlib-relative path for ${sourceAbsolutePath}`)
    }
    parts[0] = `@${parts[0]}`
    const withExt = parts.join('/').replace(/\.tao$/i, '.tsx')
    return nodePath.posix.join('use', ...withExt.split('/'))
  }
  const rel = nodePath.relative(projectRoot, normSource).replace(/\\/g, '/')
  const withExt = rel.replace(/\.tao$/i, '.tsx')
  return nodePath.posix.join('app', withExt)
}

/** computeProjectRoot returns the directory used to mirror user app sources under `tao-app/app/`. */
export function computeProjectRoot(entryAbsolutePath: string, appSourceAbsolutePaths: string[]): string {
  const unique = [...new Set(appSourceAbsolutePaths.map(p => nodePath.normalize(p)))]
  if (unique.length === 0) {
    return nodePath.dirname(entryAbsolutePath)
  }
  const prefix = longestCommonDirectoryPrefix(unique)
  return prefix.length > 0 ? prefix : nodePath.dirname(entryAbsolutePath)
}

/** buildUriToEmitPath maps each Tao document URI string to a path relative to `tao-app/` (posix slashes). */
export function buildUriToEmitPath(
  allTaoFiles: AST.TaoFile[],
  entryAbsolutePath: string,
  stdLibRoot: string | undefined,
): { uriToEmitPath: Map<string, string>; projectRoot: string } {
  const paths: string[] = []
  for (const t of allTaoFiles) {
    const doc = t.$document
    if (!doc || doc.uri.scheme !== 'file') {
      continue
    }
    paths.push(doc.uri.fsPath)
  }
  const appPaths = paths.filter(p => !stdLibRoot || !p.startsWith(nodePath.normalize(stdLibRoot + nodePath.sep)))
  const projectRoot = computeProjectRoot(nodePath.normalize(entryAbsolutePath), appPaths)
  const uriToEmitPath = new Map<string, string>()
  for (const t of allTaoFiles) {
    const doc = t.$document
    if (!doc) {
      continue
    }
    const fsPath = doc.uri.scheme === 'file' ? doc.uri.fsPath : undefined
    if (!fsPath) {
      continue
    }
    const emitPath = emitPathUnderTaoApp(fsPath, projectRoot, stdLibRoot)
    uriToEmitPath.set(doc.uri.toString(), emitPath.replace(/\\/g, '/'))
  }
  return { uriToEmitPath, projectRoot }
}

/** emitRelativeImport returns a relative ES import path from `fromEmitPath` to `toEmitPath` (tao-app-relative, posix). */
export function emitRelativeImport(fromEmitPath: string, toEmitPath: string): string {
  const fromDir = nodePath.posix.dirname(fromEmitPath)
  let rel = nodePath.posix.relative(fromDir, toEmitPath)
  if (!rel.startsWith('.')) {
    rel = `./${rel}`
  }
  return rel.replace(/\.tsx$/i, '')
}
