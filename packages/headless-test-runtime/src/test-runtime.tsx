import type { CompiledTaoScenario, CompiledTaoScenarioAdapter } from '@shared/CompiledTaoScenarios'
import {
  formatBunSpawnSyncErrorMessage,
  runTaoSdkCompileBunSync,
  TAO_SDK_COMPILE_OPTS_ENV_HEADLESS,
} from '@shared/TaoBunSdk'
import { sanitizeCompiledScenarioOutputSegment } from '@shared/TaoPaths'
import * as RNTesting from '@testing-library/react-native'
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ComponentType } from 'react'

type CompileOpts = {
  path: string
  stdLibRoot?: string
  outputFileName?: string
}

type CompileResult = {
  outputPath: string
  compileError?: unknown
}

type CompiledAppModule = {
  default: ComponentType
}

type RenderCompiledAppResult = RNTesting.RenderResult & {
  compiledModule: CompiledAppModule
  pressVisibleText(text: string): void
}

const runtimeDir = resolvePath(__dirname, '..')
const repoRoot = resolvePath(runtimeDir, '../..')
const stdLibRoot = resolvePath(repoRoot, 'packages/tao-std-lib')
const compiledAppModulePath = resolvePath(runtimeDir, 'src/_gen-tao-compiler/tao-app/app-bootstrap.tsx')
const taoSdkModuleUrl = pathToFileURL(resolvePath(repoRoot, 'packages/tao-cli/cli-src/tao-cli-main.ts')).href

/** getHeadlessTestRuntimeDir returns this package’s root—the `runtimeDir` passed to `TaoSDK_compile` from headless tests. */
export function getHeadlessTestRuntimeDir() {
  return runtimeDir
}

/** createHeadlessScenarioAdapter builds a `CompiledTaoScenarioAdapter` that compiles `${scenarioDir}/app.tao` into the stable
 * per-scenario path under `src/_gen-runtime-tests/`, renders via Testing Library, and runs RTL `cleanup` on adapter cleanup. */
export function createHeadlessScenarioAdapter() {
  const adapter: CompiledTaoScenarioAdapter = {
    async compileScenario(
      { scenarioDir, scenarioName }: { scenarioDir: string; scenarioName: string; scenario: CompiledTaoScenario },
    ) {
      const outputFileName = `src/_gen-runtime-tests/${getGeneratedOutputFileName(scenarioName)}`
      return compileTaoForHeadlessRuntime({
        path: resolvePath(scenarioDir, 'app.tao'),
        stdLibRoot,
        outputFileName,
      })
    },
    renderCompiledApp({ outputPath }: { outputPath: string }) {
      return renderCompiledHeadlessTaoApp(outputPath)
    },
    cleanup() {
      RNTesting.cleanup()
    },
  }

  return adapter
}

/** compileTaoForHeadlessRuntime spawns `bun` from the repo root to run `TaoSDK_compile` with `runtimeDir` set to this package.
 * On success returns `{ outputPath, compileError }` (stderr/stdout may still be in `compileError`); otherwise throws. */
export async function compileTaoForHeadlessRuntime(opts: CompileOpts): Promise<CompileResult> {
  const outputPath = getCompiledOutputPath(opts.outputFileName)
  const command = runTaoSdkCompileBunSync({
    repoRoot,
    taoSdkModuleUrl,
    compileOpts: { ...opts, runtimeDir },
    optsEnvVar: TAO_SDK_COMPILE_OPTS_ENV_HEADLESS,
  })

  const compileError = formatBunSpawnSyncErrorMessage(command)
  if (command.status === 0) {
    return { outputPath, compileError }
  }

  throw new Error(`Failed to compile Tao for the headless runtime: ${String(compileError)}`)
}

/** renderCompiledHeadlessTaoApp `require`s the module at `outputPath` (default: shared stub `tao-app/app-bootstrap.tsx`), evicts that path
 * from `require.cache` so a recompiled file is picked up, runs RTL `cleanup`, then `render(<default />)`.
 * Does not call `jest.resetModules()` — that would load a second `react` instance and break hooks in `react-native` (e.g. Pressable)
 * while Testing Library still uses the original React. */
export function renderCompiledHeadlessTaoApp(outputPath = compiledAppModulePath): RenderCompiledAppResult {
  RNTesting.cleanup()
  const compiledModule = loadCompiledAppModule(outputPath)
  const CompiledHeadlessTaoApp = compiledModule.default

  const screen = RNTesting.render(<CompiledHeadlessTaoApp />)
  return {
    ...screen,
    compiledModule,
    pressVisibleText(text: string) {
      RNTesting.fireEvent.press(screen.getByText(text))
    },
  }
}

function loadCompiledAppModule(outputPath: string): CompiledAppModule {
  const resolvedModulePath = require.resolve(outputPath)
  delete require.cache[resolvedModulePath]

  return require(resolvedModulePath) as CompiledAppModule
}

function getCompiledOutputPath(outputFileName?: string) {
  if (!outputFileName) {
    return compiledAppModulePath
  }

  return resolvePath(runtimeDir, outputFileName)
}

function getGeneratedOutputFileName(scenarioName: string) {
  return `test-${sanitizeCompiledScenarioOutputSegment(scenarioName)}/tao-app/app-bootstrap.tsx`
}
