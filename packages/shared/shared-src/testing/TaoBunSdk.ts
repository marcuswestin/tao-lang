import { createHash } from '../crypto'
import { spawnSync, type SpawnSyncReturns } from '../exec'
import * as FS from '../fs'

/** TaoSdkAppConfigObject is the nested app config override shape passed through JSON to `TaoSDK_compile`. */
export type TaoSdkAppConfigObject = { [key: string]: string | TaoSdkAppConfigObject }

/** TaoSdkCompileSpawnOptsJson is the JSON passed to `TaoSDK_compile` via env for subprocess `bun -e` harnesses. */
export type TaoSdkCompileSpawnOptsJson = {
  path: string
  runtimeDir: string
  stdLibRoot?: string
  outputFileName?: string
  /** App config overrides, e.g. `{ provider: { appId: "test-db" } }`. */
  app?: TaoSdkAppConfigObject
}

/** Known `process.env` keys used to pass `TaoSdkCompileSpawnOptsJson` into the inline `bun -e` script. */
export type TaoSdkCompileOptsEnvVar = 'TAO_EXPO_COMPILE_OPTS' | 'TAO_HEADLESS_COMPILE_OPTS'

/** TAO_SDK_COMPILE_OPTS_ENV_EXPO is the env key for Expo Jest harness subprocess compiles. */
export const TAO_SDK_COMPILE_OPTS_ENV_EXPO = 'TAO_EXPO_COMPILE_OPTS' as const satisfies TaoSdkCompileOptsEnvVar

/** TAO_SDK_COMPILE_OPTS_ENV_HEADLESS is the env key for headless RN test harness subprocess compiles. */
export const TAO_SDK_COMPILE_OPTS_ENV_HEADLESS = 'TAO_HEADLESS_COMPILE_OPTS' as const satisfies TaoSdkCompileOptsEnvVar

/** buildTaoSdkCompileBunInlineScript returns the `bun -e` source that imports `TaoSDK_compile` from `taoSdkModuleUrl` and runs it with JSON from `process.env[optsEnvVar]`. */
export function buildTaoSdkCompileBunInlineScript(
  taoSdkModuleUrl: string,
  optsEnvVar: TaoSdkCompileOptsEnvVar,
): string {
  const envKey = JSON.stringify(optsEnvVar)
  return `
    import { TaoSDK_compile } from '${taoSdkModuleUrl}'
    const opts = JSON.parse(process.env[${envKey}] ?? '{}')
    await TaoSDK_compile(opts)
  `
}

/** runTaoSdkCompileBunSync spawns `bun -e` at `repoRoot` to run `TaoSDK_compile` with opts passed through `optsEnvVar`. */
export function runTaoSdkCompileBunSync(args: {
  repoRoot: string
  taoSdkModuleUrl: string
  compileOpts: TaoSdkCompileSpawnOptsJson
  optsEnvVar: TaoSdkCompileOptsEnvVar
}): SpawnSyncReturns<string> {
  const code = buildTaoSdkCompileBunInlineScript(args.taoSdkModuleUrl, args.optsEnvVar)
  return spawnSync('bun', ['-e', code], {
    cwd: args.repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      [args.optsEnvVar]: JSON.stringify(args.compileOpts),
    },
  })
}

/** throwIfTaoSdkCompileFailed throws when Bun exited non-zero or the expected output file is missing after success. */
export function throwIfTaoSdkCompileFailed(
  command: SpawnSyncReturns<string>,
  opts: { outputPath: string; runtimeLabel: string },
): void {
  const detail = formatBunSpawnSyncErrorMessage(command)
  if (command.status !== 0) {
    throw new Error(`Failed to compile Tao for ${opts.runtimeLabel}: ${detail}`)
  }
  if (!FS.existsSync(opts.outputPath)) {
    throw new Error(`Failed to compile Tao for ${opts.runtimeLabel}: ${detail}`)
  }
}

/** TaoSdkRuntimeCompileResult bundles the resolved output path with subprocess stderr/stdout (or status fallback) after a successful compile. */
export type TaoSdkRuntimeCompileResult = {
  outputPath: string
  compileError: string
}

