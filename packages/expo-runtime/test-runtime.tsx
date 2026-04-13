import { FS } from '@shared'
import type { CompiledTaoScenario, CompiledTaoScenarioAdapter } from '@shared/CompiledTaoScenarios'
import {
  formatBunSpawnSyncErrorMessage,
  runTaoSdkCompileBunSync,
  TAO_SDK_COMPILE_OPTS_ENV_EXPO,
  throwIfTaoSdkCompileFailed,
} from '@shared/TaoBunSdk'
import { compiledScenarioTaoAppBootstrapRelativePath } from '@shared/TaoPaths'
import * as RNTesting from '@testing-library/react-native'
import type { ComponentType as CompiledAppComponent } from 'react'

type CompileOpts = {
  path: string
  stdLibRoot?: string
  outputFileName: string
}

type CompileResult = {
  outputPath: string
  compileError?: unknown
}

type RenderCompiledAppResult = RNTesting.RenderResult & {
  CompiledComponent: CompiledAppComponent
  pressVisibleText(text: string): void
}

const runtimeDir = FS.resolvePath(__dirname)
const repoRoot = FS.resolvePath(runtimeDir, '../..')
const stdLibRoot = FS.resolvePath(repoRoot, 'packages/tao-std-lib')
const taoSdkModuleUrl = FS.pathToFileURL(FS.resolvePath(runtimeDir, '_gen-tao-lib/tao-cli-main.js')).href

// createExpoScenarioAdapter Create a shared-scenario adapter for the Expo runtime.
export function createExpoScenarioAdapter() {
  const adapter: CompiledTaoScenarioAdapter = {
    async compileScenario({
      scenarioDir,
      scenarioName,
    }: { scenarioDir: string; scenarioName: string; scenario: CompiledTaoScenario }) {
      const outputFileName = `app/_gen-runtime-tests/${compiledScenarioTaoAppBootstrapRelativePath(scenarioName)}`
      return compileTaoForExpoRuntime({
        path: FS.resolvePath(scenarioDir, 'app.tao'),
        stdLibRoot,
        outputFileName,
      })
    },
    renderCompiledApp({ outputPath }: { outputPath: string }) {
      return renderCompiledTaoApp(outputPath)
    },
    cleanup() {
      RNTesting.cleanup()
    },
  }

  return adapter
}

// compileTaoForExpoRuntime compiles a scenario's app.tao into its expo runtime test output directory.
function compileTaoForExpoRuntime(opts: CompileOpts): CompileResult {
  const outputPath = FS.resolvePath(runtimeDir, opts.outputFileName)
  const command = runTaoSdkCompileBunSync({
    repoRoot,
    taoSdkModuleUrl,
    compileOpts: { ...opts, runtimeDir },
    optsEnvVar: TAO_SDK_COMPILE_OPTS_ENV_EXPO,
  })

  throwIfTaoSdkCompileFailed(command, {
    outputPath,
    runtimeLabel: 'the Expo runtime',
    requireOutputFile: true,
  })

  return { outputPath, compileError: formatBunSpawnSyncErrorMessage(command) }
}

// renderCompiledTaoApp Render the freshly compiled Expo module instead of a statically imported app entrypoint.
function renderCompiledTaoApp(outputPath: string): RenderCompiledAppResult {
  RNTesting.cleanup()
  const CompiledTaoApp = loadCompiledAppModule(outputPath)
  const renderedScreen = RNTesting.render(<CompiledTaoApp />)
  return {
    ...renderedScreen,
    CompiledComponent: CompiledTaoApp,
    pressVisibleText(text: string) {
      RNTesting.fireEvent.press(renderedScreen.getByText(text))
    },
  }
}

/** loadCompiledAppModule evicts `require.cache` for `outputPath` then `require`s it (matches headless-test-runtime; avoids `jest.resetModules()` splitting React). */
function loadCompiledAppModule(outputPath: string): CompiledAppComponent {
  const resolved = require.resolve(outputPath)
  delete require.cache[resolved]
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(resolved)
  return mod.default
}
