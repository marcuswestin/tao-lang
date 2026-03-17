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

/** getHeadlessTestRuntimeDir returns this package’s root—the `runtimeDir` passed to `TaoSDK_compile` from headless tests. */
export function getHeadlessTestRuntimeDir() {
  return runtimeDir
}

/** getCompiledTaoScenarioName returns the last path segment of `scenarioDir` for display labels. */
export function getCompiledTaoScenarioName(scenarioDir: string) {
  return basename(scenarioDir)
}

/** createHeadlessScenarioAdapter builds a `CompiledTaoScenarioAdapter` that compiles `${scenarioDir}/app.tao` into a unique
 * file under `src/_gen-runtime-tests/`, renders via Testing Library, and runs RTL `cleanup` on adapter cleanup. */
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

/** compileTaoForHeadlessRuntime spawns `bun` from the repo root to run `TaoSDK_compile` with `runtimeDir` set to this package.
 * On success or if the output file already exists, returns `{ outputPath, compileError }` (stderr/stdout may still be in
 * `compileError`); otherwise throws with the subprocess diagnostics. */
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

  throw new Error(`Failed to compile Tao for the headless runtime: ${compileError}`)
}

/** renderCompiledTaoApp `require`s the module at `outputPath` (default: shared stub `app-output.tsx`), clears `require.cache`
 * and resets Jest modules so a fresh compile is picked up, runs RTL `cleanup`, then `render(<default />)`. */
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
