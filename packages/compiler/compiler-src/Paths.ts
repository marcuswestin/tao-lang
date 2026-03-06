import { readdirSync, statSync } from 'node:fs'
import * as path from 'node:path'

// normalizeModulePath joins and normalizes path parts, removing trailing slashes.
// Used for consistent path comparison in module resolution.
export function normalizeModulePath(...parts: string[]): string {
  return path.normalize(path.join(...parts)).replace(/\/+$/, '')
}

// normalizedDirOfPath returns the normalized directory path of the given file path.
export function normalizedDirOfPath(filePath: string): string {
  return normalizeModulePath(path.dirname(filePath))
}

// resolveModulePathFromFile resolves a relative module path from the directory of the given file path.
export function resolveModulePathFromFile(filePath: string, modulePath: string): string {
  return normalizeModulePath(normalizedDirOfPath(filePath), modulePath)
}

// fileExists checks if a file exists at the given path.
export function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false // does not exist or inaccessible
  }
}

// isDirectory returns true if the path exists and is a directory.
export function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory()
  } catch {
    return false
  }
}

export function readDir(filePath: string): string[] {
  try {
    return readdirSync(filePath)
  } catch {
    return []
  }
}

export function resolvePath(filePath: string): string {
  return path.resolve(filePath)
}

type StreamFilesOptions = {
  includeDirectories?: boolean
  includeHidden?: boolean
  includeOnlyExtension?: string | null
}

export async function* streamFilesIn(dirPath: string, opts: StreamFilesOptions = {}): AsyncGenerator<string> {
  const { includeDirectories = false, includeHidden = false, includeOnlyExtension = null } = opts

  for await (const entry of readDir(dirPath)) {
    const fullPath = path.join(dirPath, entry)

    if (!includeHidden && entry.startsWith('.')) {
      continue
    }
    if (isDirectory(fullPath)) {
      if (includeDirectories) {
        yield fullPath
      }
      yield* streamFilesIn(fullPath, opts)
      continue
    } else {
      if (includeOnlyExtension && !entry.endsWith(includeOnlyExtension)) {
        continue
      }
      yield fullPath
    }
  }
}
