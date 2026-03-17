import { readdirSync, statSync } from 'node:fs'
import * as path from 'node:path'

/** normalizeModulePath joins and normalizes path parts and strips trailing slashes. */
export function normalizeModulePath(...parts: string[]): string {
  return path.normalize(path.join(...parts)).replace(/\/+$/, '')
}

/** normalizedDirOfPath returns the normalized parent directory of a file path. */
export function normalizedDirOfPath(filePath: string): string {
  return normalizeModulePath(path.dirname(filePath))
}

/** resolveModulePathFromFile resolves modulePath relative to the filePath directory. */
export function resolveModulePathFromFile(filePath: string, modulePath: string): string {
  return normalizeModulePath(normalizedDirOfPath(filePath), modulePath)
}

/** fileExists returns true when the path exists and is a regular file. */
export function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false // does not exist or inaccessible
  }
}

/** isDirectory returns true when the path exists and is a directory. */
export function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory()
  } catch {
    return false
  }
}

/** readDir returns directory entry names or an empty array on error. */
export function readDir(filePath: string): string[] {
  try {
    return readdirSync(filePath)
  } catch {
    return []
  }
}

/** resolvePath returns the absolute path via path.resolve. */
export function resolvePath(filePath: string): string {
  return path.resolve(filePath)
}

type StreamFilesOptions = {
  includeDirectories?: boolean
  includeHidden?: boolean
  includeOnlyExtensions?: readonly string[]
}

/** streamFilesIn recursively yields file paths under dirPath with optional filters.
 * @yields absolute file paths (and optionally directories). */
export async function* streamFilesIn(dirPath: string, opts: StreamFilesOptions = {}): AsyncGenerator<string> {
  const { includeDirectories = false, includeHidden = false, includeOnlyExtensions = [] } = opts

  for await (const entry of readDir(dirPath)) {
    const fullPath = path.join(dirPath, entry)

    if (!includeHidden && entry.startsWith('.')) {
      continue
    } else if (isDirectory(fullPath)) {
      if (includeDirectories) {
        yield fullPath
      }
      yield* streamFilesIn(fullPath, opts)
      continue
    } else if (includeOnlyExtensions.length > 0) {
      if (!includeOnlyExtensions.includes(path.extname(entry))) {
        continue
      }
    } else {
      yield fullPath
    }
  }
}
