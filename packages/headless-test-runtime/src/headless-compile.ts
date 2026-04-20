import { FS } from '@shared'
import { compiledScenarioTaoAppBootstrapRelativePath } from '@shared/TaoPaths'
import {
  compileTaoSdkWithBunSync,
  discoverCompiledTaoScenarios,
  TAO_SDK_COMPILE_OPTS_ENV_HEADLESS,
  type TaoSdkRuntimeCompileResult,
} from '@shared/testing'

export type CompileOpts = {
  path: string
  stdLibRoot?: string
  outputFileName?: string
}

const runtimeDir = FS.resolvePath(__dirname, '..')
const repoRoot = FS.resolvePath(runtimeDir, '../..')
/** headlessScenarioCompileOutputRoot anchors scenario compile output under `.builds/` so Jest watch on this package does not loop on generated files. */
export const headlessScenarioCompileOutputRoot = FS.resolvePath(
  repoRoot,
  '.builds/headless-test-runtime/_gen-runtime-tests',
)
export const stdLibRoot = FS.resolvePath(repoRoot, 'packages/tao-std-lib')
/** headlessDefaultCompiledAppBootstrapPath is the default `TaoSDK_compile` output used when headless tests do not pass a per-scenario path. */
export const headlessDefaultCompiledAppBootstrapPath = FS.resolvePath(
  runtimeDir,
  'src/_gen-tao-compiler/tao-app/app-bootstrap.tsx',
)
const taoSdkModuleUrl = FS.pathToFileURL(FS.resolvePath(repoRoot, 'packages/tao-cli/cli-src/tao-cli-main.ts')).href

/** getHeadlessTestRuntimeDir returns this package’s root—the `runtimeDir` passed to `TaoSDK_compile` from headless tests. */
export function getHeadlessTestRuntimeDir() {
  return runtimeDir
}

/** regenerateAllHeadlessScenarioOutputs compiles every non-skipped Apps/Test Apps scenario into `.builds/headless-test-runtime/_gen-runtime-tests/`. */
export function regenerateAllHeadlessScenarioOutputs() {
  for (const { scenarioDir, scenario, skip } of discoverCompiledTaoScenarios()) {
    if (skip || !scenario) {
      continue
    }
    const scenarioName = FS.basename(scenarioDir)
    const outputFileName = FS.relativePath(
      runtimeDir,
      FS.resolvePath(headlessScenarioCompileOutputRoot, compiledScenarioTaoAppBootstrapRelativePath(scenarioName)),
    )
    compileTaoForHeadlessRuntime({
      path: FS.resolvePath(scenarioDir, `${scenarioName}.tao`),
      stdLibRoot,
      outputFileName,
    })
  }
}

/** compileTaoForHeadlessRuntime spawns `bun` from the repo root to run `TaoSDK_compile` with `runtimeDir` set to this package.
 * On success returns `{ outputPath, compileError }` (stderr/stdout may still be in `compileError`); otherwise throws. */
export function compileTaoForHeadlessRuntime(opts: CompileOpts): TaoSdkRuntimeCompileResult {
  const outputPath = getCompiledOutputPath(opts.outputFileName)
  return compileTaoSdkWithBunSync({
    repoRoot,
    runtimeDir,
    taoSdkModuleUrl,
    optsEnvVar: TAO_SDK_COMPILE_OPTS_ENV_HEADLESS,
    path: opts.path,
    stdLibRoot: opts.stdLibRoot,
    outputFileName: opts.outputFileName,
    outputPath,
    runtimeLabel: 'the headless runtime',
  })
}

function getCompiledOutputPath(outputFileName?: string) {
  if (!outputFileName) {
    return headlessDefaultCompiledAppBootstrapPath
  }

  return FS.resolvePath(runtimeDir, outputFileName)
}
