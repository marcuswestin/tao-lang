import { spawnSync, type SpawnSyncReturns } from 'node:child_process'

/** TaoSdkCompileSpawnOptsJson is the JSON passed to `TaoSDK_compile` via env for subprocess `bun -e` harnesses. */
export type TaoSdkCompileSpawnOptsJson = {
  path: string
  runtimeDir: string
  stdLibRoot?: string
  outputFileName?: string
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

/** formatBunSpawnSyncErrorMessage returns stderr, stdout, or a status fallback after `spawnSync('bun', ...)`. */
export function formatBunSpawnSyncErrorMessage(command: SpawnSyncReturns<string>): string {
  return command.stderr || command.stdout || `bun exited with status ${command.status}`
}
