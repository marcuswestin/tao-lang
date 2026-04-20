import { Command } from '@commander-js/extra-typings'
import {
  appendSourceMappingUrlPragma,
  type CompileOutputFile,
  compileTao,
  traceToEncodedSourceMapJson,
} from '@compiler'
import { FS, TaoError } from '@shared'
import { Log } from '@shared/Log'
import { throwUserInputRejectionError } from '@shared/TaoErrors'
import chokidar from 'chokidar'
import { hci } from './hci-human-computer-interaction'

const ENABLE_SOURCE_MAPS = false

/** taoCliMain runs the Tao CLI via Commander (`process.argv`).
 * Today this registers only `compile`; see that command’s options for watch and paths. */
export function taoCliMain() {
  const program = new Command()

  program.command('compile')
    .description('Compile a Tao file')
    .argument('<path>', 'The file to compile', (value) => FS.resolvePath(value))
    .requiredOption('--runtime-dir <path>', 'The runtime to compile the code to', (value) => FS.resolvePath(value))
    .option('--watch', 'Watch the file and recompile when it changes')
    .option('--verbose', 'Verbose output', false)
    .option('--std-lib-root <path>', 'The root directory of the standard library', (value) => FS.resolvePath(value))
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
              Log.taoError(TaoError.getTaoError(error, { context: 'tao-cli compile --watch' }))
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
 * - After emitting TS, copies `compileTao`’s `copyDirs` into `dirname(outputPath)` (tao-app root), not directly under `runtimeDir`.
 * - Compile or validation failures become `UserInputRejectionError` with the human-readable report message. */
export async function TaoSDK_compile(opts: TaoSDK_compileOpts): Promise<TaoSDK_compileResult> {
  const outputPath = await checkUserInputs(opts)
  const outputDir = FS.dirname(outputPath)
  if (FS.isDirectory(outputDir)) {
    if (!FS.isFile(outputPath)) {
      throwUserInputRejectionError(`Output path already exists: ${outputDir}`)
    }
    FS.rmDirectory(outputDir)
  }

  const result = await compileTao({ file: opts.path, stdLibRoot: opts.stdLibRoot })
  if (!result.ok) {
    FS.writeFile(outputPath, result.code)
    throwUserInputRejectionError(result.errorReport.getHumanErrorMessage())
  }
  const emitFiles = planTaoSdkEmitFiles(result.files, result.entryRelativePath, outputPath)
  for (const f of emitFiles) {
    const path = getPath(outputPath, f.relativePath)
    if (ENABLE_SOURCE_MAPS && f.trace) {
      const mapBasename = `${FS.basename(path)}.map`
      FS.writeFile(path + '.map', traceToEncodedSourceMapJson({ outputAbsolutePath: path, trace: f.trace }))
      FS.writeFile(path, appendSourceMappingUrlPragma(f.content, mapBasename))
    } else {
      FS.writeFile(path, f.content)
    }
  }
  const emitRoot = FS.dirname(outputPath)
  for (const f of result.copyDirs) {
    const from = FS.resolvePath(emitRoot, f.fromRelativePath)
    const to = getPath(outputPath, f.toRelativePath)
    FS.rmDirectory(to)
    FS.copyDirectory(from, to)
  }
  return { outputPath, files: emitFiles }
}

function getPath(outputPath: string, relativePath: string) {
  return FS.resolvePath(FS.dirname(outputPath), relativePath)
}

/** planTaoSdkEmitFiles maps each `CompileOutputFile` to an absolute `dest`: the manifest bootstrap path for
 * `entryRelativePath`, otherwise paths under `dirname(outputPath)` mirroring `relativePath`. */
function planTaoSdkEmitFiles(
  files: CompileOutputFile[],
  entryRelativePath: string,
  outputPath: string,
): CompileOutputFile[] {
  const emitRoot = FS.dirname(outputPath)
  return files.map(f => ({
    ...f,
    dest: f.relativePath === entryRelativePath ? outputPath : FS.resolvePath(emitRoot, f.relativePath),
  }))
}

/** checkUserInputs ensures `runtimeDir` exists, contains `package.json` with a valid `taoRuntime` block,
 * optionally checks `stdLibRoot`, and returns where the emitted bootstrap file should be written. */
async function checkUserInputs(opts: TaoSDK_compileOpts) {
  const runtimeDir = FS.resolvePath(opts.runtimeDir)
  if (!FS.isDirectory(runtimeDir)) {
    throwUserInputRejectionError(`Runtime path is not a directory: ${runtimeDir}`)
  }
  const stdLibRoot = opts.stdLibRoot
  if (stdLibRoot && !FS.isDirectory(stdLibRoot)) {
    throwUserInputRejectionError(`Standard library path is not a directory: ${stdLibRoot}`)
  }
  const packageJsonPath = FS.resolvePath(runtimeDir, 'package.json')
  if (!FS.isFile(packageJsonPath)) {
    throwUserInputRejectionError(`Runtime path does not contain a package.json file: ${runtimeDir}`)
  }
  const packageJson = FS.readJsonFile(packageJsonPath)
  const runtimeManifest = getTaoRuntimeManifest(packageJson)
  if (!runtimeManifest) {
    throwUserInputRejectionError(`Runtime path is not a tao runtime: ${runtimeDir}`)
  }
  return getRuntimeOutputPath(runtimeDir, runtimeManifest, opts.outputFileName)
}

/** getRuntimeOutputPath joins `runtimeDir` with `taoRuntime.outputPath`, or with `outputFileName` when provided
 * (still anchored under `runtimeDir`). */
function getRuntimeOutputPath(runtimeDir: string, runtimeManifest: TaoRuntimeManifest, outputFileName?: string) {
  const defaultOutputPath = FS.resolvePath(runtimeDir, runtimeManifest.outputPath)
  if (!outputFileName) {
    return defaultOutputPath
  }

  return FS.resolvePath(runtimeDir, outputFileName)
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
