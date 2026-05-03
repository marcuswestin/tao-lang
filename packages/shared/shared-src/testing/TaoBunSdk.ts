import { spawnSync, type SpawnSyncReturns } from '../exec'
import { existsSync } from '../fs'

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
  if (!existsSync(opts.outputPath)) {
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

/** compileTaoSdkWithBunSync compiles via `runTaoSdkCompileBunSync`, throws on failure per `throwIfTaoSdkCompileFailed`, and returns the output path plus stderr/stdout (or status fallback) from the subprocess. */
export function compileTaoSdkWithBunSync(
  args: TaoSdkCompileArgs & CompileOutputOpts,
): TaoSdkRuntimeCompileResult {
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

  return {
    outputPath: args.outputPath,
    compileError: formatBunSpawnSyncErrorMessage(command),
  }
}

/** formatBunSpawnSyncErrorMessage returns stderr, stdout, or a status fallback after `spawnSync('bun', ...)`. */
export function formatBunSpawnSyncErrorMessage(command: SpawnSyncReturns<string>): string {
  return command.stderr || command.stdout || `bun exited with status ${command.status}`
}
