import { describe, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { spawn } from 'node:child_process'
import * as nodeFs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Text } from 'react-native'
import { TaoSDK_compile } from '../_gen-tao-lib/tao-cli-main'

describe('runtime:', () => {
  test('renders <MockTestView />', async () => {
    const MockTestView = () => <Text>Hello Mock Test View</Text>
    const res = await render(<MockTestView />).findByText('Hello Mock Test View')
    expect(res).toBeDefined()
  })

  test('compile and run with sdk', async () => {
    const { needle, runtimeDir, taoPath } = makeNeedleApp()

    const result = await TaoSDK_compile({ path: taoPath, runtimeDir })
    expect(result.outputPath).toBeDefined()
    expect(result.files.some((f: { text: string }) => f.text.includes(needle))).toBe(true)

    await assertBootstrapRendersNeedle(needle, result.outputPath)
    nodeFs.rmSync(path.dirname(taoPath), { recursive: true })
  })

  test('compile and run with cli', async () => {
    const { needle, runtimeDir, taoPath } = makeNeedleApp()
    // `just tao` runs `_tao`, which does `pushd ../tao-cli`; cwd must be `packages/*` (not repo root).
    const exitCode = await _cmd('just', ['tao', 'compile', taoPath, '--runtime-dir', runtimeDir], {
      // cwd: path.resolve(__dirname, '..'), ???
      cwd: path.join(__dirname, '../../..', 'packages/expo-runtime'),
    })
    expect(exitCode).toBe(0)
    const bootstrapPath = path.resolve(runtimeDir, `app/_gen-tao-compiler/tao-app/app-bootstrap.tsx`)

    await assertBootstrapRendersNeedle(needle, bootstrapPath)
    nodeFs.rmSync(path.dirname(taoPath), { recursive: true })
  })
})

/** assertBootstrapRendersNeedle requires the emitted bootstrap (siblings on disk) and asserts the needle text renders. */
async function assertBootstrapRendersNeedle(needle: string, bootstrapPath: string) {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: CompiledNeedleApp } = require(bootstrapPath)
  await render(<CompiledNeedleApp />).findByText(needle)
}

function makeNeedleApp() {
  const needle = Math.random().toString(36).substring(2, 15)
  const runtimeDir = path.resolve(__dirname, '..')
  const code = `app KitchenSink { ui RootView }

    view RootView {
      Text value "${needle}" {}
    }

    view Text value string {
        inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
    }
  `
  const dir = nodeFs.mkdtempSync(path.join(tmpdir(), 'tao-expo-test-'))
  const taoPath = path.join(dir, 'app.tao')
  nodeFs.writeFileSync(taoPath, code)
  return { needle, runtimeDir, taoPath }
}

async function _cmd(cmd: string, args: string[], opts?: { cwd: string }): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['inherit', 'inherit', 'inherit'], cwd: opts?.cwd })
    p.on('exit', code => (code === 0 ? resolve(code) : reject(code)))
  })
}