type TaoSdkCompileArgs = {
  repoRoot: string
  runtimeDir: string
  taoSdkModuleUrl: string
  optsEnvVar: TaoSdkCompileOptsEnvVar
  path: string
  stdLibRoot?: string
  outputFileName?: string
  app?: TaoSdkAppConfigObject
}

type CompileOutputOpts = { outputPath: string; runtimeLabel: string }

const TAO_SDK_COMPILE_CACHE_VERSION = 'tao-sdk-compile-cache-v1'
const compileInputDigestCache = new Map<string, string>()

/** compileTaoSdkWithBunSync compiles via `runTaoSdkCompileBunSync`, throws on failure per `throwIfTaoSdkCompileFailed`, and returns the output path plus stderr/stdout (or status fallback) from the subprocess. */
export function compileTaoSdkWithBunSync(
  args: TaoSdkCompileArgs & CompileOutputOpts,
): TaoSdkRuntimeCompileResult {
  const cacheEntryRoot = getTaoSdkCompileCacheEntryRoot(args)
  if (restoreTaoSdkCompileOutputFromCache(cacheEntryRoot, args.outputPath)) {
    return {
      outputPath: args.outputPath,
      compileError: `Tao SDK compile cache hit: ${FS.basename(cacheEntryRoot)}`,
    }
  }

  const command = runTaoSdkCompileBunSync({
    repoRoot: args.repoRoot,
    taoSdkModuleUrl: args.taoSdkModuleUrl,
    compileOpts: {
      path: args.path,
      runtimeDir: args.runtimeDir,
      stdLibRoot: args.stdLibRoot,
      outputFileName: args.outputFileName,
      app: args.app,
    },
    optsEnvVar: args.optsEnvVar,
  })

  throwIfTaoSdkCompileFailed(command, {
    outputPath: args.outputPath,
    runtimeLabel: args.runtimeLabel,
  })
  cacheTaoSdkCompileOutput(args, cacheEntryRoot)

  return {
    outputPath: args.outputPath,
    compileError: formatBunSpawnSyncErrorMessage(command),
  }
}

function getTaoSdkCompileCacheEntryRoot(args: TaoSdkCompileArgs & CompileOutputOpts): string {
  return FS.resolvePath(args.repoRoot, '.builds/tao-sdk-compile-cache', createTaoSdkCompileCacheKey(args))
}

function createTaoSdkCompileCacheKey(args: TaoSdkCompileArgs & CompileOutputOpts): string {
  const hash = createHash('sha256')
  updateHash(hash, TAO_SDK_COMPILE_CACHE_VERSION)
  updateHash(
    hash,
    stableStringify({
      app: args.app ?? null,
      outputFileName: args.outputFileName ?? null,
      optsEnvVar: args.optsEnvVar,
      path: FS.relativePathWithPosixSlashes(args.repoRoot, args.path),
      runtimeDir: FS.relativePathWithPosixSlashes(args.repoRoot, args.runtimeDir),
      runtimeLabel: args.runtimeLabel,
      stdLibRoot: args.stdLibRoot ? FS.relativePathWithPosixSlashes(args.repoRoot, args.stdLibRoot) : null,
      taoSdkModuleUrl: args.taoSdkModuleUrl,
    }),
  )
  updateHashWithDirectoryDigest(hash, 'source-dir', FS.dirname(args.path))
  updateHashWithDirectoryDigest(hash, 'stdlib', args.stdLibRoot)
  updateHashWithFileDigest(hash, 'tao-sdk-module', filePathFromFileUrl(args.taoSdkModuleUrl))
  return hash.digest('hex')
}

function restoreTaoSdkCompileOutputFromCache(cacheEntryRoot: string, outputPath: string): boolean {
  if (!FS.isDirectory(cacheEntryRoot)) {
    return false
  }

  const targetEmitRoot = FS.dirname(outputPath)
  FS.rmDirectory(targetEmitRoot)
  FS.mkdir(FS.dirname(targetEmitRoot))
  FS.copyDirectory(cacheEntryRoot, targetEmitRoot)
  if (FS.existsSync(outputPath)) {
    return true
  }

  FS.rmDirectory(targetEmitRoot)
  FS.rmDirectory(cacheEntryRoot)
  return false
}

