import * as nodeFs from 'node:fs'
import * as nodeOs from 'node:os'
import * as nodePath from 'node:path'
import * as nodeUrl from 'node:url'
import { Assert } from './TaoErrors'

/** sep returns the OS path separator. */
export const sep = nodePath.sep

/** resolvePath returns the absolute path via nodePath.resolve. */
export const resolvePath = (...paths: string[]) => nodePath.resolve(...paths)

/** isFile returns true when the path exists and is a regular file. */
export const isFile = (filePath: string) => tryWithDefault(false, () => nodeFs.statSync(filePath).isFile())

/** isDirectory returns true when the path exists and is a directory. */
export const isDirectory = (filePath: string) => tryWithDefault(false, () => nodeFs.statSync(filePath).isDirectory())

/** readDir returns directory entry names or an empty array on error. */
export const readDir = (filePath: string) => tryWithDefault([], () => nodeFs.readdirSync(filePath))

/** readDirWithFileTypes returns directory entry names and file types or an empty array on error. */
export const readDirWithFileTypes: (filePath: string) => nodeFs.Dirent[] = (filePath: string) =>
  tryWithDefault([], () => nodeFs.readdirSync(filePath, { withFileTypes: true }))

/** basename returns the last portion of a path (file or directory name). */
export const basename = (path: string, ext?: string) => nodePath.basename(path, ext)

/** extname returns the extension of the path (from the last `.` in the last segment). */
export const extname = (path: string) => nodePath.extname(path)

/** existsSync returns true when `path` exists on the filesystem. */
export const existsSync = (path: string) => nodeFs.existsSync(path)

/** dirname returns the directory name of a path. */
export const dirname = (path: string) => nodePath.dirname(path)

/** rm removes the path (file or directory) when it exists; no-op when the path is already gone (`force: true`). */
export const rm = (path: string, opts: { recursive?: boolean; force?: boolean } = { recursive: true, force: true }) =>
  nodeFs.rmSync(path, { force: true, ...opts })

/** rmDirectory removes a directory at `path` when it exists; no-op when the path is already gone. */
export const rmDirectory = (
  path: string,
  opts: { recursive?: boolean; force?: boolean } = { recursive: true, force: true },
) => rm(path, opts)

/** normalizePath normalizes a path. */
export const normalizePath = (path: string) => nodePath.normalize(path)

/** joinPath joins path segments with the OS path separator. */
export const joinPath = (...paths: string[]) => nodePath.join(...paths)

/** relativePath returns the relative path from `from` to `to`. */
export const relativePath = (from: string, to: string): string => nodePath.relative(from, to)

/** relativePathWithPosixSlashes returns relativePath with `/` separators (stable across hosts). */
export const relativePathWithPosixSlashes = (from: string, to: string): string =>
  relativePath(from, to).replace(/\\/g, '/')

/** posixPath joins path segments with `/` for logical emit/import paths (not OS filesystem paths). */
export const posixPath = (...paths: string[]): string => nodePath.posix.join(...paths)

/** posixDirname returns the directory portion of a `/`-separated logical path. */
export const posixDirname = (p: string) => nodePath.posix.dirname(p)

/** posixRelative returns the relative path between two `/`-separated logical paths. */
export const posixRelative = (from: string, to: string) => nodePath.posix.relative(from, to)

/** writeFile ensures parent dirs exist, then writes UTF-8 content. */
export const writeFile = (targetPath: string, content: string, makeParentDirs = true) => {
  if (makeParentDirs) {
    mkdir(dirname(targetPath))
  }
  nodeFs.writeFileSync(targetPath, content)
}

/** appendFileSync appends UTF-8 `data` to `path`, creating the file if needed. */
export const appendFileSync = (path: string, data: string) => {
  nodeFs.appendFileSync(path, data, 'utf8')
}

/** pathToFileURL converts a path to a file URL. */
export const pathToFileURL = (path: string) => nodeUrl.pathToFileURL(path)

/** mkdir ensures the directory exists. */
export const mkdir = (path: string) => {
  nodeFs.mkdirSync(path, { recursive: true })
}

export const mkTmpDir = (dir: string): string => nodeFs.mkdtempSync(dir)

/** tmpdir returns the OS default directory for temporary files. */
export const tmpdir = () => nodeOs.tmpdir()

/** readJsonFile parses JSON from a path. */
export const readJsonFile = (path: string): unknown => JSON.parse(readTextFile(path))

/** readTextFile reads a text file from a path. */
export const readTextFile = (path: string): string => nodeFs.readFileSync(path, 'utf8')

/** copy sync copies from `src` to `dest` */
export const copyFile = (src: string, dest: string) => {
  Assert(isFile(src), `Source path does not exist: ${src}`)
  nodeFs.cpSync(src, dest)
}

/** splitPath splits a relative path into an array of components. */
export const splitPath = (path: string): string[] => path.split(nodePath.sep)

/** copy copies from `src` to `dest` */
export const copyDirectory = (src: string, dest: string) => {
  Assert(isDirectory(src), `Source path is not a directory: ${src}`)
  nodeFs.cpSync(src, dest, { recursive: true })
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
      for await (const file of streamFilesIn(fullPath, opts)) {
        yield file
      }
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

// Make this infer type by the return value of the function
function tryWithDefault<Fn extends (...args: unknown[]) => unknown, TResult extends ReturnType<Fn>>(
  defaultValue: TResult,
  fn: () => TResult,
): TResult {
  try {
    return fn()
  } catch {
    return defaultValue
  }
}
