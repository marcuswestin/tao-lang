import { FS } from '@shared'
import type { CompiledTaoScenario, CompiledTaoScenarioAdapter } from '@shared/CompiledTaoScenarios'
import { compiledScenarioTaoAppBootstrapRelativePath } from '@shared/TaoPaths'
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
  const compiledModule = loadCompiledAppModule(outputPath)
  const CompiledHeadlessTaoApp = compiledModule.default

  const screen = RNTesting.render(<CompiledHeadlessTaoApp />)
  return {
    ...screen,
    compiledModule,
    /** pressVisibleText dispatches a press on the first button with the given accessible name, else the first text match. */
    pressVisibleText(text: string) {
      const buttons = screen.queryAllByRole('button', { name: text })
      if (buttons.length > 0) {
        RNTesting.fireEvent.press(buttons[0]!)
        return
      }
      const nodes = screen.getAllByText(text)
      RNTesting.fireEvent.press(nodes[0]!)
    },
  }
}

function loadCompiledAppModule(outputPath: string): CompiledAppModule {
  const resolvedModulePath = require.resolve(outputPath)
  delete require.cache[resolvedModulePath]

  return require(resolvedModulePath) as CompiledAppModule
}