function cacheTaoSdkCompileOutput(args: TaoSdkCompileArgs & CompileOutputOpts, cacheEntryRoot: string): void {
  const targetEmitRoot = FS.dirname(args.outputPath)
  if (!FS.isDirectory(targetEmitRoot) || FS.isDirectory(cacheEntryRoot)) {
    return
  }

  const cacheTempRoot = `${cacheEntryRoot}.tmp-${process.pid}-${Date.now()}`
  FS.rmDirectory(cacheTempRoot)
  FS.mkdir(FS.dirname(cacheTempRoot))
  FS.copyDirectory(targetEmitRoot, cacheTempRoot)
  try {
    FS.move(cacheTempRoot, cacheEntryRoot)
  } catch {
    FS.rmDirectory(cacheTempRoot)
  }
}

function updateHashWithDirectoryDigest(
  hash: ReturnType<typeof createHash>,
  label: string,
  directoryPath: string | undefined,
): void {
  updateHash(hash, label)
  updateHash(hash, directoryPath ? digestDirectory(directoryPath) : 'missing')
}

function updateHashWithFileDigest(
  hash: ReturnType<typeof createHash>,
  label: string,
  filePath: string | undefined,
): void {
  updateHash(hash, label)
  updateHash(hash, filePath && FS.isFile(filePath) ? digestFile(filePath) : 'missing')
}

function digestDirectory(directoryPath: string): string {
  const resolvedDirectoryPath = FS.resolvePath(directoryPath)
  return memoizeCompileInputDigest(`dir:${resolvedDirectoryPath}`, () => {
    const hash = createHash('sha256')
    for (const filePath of listCacheInputFiles(resolvedDirectoryPath)) {
      updateHash(hash, FS.relativePathWithPosixSlashes(resolvedDirectoryPath, filePath))
      updateHash(hash, digestFile(filePath))
    }
    return hash.digest('hex')
  })
}

function digestFile(filePath: string): string {
  const resolvedFilePath = FS.resolvePath(filePath)
  return memoizeCompileInputDigest(
    `file:${resolvedFilePath}`,
    () => createHash('sha256').update(FS.readTextFile(resolvedFilePath)).digest('hex'),
  )
}

function memoizeCompileInputDigest(cacheKey: string, compute: () => string): string {
  const cached = compileInputDigestCache.get(cacheKey)
  if (cached) {
    return cached
  }
  const digest = compute()
  compileInputDigestCache.set(cacheKey, digest)
  return digest
}

function listCacheInputFiles(directoryPath: string): string[] {
  if (!FS.isDirectory(directoryPath)) {
    return []
  }

  const files: string[] = []
  for (
    const entry of FS.readDirWithFileTypes(directoryPath).sort((left, right) => left.name.localeCompare(right.name))
  ) {
    const entryPath = FS.joinPath(directoryPath, entry.name)
    if (entry.isDirectory()) {
      if (!shouldSkipCacheInputDirectory(entry.name)) {
        files.push(...listCacheInputFiles(entryPath))
      }
      continue
    }
    if (entry.isFile()) {
      files.push(entryPath)
    }
  }
  return files
}

function shouldSkipCacheInputDirectory(directoryName: string): boolean {
  return (
    directoryName === 'node_modules'
    || directoryName === '.git'
    || directoryName === '.devenv'
    || directoryName === '.direnv'
    || directoryName === '.builds'
    || directoryName.startsWith('_gen')
  )
}

function filePathFromFileUrl(fileUrl: string): string | undefined {
  try {
    const url = new URL(fileUrl)
    if (url.protocol !== 'file:') {
      return undefined
    }
    return decodeURIComponent(url.pathname)
  } catch {
    return undefined
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value))
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortJsonValue(value[key])]))
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function updateHash(hash: ReturnType<typeof createHash>, value: string): void {
  hash.update(value)
  hash.update('\0')
}

/** formatBunSpawnSyncErrorMessage returns stderr, stdout, or a status fallback after `spawnSync('bun', ...)`. */
export function formatBunSpawnSyncErrorMessage(command: SpawnSyncReturns<string>): string {
  return command.stderr || command.stdout || `bun exited with status ${command.status}`
}
