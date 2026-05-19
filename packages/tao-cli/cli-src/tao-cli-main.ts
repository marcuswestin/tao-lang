import { Command } from '@commander-js/extra-typings'
import {
  acceptTaoDesignSuggestions,
  appendSourceMappingUrlPragma,
  type CompileOutputFile,
  compileTao,
  generateTaoDesignSuggestions,
  mergeTaoAppConfig,
  parseAppConfigAssignment,
  resolveTaoRuntimeBootstrapAbsolutePath,
  type TaoAppConfigObject,
  type TaoDesignDiagnostic,
  type TaoDesignMode,
  traceToEncodedSourceMapJson,
} from '@compiler'
import {
  createTaoDesignLLMProvider,
  type TaoDesignLLMProviderName,
} from '@compiler/design/design-suggestion-provider'
import { FS, TaoError } from '@shared'
import { Log } from '@shared/Log'
import { throwUserInputRejectionError } from '@shared/TaoErrors'
import chokidar from 'chokidar'
import { hci } from './hci-human-computer-interaction'
import { pushCompiledSchema } from './schema-push'
import { formatFile } from './tao-sdk/sdk-format'

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
    .option('--app <assignment>', 'Override an app config key, e.g. --app provider.appId=value', collectAppOverride, {})
    .option('--design-mode <mode>', 'Design mode: development or production', parseDesignMode, 'development')
    .option(
      '--design-lock-dir <path>',
      'Directory for tao.design.lock and .tao.design.lock',
      (value) => FS.resolvePath(value),
    )
    .option('--push-schema', 'Push data schemas after a successful compile')
    .option('--push-schema-overwrite', 'Push data schemas after compile using provider overwrite/exact-sync mode')
    .action(
      async (
        path,
        { watch, verbose, runtimeDir, stdLibRoot, app, designMode, designLockDir, pushSchema, pushSchemaOverwrite },
      ) => {
        hci.setVerbose(verbose)
        await hci.wrapExecution(async () => {
          /** compileAndWrite runs `TaoSDK_compile` for the path/runtime/std-lib and prints the output path.
           * In watch mode, parse/compiler errors are logged and the process keeps running so `just dev` is not torn down. */
          async function compileAndWrite() {
            hci.verboselyInform(`Compiling...`)
            const result = await TaoSDK_compile({
              path,
              runtimeDir,
              stdLibRoot,
              app,
              designLockDir,
              designMode,
              pushSchema: pushSchema === true,
              pushSchemaOverwrite: pushSchemaOverwrite === true,
            })
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
      },
    )

  program.command('design')
    .description('Analyze Tao design inference, or run `tao design update <path>` to accept suggestions')
    .argument('<path-or-update>', 'The file to analyze, or `update`')
    .argument('[path]', 'The file to analyze when using `update`')
    .option('--verbose', 'Verbose output', false)
    .option('--llm', 'Generate design suggestions through an LLM provider (default: codex-cli)')
    .option('--llm-provider <provider>', 'LLM provider: codex-cli or claude-cli')
    .option('--model <model>', 'Model name or alias for the selected LLM provider')
    .option('--std-lib-root <path>', 'The root directory of the standard library', (value) => FS.resolvePath(value))
    .option(
      '--design-lock-dir <path>',
      'Directory for tao.design.lock and .tao.design.lock',
      (value) => FS.resolvePath(value),
    )
    .action(async (pathOrUpdate, path, { verbose, llm, llmProvider, model, stdLibRoot, designLockDir }) => {
      hci.setVerbose(verbose)
      await hci.wrapExecution(async () => {
        const suggestionProvider = designSuggestionProviderFromOptions({ llm, llmProvider, model })
        if (pathOrUpdate === 'update') {
          if (path === undefined) {
            throwUserInputRejectionError('Expected a Tao file path after `tao design update`.')
          }
          const result = await acceptTaoDesignSuggestions({
            file: FS.resolvePath(path),
            stdLibRoot,
            designLockDir,
            suggestionProvider,
          })
          printDesignResult('Accepted design lock', result.acceptedPath, result.diagnostics)
          rejectOnDesignErrors(result.diagnostics)
          return
        }
        if (path !== undefined) {
          throwUserInputRejectionError('Expected `tao design <path>` or `tao design update <path>`.')
        }
        const result = await generateTaoDesignSuggestions({
          file: FS.resolvePath(pathOrUpdate),
          stdLibRoot,
          designLockDir,
          suggestionProvider,
        })
        printDesignResult('Design suggestions', result.suggestionPath, result.diagnostics)
        rejectOnDesignErrors(result.diagnostics)
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

  program.parse(normalizeAppOverrideArgv(process.argv))
}

function designSuggestionProviderFromOptions(opts: {
  llm?: boolean
  llmProvider?: string
  model?: string
}) {
  if (opts.llm !== true && opts.llmProvider === undefined && opts.model === undefined) {
    return undefined
  }
  const provider = parseLLMProvider(opts.llmProvider ?? 'codex-cli')
  hci.verboselyInform(`Using ${provider} for design suggestions.`)
  return createTaoDesignLLMProvider({
    cwd: process.cwd(),
    model: opts.model,
    provider,
  })
}

function parseLLMProvider(value: string): TaoDesignLLMProviderName {
  if (value === 'codex-cli' || value === 'claude-cli') {
    return value
  }
  throwUserInputRejectionError(`Invalid --llm-provider '${value}'. Expected codex-cli or claude-cli.`)
}

type TaoSDK_compileOpts = {
  path: string
  runtimeDir: string
  stdLibRoot?: string
  /** When set (e.g. scenario harnesses), emit bootstrap under this path relative to `runtimeDir` instead of `_gen/tao-app/app-bootstrap.tsx`. */
  outputFileName?: string
  /** App config overrides, e.g. `{ provider: { appId: "test-db" } }`. */
  app?: TaoAppConfigObject
  /** Design mode. Development uses deterministic suggestions as fallback; production requires accepted lock entries. */
  designMode?: TaoDesignMode
  /** Directory containing `tao.design.lock` and `.tao.design.lock`. */
  designLockDir?: string
  /** When true, push schemas with provider admin after successful compile. */
  pushSchema?: boolean
  /** When true, push schemas with provider admin in overwrite/exact-sync mode after successful compile. */
  pushSchemaOverwrite?: boolean
}

type TaoSDK_compileResult = {
  outputPath: string
  files: CompileOutputFile[]
}

type PlannedEmitFile = CompileOutputFile & { dest: string }

type TaoSDK_compilePaths = {
  /** Final bootstrap path after the staging directory is moved into place. */
  targetOutputPath: string
}

/** TaoSDK_compile compiles `path` into the runtime package at {@link resolveTaoRuntimeBootstrapAbsolutePath} by default, or `runtimeDir`/`outputFileName` when tests pass an override.
 * - `runtimeDir` must exist as a directory.
 * - Emits into a fresh OS temp staging directory (`mkdtemp`), copies `compileTao`’s `copyDirs` under that staging root, then replaces `dirname(targetOutputPath)` by moving the staging directory there so concurrent compiles do not share one path.
 * - Compile or validation failures become `UserInputRejectionError` with the human-readable report message. */
export async function TaoSDK_compile(opts: TaoSDK_compileOpts): Promise<TaoSDK_compileResult> {
  const { targetOutputPath } = resolveCompilePaths(opts)
  const stagedEmitRoot = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-sdk-staging-'))
  try {
    const targetEmitRoot = FS.dirname(targetOutputPath)
    const stagedOutputPath = FS.resolvePath(stagedEmitRoot, FS.relativePath(targetEmitRoot, targetOutputPath))

    const result = await compileTao({
      file: opts.path,
      stdLibRoot: opts.stdLibRoot,
      app: opts.app,
      designLockDir: opts.designLockDir,
      designMode: opts.designMode,
    })
    if (!result.ok) {
      FS.writeFile(stagedOutputPath, result.code)
      replaceTargetEmitRoot(stagedEmitRoot, targetEmitRoot)
      throwUserInputRejectionError(result.errorReport.getHumanErrorMessage())
    }
    const emitFiles = planTaoSdkEmitFiles(result.files, result.entryRelativePath, stagedOutputPath)
    for (const f of emitFiles) {
      writePlannedEmitFile(f)
    }
    for (const { fromAbsolutePath, toRelativePath } of result.copyDirs) {
      FS.copyDirectory(
        fromAbsolutePath,
        FS.resolvePath(stagedEmitRoot, toRelativePath),
      )
    }
    for (const { fromAbsolutePath, toRelativePath } of result.copyFiles) {
      const dest = FS.resolvePath(stagedEmitRoot, toRelativePath)
      FS.mkdir(FS.dirname(dest))
      FS.copyFile(fromAbsolutePath, dest)
    }

    replaceTargetEmitRoot(stagedEmitRoot, targetEmitRoot)
    if (opts.pushSchema === true || opts.pushSchemaOverwrite === true) {
      await pushCompiledSchema(result, opts.pushSchemaOverwrite === true)
    }
    return { outputPath: targetOutputPath, files: emitFiles }
  } finally {
    if (FS.isDirectory(stagedEmitRoot)) {
      FS.rmDirectory(stagedEmitRoot)
    }
  }
}

/** parseDesignMode validates the CLI design mode option. */
function parseDesignMode(value: string): TaoDesignMode {
  if (value === 'development' || value === 'production') {
    return value
  }
  throwUserInputRejectionError(`Invalid design mode '${value}'. Expected development or production.`)
}

/** printDesignResult prints a grouped CLI summary for design analysis/update. */
function printDesignResult(label: string, path: string, diagnostics: readonly TaoDesignDiagnostic[]): void {
  hci.inform(`${label}: ${path}`)
  const groups: { label: string; kinds: readonly TaoDesignDiagnostic['kind'][] }[] = [
    { label: 'New', kinds: ['new-entry', 'missing-entry'] },
    { label: 'Changed', kinds: ['changed-entry'] },
    { label: 'Stale', kinds: ['stale-entry'] },
    { label: 'Low-confidence', kinds: ['low-confidence'] },
  ]
  for (const group of groups) {
    const items = diagnostics.filter(d => group.kinds.includes(d.kind) && d.severity !== 'error')
    if (items.length === 0) {
      continue
    }
    hci.inform(`${group.label}: ${items.length}`)
    for (const item of items) {
      hci.inform(`- ${item.message}`)
    }
  }
  const errors = diagnostics.filter(d => d.severity === 'error')
  if (errors.length > 0) {
    hci.inform(`Errors: ${errors.length}`)
    for (const diagnostic of errors) {
      hci.inform(`- ${diagnostic.message}`)
    }
  }
}

function rejectOnDesignErrors(diagnostics: readonly TaoDesignDiagnostic[]): void {
  const errorCount = diagnostics.filter(d => d.severity === 'error').length
  if (errorCount > 0) {
    throwUserInputRejectionError(`Design analysis reported ${errorCount} error${errorCount === 1 ? '' : 's'}.`)
  }
}

/** collectAppOverride parses repeatable `--app key=value` CLI assignments into a merged app config object. */
function collectAppOverride(value: string, previous: TaoAppConfigObject): TaoAppConfigObject {
  try {
    return mergeTaoAppConfig({ app: previous }, parseAppConfigAssignment(value)).app
  } catch {
    throwUserInputRejectionError(`Invalid --app override '${value}'. Expected key=value.`)
  }
}

/** normalizeAppOverrideArgv converts `--app.provider.key=value` into Commander’s repeatable `--app provider.key=value` form. */
function normalizeAppOverrideArgv(argv: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('--app.')) {
      out.push(arg)
      continue
    }
    const raw = arg.slice('--app.'.length)
    const eq = raw.indexOf('=')
    out.push('--app')
    if (eq >= 0) {
      out.push(raw)
      continue
    }
    const value = argv[i + 1]
    if (value === undefined) {
      out.push(raw)
      continue
    }
    out.push(`${raw}=${value}`)
    i++
  }
  return out
}

/** replaceTargetEmitRoot syncs staged files into the runtime output location without deleting the live tree.
 * Metro may resolve generated modules while `tao compile --watch` is writing; keeping the target tree present
 * prevents reloads from observing a temporarily missing `_gen/tao-app` directory. */
function replaceTargetEmitRoot(stagedEmitRoot: string, targetEmitRoot: string): void {
  if (!FS.isDirectory(targetEmitRoot)) {
    FS.move(stagedEmitRoot, targetEmitRoot)
    return
  }

  const stagedFiles = listFilesRecursively(stagedEmitRoot)
  const stagedRelativePaths = new Set(stagedFiles.map(sourcePath => FS.relativePath(stagedEmitRoot, sourcePath)))
  for (const sourcePath of stagedFiles) {
    const relativePath = FS.relativePath(stagedEmitRoot, sourcePath)
    const destPath = FS.resolvePath(targetEmitRoot, relativePath)
    const tempDestPath = `${destPath}.tmp-${process.pid}-${Date.now()}`
    FS.mkdir(FS.dirname(destPath))
    FS.copyFile(sourcePath, tempDestPath)
    FS.move(tempDestPath, destPath)
  }
  for (const targetPath of listFilesRecursively(targetEmitRoot)) {
    const relativePath = FS.relativePath(targetEmitRoot, targetPath)
    if (!stagedRelativePaths.has(relativePath)) {
      FS.rm(targetPath, { force: true })
    }
  }
}

function listFilesRecursively(root: string): string[] {
  const files: string[] = []
  for (const entry of FS.readDirWithFileTypes(root)) {
    const fullPath = FS.joinPath(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }
  return files
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

/** resolveCompilePaths validates `runtimeDir`/`stdLibRoot` and returns the final bootstrap output path. */
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
  return { targetOutputPath }
}
