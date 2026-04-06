import { Command } from '@commander-js/extra-typings'
import { type CompileOutputFile, compileTao } from '@compiler'
import { Log } from '@shared/Log'
import { getTaoError, throwUserInputRejectionError } from '@shared/TaoErrors'
import chokidar from 'chokidar'
import * as nodeFs from 'node:fs'
import path from 'node:path'
import * as process from 'node:process'
import { hci } from './hci-human-computer-interaction'

/** taoCliMain runs the Tao CLI via Commander (`process.argv`).
 * Today this registers only `compile`; see that command’s options for watch and paths. */
export function taoCliMain() {
  const program = new Command()

  program.command('compile')
    .description('Compile a Tao file')
    .argument('<path>', 'The file to compile', (value) => path.resolve(value))
    .requiredOption('--runtime-dir <path>', 'The runtime to compile the code to', (value) => path.resolve(value))
    .option('--watch', 'Watch the file and recompile when it changes')
    .option('--verbose', 'Verbose output', false)
    .option('--std-lib-root <path>', 'The root directory of the standard library', (value) => path.resolve(value))
    .action(async (path, { watch, verbose, runtimeDir, stdLibRoot }) => {
      hci.setVerbose(verbose)
      await hci.wrapExecution(async () => {
        /** compileAndWrite runs `TaoSDK_compile` for the path/runtime/std-lib and prints the output path.
         * In watch mode, parse/compiler errors are logged and the process keeps running so `just dev` is not torn down. */
        async function compileAndWrite() {
          hci.verboselyInform(`Compiling...`)
          const result = await TaoSDK_compile({ path, runtimeDir, stdLibRoot })
          hci.inform(`Compiled to ${result.outputPath}`)
        }

        async function checkCompileAndWrite() {
          try {
            await compileAndWrite()
          } catch (error) {
            if (watch) {
              Log.taoError(getTaoError(error, { context: 'tao-cli compile --watch' }))
            } else {
              throw error
            }
          }
        }

        if (watch) {
          chokidar.watch(path).on('change', checkCompileAndWrite)
          if (stdLibRoot) {
            chokidar.watch(stdLibRoot).on('change', checkCompileAndWrite)
          }
        }

        await checkCompileAndWrite()
      })
    })

  program.parse(process.argv)
}

type TaoSDK_compileOpts = {
  path: string
  runtimeDir: string
  stdLibRoot?: string
  outputFileName?: string
}

type TaoRuntimeManifest = {
  outputPath: string
}

type TaoSDK_compileResult = {
  outputPath: string
  files: CompileOutputFile[]
}

/** TaoSDK_compile compiles `path` into the runtime package’s configured output file(s).
 * - `runtimeDir` must be a Tao runtime directory (`package.json` with `taoRuntime.outputPath`).
 * - `outputFileName`, if set, is resolved under `runtimeDir` and overrides the manifest output path.
 * - Compile or validation failures become `UserInputRejectionError` with the human-readable report message. */
export async function TaoSDK_compile(opts: TaoSDK_compileOpts): Promise<TaoSDK_compileResult> {
  const outputPath = await checkUserInputs(opts)
  const result = await compileTao({ file: opts.path, stdLibRoot: opts.stdLibRoot })
  if (!result.ok) {
    await writeFile(outputPath, result.code)
    throwUserInputRejectionError(result.errorReport.getHumanErrorMessage())
  }
  const emitFiles = planTaoSdkEmitFiles(result.files, result.entryRelativePath, outputPath)
  for (const f of emitFiles) {
    await writeFile(f.dest, f.content)
  }
  return { outputPath, files: emitFiles }
}

/** planTaoSdkEmitFiles maps each `CompileOutputFile` to an absolute `dest`: the manifest bootstrap path for
 * `entryRelativePath`, otherwise paths under `dirname(outputPath)` mirroring `relativePath`. */
function planTaoSdkEmitFiles(
  files: CompileOutputFile[],
  entryRelativePath: string,
  outputPath: string,
) {
  const emitRoot = path.dirname(outputPath)
  return files.map(f => ({
    ...f,
    dest: f.relativePath === entryRelativePath ? outputPath : path.join(emitRoot, f.relativePath),
  }))
}

/** checkUserInputs ensures `runtimeDir` exists, contains `package.json` with a valid `taoRuntime` block,
 * optionally checks `stdLibRoot`, and returns where the emitted bootstrap file should be written. */
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
  if (runtimeManifest === undefined) {
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
    return nodeFs.statSync(path).isDirectory()
  } catch {
    return false // does not exist or inaccessible
  }
}

/** writeFile ensures parent dirs exist then writes UTF-8 content. */
async function writeFile(targetPath: string, content: string) {
  nodeFs.mkdirSync(path.dirname(targetPath), { recursive: true })
  nodeFs.writeFileSync(targetPath, content)
}

/** fileExists returns true when the path is an existing regular file. */
function fileExists(path: string): boolean {
  try {
    return nodeFs.statSync(path).isFile()
  } catch {
    return false // does not exist or inaccessible
  }
}

/** readJsonFile parses JSON from a path. */
function readJsonFile(path: string): any {
  return JSON.parse(nodeFs.readFileSync(path, 'utf8'))
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
