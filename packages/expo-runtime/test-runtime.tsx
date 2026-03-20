import { jest } from '@jest/globals'
import { cleanup, render, type RenderResult } from '@testing-library/react-native'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ComponentType } from 'react'
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

type CompiledAppModule = {
  default: ComponentType
}

type RenderCompiledAppResult = RenderResult & {
  compiledModule: CompiledAppModule
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
      cleanup()
    },
  }

  return adapter
}

// getCompiledTaoScenarioName Derive a scenario display name from its directory name.
export function getCompiledTaoScenarioName(scenarioDir: string) {
  return basename(scenarioDir)
}

// compileTaoForExpoRuntime Compile a scenario's app.tao into a unique generated Expo module for this test run.
function compileTaoForExpoRuntime(opts: CompileOpts): CompileResult {
  const outputPath = resolvePath(runtimeDir, opts.outputFileName)
  const command = spawnSync(
    'bun',
    [
      '-e',
      `
        import { TaoSDK_compile } from '${taoSdkModuleUrl}'

        const opts = JSON.parse(process.env.TAO_EXPO_COMPILE_OPTS ?? '{}')
        await TaoSDK_compile(opts)
      `,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        TAO_EXPO_COMPILE_OPTS: JSON.stringify({ ...opts, runtimeDir }),
      },
    },
  )

  const compileError = command.stderr || command.stdout || `bun exited with status ${command.status}`
  if (command.status === 0 || existsSync(outputPath)) {
    return { outputPath, compileError }
  }

  throw new Error(`Failed to compile Tao for the Expo runtime: ${compileError}`)
}

// renderCompiledTaoApp Render the freshly compiled Expo module instead of a statically imported app entrypoint.
function renderCompiledTaoApp(outputPath: string): RenderCompiledAppResult {
  cleanup()
  const compiledModule = loadCompiledAppModule(outputPath)
  const CompiledTaoApp = compiledModule.default

  return {
    ...render(<CompiledTaoApp />),
    compiledModule,
  }
}

// loadCompiledAppModule Reset Jest's module cache and load the generated app module for this specific scenario run.
// The compiled module path is only known after compilation, so the runtime test harness cannot use a static import here.
function loadCompiledAppModule(outputPath: string): CompiledAppModule {
  jest.resetModules()
  return jest.requireActual(outputPath) as CompiledAppModule
}

// getGeneratedOutputFileName Create per-test output files so shared scenarios do not collide in parallel or cached runs.
function getGeneratedOutputFileName(baseName: string) {
  return `test-${sanitizePathSegment(baseName)}-${Math.random().toString(36).slice(2, 12)}-app-output.tsx`
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}
