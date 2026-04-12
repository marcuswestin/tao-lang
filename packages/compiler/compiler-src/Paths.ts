import { isDirectory } from '@shared/FsPathChecks'
import { readdirSync } from 'node:fs'
import { nodePath } from './util/libs'

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
