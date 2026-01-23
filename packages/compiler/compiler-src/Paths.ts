import { statSync } from 'node:fs'
import * as path from 'node:path'

// normalizeModulePath joins and normalizes path parts, removing trailing slashes.
// Used for consistent path comparison in module resolution.
export function normalizeModulePath(...parts: string[]): string {
  return path.normalize(path.join(...parts)).replace(/\/+$/, '')
}

// fileExists checks if a file exists at the given path.
export function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false // does not exist or inaccessible
  }
}
