import { cleanup, render, type RenderResult } from '@testing-library/react-native'
import { spawnSync } from 'node:child_process'
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ComponentType } from 'react'

type CompileOpts = {
  code?: string
  path?: string
  stdLibRoot?: string
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
const compiledAppModulePath = resolvePath(runtimeDir, 'src/_gen-tao-compiler/app-output.tsx')
const taoSdkModuleUrl = pathToFileURL(resolvePath(repoRoot, 'packages/tao-cli/cli-src/tao-cli-main.ts')).href

// getHeadlessTestRuntimeDir Return the package root used as Tao runtimeDir.
export function getHeadlessTestRuntimeDir() {
  return runtimeDir
}

// compileTaoForHeadlessRuntime Compile Tao source into the headless runtime output module.
export async function compileTaoForHeadlessRuntime(opts: CompileOpts): Promise<CompileResult> {
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

  if (command.status === 0) {
    return { outputPath: compiledAppModulePath }
  }

  return {
    outputPath: compiledAppModulePath,
    compileError: command.stderr || command.stdout || `bun exited with status ${command.status}`,
  }
}

// renderCompiledTaoApp Render the most recently compiled Tao app from this runtime.
export function renderCompiledTaoApp(): RenderCompiledAppResult {
  cleanup()
  const compiledModule = loadCompiledAppModule()
  const CompiledTaoApp = compiledModule.default

  return {
    ...render(<CompiledTaoApp />),
    compiledModule,
  }
}

// compileAndRenderTao Compile Tao into this runtime and render the generated app.
export async function compileAndRenderTao(opts: CompileOpts): Promise<RenderCompiledAppResult & CompileResult> {
  const compileResult = await compileTaoForHeadlessRuntime(opts)
  const renderResult = renderCompiledTaoApp()

  return {
    ...compileResult,
    ...renderResult,
  }
}

function loadCompiledAppModule(): CompiledAppModule {
  jest.resetModules()
  const resolvedModulePath = require.resolve(compiledAppModulePath)
  delete require.cache[resolvedModulePath]

  return require(resolvedModulePath) as CompiledAppModule
}
