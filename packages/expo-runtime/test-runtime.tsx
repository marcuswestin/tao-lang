import { jest } from '@jest/globals'
import * as RNTesting from '@testing-library/react-native'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ComponentType as CompiledAppComponent } from 'react'
import type { CompiledTaoScenario, CompiledTaoScenarioAdapter } from '../shared/shared-src/CompiledTaoScenarios'

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
}

const runtimeDir = resolvePath(__dirname)
const repoRoot = resolvePath(runtimeDir, '../..')
const stdLibRoot = resolvePath(repoRoot, 'packages/tao-std-lib')
const taoSdkModuleUrl = pathToFileURL(resolvePath(runtimeDir, '_gen-tao-lib/tao-cli-main.js')).href

// createExpoScenarioAdapter Create a shared-scenario adapter for the Expo runtime.
export function createExpoScenarioAdapter() {
  const outputFileName = `app/_gen-runtime-tests/${getGeneratedOutputFileName('scenario')}`

  const adapter: CompiledTaoScenarioAdapter = {
    async compileScenario({ scenarioDir }: { scenarioDir: string; scenario: CompiledTaoScenario }) {
      return compileTaoForExpoRuntime({
        path: resolvePath(scenarioDir, 'app.tao'),
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

// compileTaoForExpoRuntime Compile a scenario's app.tao into a unique generated Expo module for this test run.
function compileTaoForExpoRuntime(opts: CompileOpts): CompileResult {
  const outputPath = resolvePath(runtimeDir, opts.outputFileName)
  const code = `
    import { TaoSDK_compile } from '${taoSdkModuleUrl}'
    const opts = JSON.parse(process.env.TAO_EXPO_COMPILE_OPTS ?? '{}')
    await TaoSDK_compile(opts)
  `
  const env = {
    ...process.env,
    TAO_EXPO_COMPILE_OPTS: JSON.stringify({ ...opts, runtimeDir }),
  }
  const command = spawnSync('bun', ['-e', code], { cwd: repoRoot, encoding: 'utf8', env })

  const compileError = command.stderr || command.stdout || `bun exited with status ${command.status}`
  if (command.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`Failed to compile Tao for the Expo runtime: ${compileError}`)
  }

  return { outputPath, compileError }
}

// renderCompiledTaoApp Render the freshly compiled Expo module instead of a statically imported app entrypoint.
function renderCompiledTaoApp(outputPath: string): RenderCompiledAppResult {
  RNTesting.cleanup()
  const CompiledTaoApp = loadCompiledAppModule(outputPath)

  return {
    ...RNTesting.render(<CompiledTaoApp />),
    CompiledComponent: CompiledTaoApp,
  }
}

// loadCompiledAppModule Reset Jest's module cache and load the generated app module for this specific scenario run.
// The compiled module path is only known after compilation, so the runtime test harness cannot use a static import here.
function loadCompiledAppModule(outputPath: string): CompiledAppComponent {
  jest.resetModules()
  const result = jest.requireActual(outputPath) as { default: CompiledAppComponent }
  return result.default
}

// getGeneratedOutputFileName Create per-test output files so shared scenarios do not collide in parallel or cached runs.
function getGeneratedOutputFileName(baseName: string) {
  return `test-${sanitizePathSegment(baseName)}-${Math.random().toString(36).slice(2, 12)}-app-output.tsx`
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}
