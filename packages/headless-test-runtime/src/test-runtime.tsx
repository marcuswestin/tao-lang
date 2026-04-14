import { FS } from '@shared'
import { compiledScenarioTaoAppBootstrapRelativePath } from '@shared/TaoPaths'
import {
  attachPressVisibleText,
  type CompiledTaoScenario,
  type CompiledTaoScenarioAdapter,
  loadCompiledTaoAppModuleFromPath,
} from '@shared/testing'
import * as RNTesting from '@testing-library/react-native'
import type { ComponentType } from 'react'
import {
  compileTaoForHeadlessRuntime,
  getHeadlessTestRuntimeDir,
  headlessDefaultCompiledAppBootstrapPath,
  headlessScenarioCompileOutputRoot,
  stdLibRoot,
} from './headless-compile'

export {
  compileTaoForHeadlessRuntime,
  getHeadlessTestRuntimeDir,
  regenerateAllHeadlessScenarioOutputs,
} from './headless-compile'

type CompiledAppModule = {
  default: ComponentType
}

type RenderCompiledAppResult = RNTesting.RenderResult & {
  compiledModule: CompiledAppModule
  pressVisibleText(text: string): void
}

/** createHeadlessScenarioAdapter builds a `CompiledTaoScenarioAdapter` that compiles `${scenarioDir}/app.tao` into the stable
 * per-scenario path under `.builds/headless-test-runtime/_gen-runtime-tests/` (repo-relative, outside this package), renders via Testing Library, and runs RTL `cleanup` on adapter cleanup. */
export function createHeadlessScenarioAdapter() {
  const adapter: CompiledTaoScenarioAdapter = {
    async compileScenario(
      { scenarioDir, scenarioName }: { scenarioDir: string; scenarioName: string; scenario: CompiledTaoScenario },
    ) {
      const outputFileName = FS.relativePath(
        getHeadlessTestRuntimeDir(),
        FS.resolvePath(headlessScenarioCompileOutputRoot, compiledScenarioTaoAppBootstrapRelativePath(scenarioName)),
      )
      return compileTaoForHeadlessRuntime({
        path: FS.resolvePath(scenarioDir, 'app.tao'),
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

/** renderCompiledHeadlessTaoApp `require`s the module at `outputPath` (default: shared stub `tao-app/app-bootstrap.tsx`), evicts that path
 * from `require.cache` so a recompiled file is picked up, runs RTL `cleanup`, then `render(<default />)`.
 * Does not call `jest.resetModules()` — that would load a second `react` instance and break hooks in `react-native` (e.g. Pressable)
 * while Testing Library still uses the original React. */
export function renderCompiledHeadlessTaoApp(
  outputPath = headlessDefaultCompiledAppBootstrapPath,
): RenderCompiledAppResult {
  RNTesting.cleanup()
  const compiledModule = loadCompiledTaoAppModuleFromPath(outputPath) as CompiledAppModule
  const CompiledHeadlessTaoApp = compiledModule.default

  const screen = RNTesting.render(<CompiledHeadlessTaoApp />)
  return {
    ...screen,
    compiledModule,
    ...attachPressVisibleText(screen, RNTesting.fireEvent),
  }
}
