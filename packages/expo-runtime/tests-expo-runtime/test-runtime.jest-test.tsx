import { describe, jest, test } from '@jest/globals'
import { FS } from '@shared'
import { spawn } from '@shared/exec'
import {
  runTaoSdkCompileBunSync,
  TAO_SDK_COMPILE_OPTS_ENV_EXPO,
  throwIfTaoSdkCompileFailed,
} from '@shared/TaoBunSdk'
import { render } from '@testing-library/react-native'
import type { ComponentType } from 'react'
import { Text } from 'react-native'

describe('runtime:', () => {
  test('renders <MockTestView />', async () => {
    const MockTestView = () => <Text>Hello Mock Test View</Text>
    const res = await render(<MockTestView />).findByText('Hello Mock Test View')
    expect(res).toBeDefined()
  })

  test('compile and run with sdk', async () => {
    const { needle, runtimeDir, taoPath } = makeNeedleApp()
    const repoRoot = FS.resolvePath(runtimeDir, '../..')
    const taoSdkModuleUrl = FS.pathToFileURL(FS.resolvePath(runtimeDir, '_gen-tao-lib/tao-cli-main.js')).href
    const outputPath = FS.resolvePath(runtimeDir, 'app/_gen-tao-compiler/tao-app/app-bootstrap.tsx')

    const command = runTaoSdkCompileBunSync({
      repoRoot,
      taoSdkModuleUrl,
      compileOpts: { path: taoPath, runtimeDir },
      optsEnvVar: TAO_SDK_COMPILE_OPTS_ENV_EXPO,
    })
    throwIfTaoSdkCompileFailed(command, { outputPath, runtimeLabel: 'the Expo runtime', requireOutputFile: true })
    expect(emitTreeContainsNeedle(FS.dirname(outputPath), needle)).toBe(true)

    await assertBootstrapRendersNeedle(needle, outputPath)
    FS.rmDirectory(FS.dirname(taoPath), { recursive: true })
  })

  test('compile and run with cli', async () => {
    const { needle, runtimeDir, taoPath } = makeNeedleApp()
    // `just tao` runs `_tao`, which does `pushd ../tao-cli`; cwd must be `packages/*` (not repo root).
    const exitCode = await _cmd('just', ['tao', 'compile', taoPath, '--runtime-dir', runtimeDir], {
      // cwd: FS.resolvePath(__dirname, '..'), ???
      cwd: FS.joinPath(__dirname, '../../..', 'packages/expo-runtime'),
    })
    expect(exitCode).toBe(0)
    const bootstrapPath = FS.resolvePath(runtimeDir, `app/_gen-tao-compiler/tao-app/app-bootstrap.tsx`)

    await assertBootstrapRendersNeedle(needle, bootstrapPath)
    FS.rmDirectory(FS.dirname(taoPath))
  })
})

/** assertBootstrapRendersNeedle reloads the compiled app module tree (nested emits under the same dir need a full reset; matches pre-refactor tests). */
async function assertBootstrapRendersNeedle(needle: string, bootstrapPath: string) {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: CompiledNeedleApp } = require(bootstrapPath) as { default: ComponentType }
  await render(<CompiledNeedleApp />).findByText(needle)
}

/** emitTreeContainsNeedle returns true when some `.ts`/`.tsx` under `rootDir` contains `needle`. */
function emitTreeContainsNeedle(rootDir: string, needle: string): boolean {
  for (const ent of FS.readDirWithFileTypes(rootDir)) {
    const p = FS.joinPath(rootDir, ent.name)
    if (ent.isDirectory()) {
      if (emitTreeContainsNeedle(p, needle)) {
        return true
      }
    } else if ((ent.name.endsWith('.ts') || ent.name.endsWith('.tsx')) && FS.readTextFile(p).includes(needle)) {
      return true
    }
  }
  return false
}

function makeNeedleApp() {
  const needle = Math.random().toString(36).substring(2, 15)
  const runtimeDir = FS.resolvePath(__dirname, '..')
  const code = `app KitchenSink { ui RootView }

    view RootView {
      Text value "${needle}" {}
    }

    view Text value string {
        inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
    }
  `
  const dir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-expo-test-'))
  const taoPath = FS.joinPath(dir, 'app.tao')
  FS.writeFile(taoPath, code)
  return { needle, runtimeDir, taoPath }
}

async function _cmd(cmd: string, args: string[], opts?: { cwd: string }): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['inherit', 'inherit', 'inherit'], cwd: opts?.cwd })
    p.on('exit', code => (code === 0 ? resolve(code) : reject(code)))
  })
}
