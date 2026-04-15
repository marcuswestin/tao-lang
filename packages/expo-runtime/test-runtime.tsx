import { FS } from '@shared'
import { compiledScenarioTaoAppBootstrapRelativePath } from '@shared/TaoPaths'
import {
  compileTaoSdkWithBunSync,
  createCompiledTaoScenarioAdapter,
  renderCompiledTaoApp,
  TAO_SDK_COMPILE_OPTS_ENV_EXPO,
  type TaoScenarioAdapterCompileOpts,
  type TaoSdkRuntimeCompileResult,
} from '@shared/testing'
import * as RNTesting from '@testing-library/react-native'
import { type ComponentType as CompiledAppComponent, createElement } from 'react'

const runtimeDir = FS.resolvePath(__dirname)
const repoRoot = FS.resolvePath(runtimeDir, '../..')
const stdLibRoot = FS.resolvePath(repoRoot, 'packages/tao-std-lib')
const taoSdkModuleUrl = FS.pathToFileURL(FS.resolvePath(runtimeDir, '_gen-tao-lib/tao-cli-main.js')).href

const runtimeTestingDeps = {
  cleanup: () => RNTesting.cleanup(),
  render: (defaultExport: unknown) => RNTesting.render(createElement(defaultExport as CompiledAppComponent)),
  fireEvent: RNTesting.fireEvent,
}

/** createExpoScenarioAdapter creates a shared-scenario adapter for the Expo runtime. */
export function createExpoScenarioAdapter() {
  return createCompiledTaoScenarioAdapter({
    stdLibRoot,
    computeOutputFileName: scenarioName =>
      `_gen/_gen-runtime-tests/${compiledScenarioTaoAppBootstrapRelativePath(scenarioName)}`,
    compile: compileTaoForExpoRuntime,
    render: outputPath => {
      const { compiledModule, ...rest } = renderCompiledTaoApp(outputPath, runtimeTestingDeps)
      return { ...rest, CompiledComponent: compiledModule.default as CompiledAppComponent }
    },
    cleanup: () => RNTesting.cleanup(),
  })
}

/** compileTaoForExpoRuntime compiles a scenario's app.tao into its expo runtime test output directory. */
function compileTaoForExpoRuntime(opts: TaoScenarioAdapterCompileOpts): TaoSdkRuntimeCompileResult {
  const outputPath = FS.resolvePath(runtimeDir, opts.outputFileName)
  return compileTaoSdkWithBunSync({
    repoRoot,
    runtimeDir,
    taoSdkModuleUrl,
    optsEnvVar: TAO_SDK_COMPILE_OPTS_ENV_EXPO,
    path: opts.path,
    stdLibRoot: opts.stdLibRoot,
    outputFileName: opts.outputFileName,
    outputPath,
    runtimeLabel: 'the Expo runtime',
  })
}
