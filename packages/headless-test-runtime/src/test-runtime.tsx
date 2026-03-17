import type { CompiledTaoScenario, CompiledTaoScenarioAdapter } from '@shared/CompiledTaoScenario'
import { cleanup, render, type RenderResult } from '@testing-library/react-native'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ComponentType } from 'react'

type CompileOpts = {
  code?: string
  path?: string
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

type RenderCompiledAppResult = RenderResult & {
  compiledModule: CompiledAppModule
}

const runtimeDir = resolvePath(__dirname, '..')
const repoRoot = resolvePath(runtimeDir, '../..')
const stdLibRoot = resolvePath(repoRoot, 'packages/tao-std-lib')
const compiledAppModulePath = resolvePath(runtimeDir, 'src/_gen-tao-compiler/app-output.tsx')
const taoSdkModuleUrl = pathToFileURL(resolvePath(repoRoot, 'packages/tao-cli/cli-src/tao-cli-main.ts')).href

// getHeadlessTestRuntimeDir Return the package root used as Tao runtimeDir.
export function getHeadlessTestRuntimeDir() {
  return runtimeDir
}

// getCompiledTaoScenarioName Derive a scenario display name from its directory name.
export function getCompiledTaoScenarioName(scenarioDir: string) {
  return basename(scenarioDir)
}

// createHeadlessScenarioAdapter Create a shared-scenario adapter for the headless runtime.
export function createHeadlessScenarioAdapter() {
  const outputFileName = `src/_gen-runtime-tests/${getGeneratedOutputFileName('scenario')}`

  const adapter: CompiledTaoScenarioAdapter = {
    async compileScenario({ scenarioDir }: { scenarioDir: string; scenario: CompiledTaoScenario }) {
      return compileTaoForHeadlessRuntime({
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

// compileTaoForHeadlessRuntime Compile Tao source into the headless runtime output module.
export async function compileTaoForHeadlessRuntime(opts: CompileOpts): Promise<CompileResult> {
  const outputPath = getCompiledOutputPath(opts.outputFileName)
  const command = spawnSync(
    'bun',
    [
      '-e',
      `
        import { TaoSDK_compile } from '${taoSdkModuleUrl}'

        const opts = JSON.parse(process.env.TAO_HEADLESS_COMPILE_OPTS ?? '{}')
        await TaoSDK_compile(opts)
      `,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        TAO_HEADLESS_COMPILE_OPTS: JSON.stringify({ ...opts, runtimeDir }),
      },
    },
  )

  const compileError = getCompileCommandError(command)
  if (command.status === 0 || existsSync(outputPath)) {
    return { outputPath, compileError }
  }

  throw new Error(`Failed to compile Tao for the headless runtime: ${String(compileError)}`)
}

// renderCompiledTaoApp Render the most recently compiled Tao app from this runtime.
export function renderCompiledTaoApp(outputPath = compiledAppModulePath): RenderCompiledAppResult {
  cleanup()
  const compiledModule = loadCompiledAppModule(outputPath)
  const CompiledTaoApp = compiledModule.default

  return {
    ...render(<CompiledTaoApp />),
    compiledModule,
  }
}

function loadCompiledAppModule(outputPath: string): CompiledAppModule {
  jest.resetModules()
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

function getGeneratedOutputFileName(baseName: string) {
  return `test-${sanitizePathSegment(baseName)}-${Math.random().toString(36).slice(2, 12)}-app-output.tsx`
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function getCompileCommandError(command: ReturnType<typeof spawnSync>) {
  return command.stderr || command.stdout || `bun exited with status ${command.status}`
}
