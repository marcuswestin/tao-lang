import { FS } from '@shared'
import { compiledScenarioTaoAppBootstrapRelativePath } from '@shared/TaoPaths'
import {
  createCompiledTaoScenarioAdapter,
  renderCompiledTaoApp,
  type RenderCompiledTaoAppResult,
} from '@shared/testing'
import * as RNTesting from '@testing-library/react-native'
import { type ComponentType, createElement } from 'react'
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

type RenderCompiledAppResult = RenderCompiledTaoAppResult & RNTesting.RenderResult

const runtimeTestingDeps = {
  cleanup: () => RNTesting.cleanup(),
  render: (defaultExport: unknown) => RNTesting.render(createElement(defaultExport as ComponentType)),
  fireEvent: RNTesting.fireEvent,
  waitFor: RNTesting.waitFor,
}

/** createHeadlessScenarioAdapter builds a `CompiledTaoScenarioAdapter` that compiles `${scenarioDir}/${scenarioName}.tao` into the stable
 * per-scenario path under `.builds/headless-test-runtime/_gen-runtime-tests/` (repo-relative, outside this package), renders via Testing Library, and runs RTL `cleanup` on adapter cleanup. */
export function createHeadlessScenarioAdapter() {
  return createCompiledTaoScenarioAdapter({
    stdLibRoot,
    computeOutputFileName: scenarioName =>
      FS.relativePath(
        getHeadlessTestRuntimeDir(),
        FS.resolvePath(headlessScenarioCompileOutputRoot, compiledScenarioTaoAppBootstrapRelativePath(scenarioName)),
      ),
    compile: compileTaoForHeadlessRuntime,
    render: outputPath => renderCompiledHeadlessTaoApp(outputPath),
    cleanup: () => RNTesting.cleanup(),
  })
}

/** renderCompiledHeadlessTaoApp `require`s the module at `outputPath` (default: shared stub `tao-app/app-bootstrap.tsx`), evicts that path
 * from `require.cache` so a recompiled file is picked up, runs RTL `cleanup`, then `render(<default />)`.
 * Does not call `jest.resetModules()` — that would load a second `react` instance and break hooks in `react-native` (e.g. Pressable)
 * while Testing Library still uses the original React. */
export function renderCompiledHeadlessTaoApp(
  outputPath = headlessDefaultCompiledAppBootstrapPath,
): RenderCompiledAppResult {
  return renderCompiledTaoApp(outputPath, runtimeTestingDeps) as unknown as RenderCompiledAppResult
}
