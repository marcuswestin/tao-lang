import { Command } from '@commander-js/extra-typings'
import { compileTao } from '@compiler'
import { TaoError, throwUserInputRejectionError } from '@shared/TaoErrors'
import chokidar from 'chokidar'
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import * as process from 'node:process'
import { hci } from './hci-human-computer-interaction'

/** taoCliMain runs the Tao CLI via Commander (`process.argv`).
 * Today this registers only `compile`; see that command’s options for file vs `--code`, watch, and paths. */
export function taoCliMain() {
  const program = new Command()

  program.command('compile')
    .description('Compile a Tao file')
    .argument('[path]', 'The file to compile', (value) => path.resolve(value))
    .requiredOption('--runtime-dir <path>', 'The runtime to compile the code to', (value) => path.resolve(value))
    .option('--code <code>', 'Compile the given string of text, rather than a file')
    .option('--watch', 'Watch the file and recompile when it changes')
    .option('--verbose', 'Verbose output', false)
    .option('--std-lib-root <path>', 'The root directory of the standard library', (value) => path.resolve(value))
    .action(async (inputPath, { watch, verbose, code, runtimeDir, stdLibRoot }) => {
      verbose = true
      hci.setVerbose(verbose)
      hci.wrapExecution(async () => {
        /** compileAndWrite runs `TaoSDK_compile` for the action’s path/code/runtime/std-lib and prints the output path.
         * On compiler diagnostics, `TaoSDK_compile` throws before this logs success. */
        async function compileAndWrite() {
          hci.verboselyInform(`Compiling...`)
          const result = await TaoSDK_compile({ path: inputPath, code, runtimeDir, stdLibRoot })
          hci.inform(`Compiled to ${result.outputPath}`)
        }

        if (watch) {
          if (!inputPath) {
            throwUserInputRejectionError('Watch mode requires a file to be provided')
          }
          chokidar.watch(inputPath).on('change', compileAndWrite)
          if (stdLibRoot) {
            chokidar.watch(stdLibRoot).on('change', compileAndWrite)
          }
        }

        await compileAndWrite()
      })
    })

  program.parse(process.argv)
}

type TaoSDK_compileOpts = {
  path?: string | undefined
  code?: string | undefined
  runtimeDir: string
  stdLibRoot?: string
  outputFileName?: string
}
type TaoSDK_compileResult = { outputPath: string; result?: { code: string }; error?: TaoError }

type TaoRuntimeManifest = {
  outputPath: string
}

/** TaoSDK_compile compiles exactly one of `path` or `code` into the runtime package’s configured output file.
 * - Inline `code` is written to a temp `.tao` under `/tmp`, compiled, then deleted.
 * - `runtimeDir` must be a Tao runtime directory (`package.json` with `taoRuntime.outputPath`).
 * - `outputFileName`, if set, is resolved under `runtimeDir` and overrides the manifest output path.
 * - Compile or validation failures become `UserInputRejectionError` with the human-readable report message. */
export async function TaoSDK_compile(opts: TaoSDK_compileOpts): Promise<TaoSDK_compileResult> {
  if (!opts.path && !opts.code) {
    throwUserInputRejectionError('Missing <path>')
  } else if (opts.code && opts.path) {
    throwUserInputRejectionError('Provide EITHER <path> or --code, but not both')
  }

  let path = opts.path
  if (opts.code) {
    const tempDir = `/tmp/tao-cli-temp-${Date.now()}`
    mkdirSync(tempDir, { recursive: true })
    path = `${tempDir}/tao-inline-code-build.tao`
    writeFileSync(path, opts.code)
  } else {
    path = opts.path!
  }

  try {
    const outputPath = await checkUserInputs(opts)
    const result = await compileTao({ file: path, stdLibRoot: opts.stdLibRoot })
    await writeFile(outputPath, result.code)
    if (result.errorReport.hasError()) {
      throwUserInputRejectionError(result.errorReport.getHumanErrorMessage())
    }
    return { outputPath, result }
  } finally {
    if (opts.code) {
      unlinkSync(path)
    }
  }
}

/** checkUserInputs ensures `runtimeDir` exists, contains `package.json` with a valid `taoRuntime` block,
 * optionally checks `stdLibRoot`, and returns where the emitted file should be written. */
async function checkUserInputs(opts: TaoSDK_compileOpts) {
  const runtimeDir = path.resolve(opts.runtimeDir)
  if (!isDirectory(runtimeDir)) {
    throwUserInputRejectionError(`Runtime path is not a directory: ${runtimeDir}`)
  }
  const stdLibRoot = opts.stdLibRoot
  if (stdLibRoot && !isDirectory(stdLibRoot)) {
    throwUserInputRejectionError(`Standard library path is not a directory: ${stdLibRoot}`)
  }
  const packageJsonPath = path.resolve(runtimeDir, 'package.json')
  if (!fileExists(packageJsonPath)) {
    throwUserInputRejectionError(`Runtime path does not contain a package.json file: ${runtimeDir}`)
  }
  const packageJson = readJsonFile(packageJsonPath)
  const runtimeManifest = getTaoRuntimeManifest(packageJson)
  if (!runtimeManifest) {
    throwUserInputRejectionError(`Runtime path is not a tao runtime: ${runtimeDir}`)
  }
  return getRuntimeOutputPath(runtimeDir, runtimeManifest, opts.outputFileName)
}

/** getRuntimeOutputPath joins `runtimeDir` with `taoRuntime.outputPath`, or with `outputFileName` when provided
 * (still anchored under `runtimeDir`). */
function getRuntimeOutputPath(runtimeDir: string, runtimeManifest: TaoRuntimeManifest, outputFileName?: string) {
  const defaultOutputPath = path.resolve(runtimeDir, runtimeManifest.outputPath)
  if (!outputFileName) {
    return defaultOutputPath
  }

  return path.resolve(runtimeDir, outputFileName)
}

/** isDirectory returns true when the path exists and is a directory. */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false // does not exist or inaccessible
  }
}

/** writeFile ensures parent dirs exist then writes UTF-8 content. */
async function writeFile(targetPath: string, content: string) {
  mkdirSync(path.dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, content)
}

/** fileExists returns true when the path is an existing regular file. */
function fileExists(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false // does not exist or inaccessible
  }
}

/** readJsonFile parses JSON from a path. */
function readJsonFile(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** getTaoRuntimeManifest returns `{ outputPath }` when `packageJson.taoRuntime` is an object with a non-empty
 * string `outputPath`; otherwise `undefined` (caller treats that as “not a Tao runtime”). */
function getTaoRuntimeManifest(packageJson: any): TaoRuntimeManifest | undefined {
  const manifest = packageJson.taoRuntime
  if (!manifest || typeof manifest !== 'object') {
    return undefined
  }
  if (typeof manifest.outputPath !== 'string' || manifest.outputPath.length === 0) {
    return undefined
  }

  return {
    outputPath: manifest.outputPath,
  }
}
