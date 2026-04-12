import { statSync } from 'node:fs'

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
