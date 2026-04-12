import { readdirSync, statSync } from 'node:fs'
import { nodePath } from './util/libs'

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

/** resolvePath returns the absolute path via nodePath.resolve. */
export function resolvePath(filePath: string): string {
  return nodePath.resolve(filePath)
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

  for (const entry of readDir(dirPath)) {
    const fullPath = nodePath.join(dirPath, entry)

    if (!includeHidden && entry.startsWith('.')) {
      continue
    } else if (isDirectory(fullPath)) {
      if (includeDirectories) {
        yield fullPath
      }
      yield* streamFilesIn(fullPath, opts)
      continue
    } else if (includeOnlyExtensions.length > 0) {
      if (!includeOnlyExtensions.includes(nodePath.extname(entry))) {
        continue
      }
    } else {
      yield fullPath
    }
  }
}
