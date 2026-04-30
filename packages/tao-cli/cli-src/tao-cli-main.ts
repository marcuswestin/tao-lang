import { Command } from '@commander-js/extra-typings'
import {
  appendSourceMappingUrlPragma,
  type CompileOutputFile,
  compileTao,
  resolveTaoRuntimeBootstrapAbsolutePath,
  traceToEncodedSourceMapJson,
} from '@compiler'
import { FS, TaoError } from '@shared'
import { Log } from '@shared/Log'
import { throwUserInputRejectionError } from '@shared/TaoErrors'
import chokidar from 'chokidar'
import { hci } from './hci-human-computer-interaction'
import { formatFile } from './tao-sdk/sdk-format'

const ENABLE_SOURCE_MAPS = false

/** Fixed staging emit root: wiped before each compile, then moved to `dirname(targetOutputPath)`. */
const TAO_SDK_STAGING_EMIT_ROOT = '/tmp/tao/builds/_gen'

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
          // TODO: Have compiler return the resolved module graph (entry + used paths) so watch targets stay minimal
          // and pick up cross-directory `use` without watching the whole parent directory.
          const fileDir = FS.dirname(path)
          chokidar.watch(fileDir).on('change', checkCompileAndWrite)
          if (stdLibRoot) {
            chokidar.watch(stdLibRoot).on('change', checkCompileAndWrite)
          }
        }

        await checkCompileAndWrite()
      })
    })

  program.command('fmt')
    .alias('format')
    .description('Format Tao files under <path>')
    .argument('<path>', 'The file to format', (value) => FS.resolvePath(value))
    .option('--verbose', 'Verbose output', false)
    .action(async (path, { verbose }) => {
      hci.setVerbose(verbose)
      await hci.wrapExecution(async () => {
        hci.verboselyInform(`Formatting ${path} ...`)
        for await (const file of FS.walk(path, { includeOnlyExtensions: ['.tao'] })) {
          const result = await formatFile(file)
          if (result.didUpdate) {
            hci.inform(`Formatted: ${file}`)
          } else {
            hci.verboselyInform(`Already formatted: ${file}`)
          }
        }
      })
    })

  program.parse(process.argv)
}

type TaoSDK_compileOpts = {
  path: string
  runtimeDir: string
  stdLibRoot?: string
  /** When set (e.g. scenario harnesses), emit bootstrap under this path relative to `runtimeDir` instead of `_gen/tao-app/app-bootstrap.tsx`. */
  outputFileName?: string
}

type TaoSDK_compileResult = {
  outputPath: string
  files: CompileOutputFile[]
}

type PlannedEmitFile = CompileOutputFile & { dest: string }

type TaoSDK_compilePaths = {
  /** Final bootstrap path after the staging directory is moved into place. */
  targetOutputPath: string
  /** Wiped before compile; emit layout mirrors `dirname(targetOutputPath)`. */
  stagedEmitRoot: string
}

/** TaoSDK_compile compiles `path` into the runtime package at {@link resolveTaoRuntimeBootstrapAbsolutePath} by default, or `runtimeDir`/`outputFileName` when tests pass an override.
 * - `runtimeDir` must exist as a directory.
 * - Emits into `/tmp/tao/builds/_gen` (wiped first), copies `compileTao`’s `copyDirs` under that same staging root, then replaces `dirname(targetOutputPath)` by moving the staging directory there.
 * - Compile or validation failures become `UserInputRejectionError` with the human-readable report message. */
export async function TaoSDK_compile(opts: TaoSDK_compileOpts): Promise<TaoSDK_compileResult> {
  const { targetOutputPath, stagedEmitRoot } = resolveCompilePaths(opts)
  FS.rmDirectory(stagedEmitRoot)
  const targetEmitRoot = FS.dirname(targetOutputPath)
  const stagedOutputPath = FS.resolvePath(stagedEmitRoot, FS.relativePath(targetEmitRoot, targetOutputPath))

  const result = await compileTao({ file: opts.path, stdLibRoot: opts.stdLibRoot })
  if (!result.ok) {
    FS.writeFile(stagedOutputPath, result.code)
    replaceTargetEmitRoot(stagedEmitRoot, targetEmitRoot)
    throwUserInputRejectionError(result.errorReport.getHumanErrorMessage())
  }
  const emitFiles = planTaoSdkEmitFiles(result.files, result.entryRelativePath, stagedOutputPath)
  for (const f of emitFiles) {
    writePlannedEmitFile(f)
  }
  for (const { fromRelativePath, toRelativePath } of result.copyDirs) {
    FS.copyDirectory(
      FS.resolvePath(stagedEmitRoot, fromRelativePath),
      FS.resolvePath(stagedEmitRoot, toRelativePath),
    )
  }

  replaceTargetEmitRoot(stagedEmitRoot, targetEmitRoot)
  return { outputPath: targetOutputPath, files: emitFiles }
}

/** replaceTargetEmitRoot swaps the staged generated tree into the runtime output location. */
function replaceTargetEmitRoot(stagedEmitRoot: string, targetEmitRoot: string): void {
  FS.rmDirectory(targetEmitRoot)
  FS.move(stagedEmitRoot, targetEmitRoot)
}

/** writePlannedEmitFile writes a planned emit file and optional sibling source map + pragma. */
function writePlannedEmitFile(f: PlannedEmitFile) {
  const outPath = f.dest
  if (ENABLE_SOURCE_MAPS && f.trace) {
    const mapBasename = `${FS.basename(outPath)}.map`
    FS.writeFile(outPath + '.map', traceToEncodedSourceMapJson({ outputAbsolutePath: outPath, trace: f.trace }))
    FS.writeFile(outPath, appendSourceMappingUrlPragma(f.content, mapBasename))
  } else {
    FS.writeFile(outPath, f.content)
  }
}

/** planTaoSdkEmitFiles maps each `CompileOutputFile` to an absolute `dest`: the bootstrap path for
 * `entryRelativePath`, otherwise paths under `dirname(outputPath)` mirroring `relativePath`. */
function planTaoSdkEmitFiles(
  files: CompileOutputFile[],
  entryRelativePath: string,
  outputPath: string,
): PlannedEmitFile[] {
  const emitRoot = FS.dirname(outputPath)
  return files.map(f => ({
    ...f,
    dest: f.relativePath === entryRelativePath ? outputPath : FS.resolvePath(emitRoot, f.relativePath),
  }))
}

/** resolveCompilePaths validates `runtimeDir`/`stdLibRoot` and returns the final bootstrap path plus staging root. */
function resolveCompilePaths(opts: TaoSDK_compileOpts): TaoSDK_compilePaths {
  const runtimeDir = FS.resolvePath(opts.runtimeDir)
  if (!FS.isDirectory(runtimeDir)) {
    throwUserInputRejectionError(`Runtime path is not a directory: ${runtimeDir}`)
  }
  const stdLibRoot = opts.stdLibRoot
  if (stdLibRoot && !FS.isDirectory(stdLibRoot)) {
    throwUserInputRejectionError(`Standard library path is not a directory: ${stdLibRoot}`)
  }
  const targetOutputPath = opts.outputFileName
    ? FS.resolvePath(runtimeDir, opts.outputFileName)
    : resolveTaoRuntimeBootstrapAbsolutePath(runtimeDir)
  return { targetOutputPath, stagedEmitRoot: TAO_SDK_STAGING_EMIT_ROOT }
}
