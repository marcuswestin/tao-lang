import { TaoSDK_compile } from '@/_gen-tao-lib/tao-cli-main'
import { describe, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { spawn } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { Text } from 'react-native'

describe('runtime:', () => {
  test('renders <MockTestView />', async () => {
    const MockTestView = () => <Text>Hello Mock Test View</Text>
    await render(<MockTestView />).findByText('Hello Mock Test View')
  })

  test('compile and run with sdk', async () => {
    // First compile the app
    const { code, needle, runtimeDir, targetPath } = makeNeedleApp()

    const result = await TaoSDK_compile({ code, runtimeDir })
    expect(result.error).toBeUndefined()
    expect(result.outputPath).toBeDefined()
    expect(result.result?.code).toContain(needle)

    await checkNeedleInApp(needle, result.outputPath, targetPath)
  })

  test('compile and run with cli', async () => {
    const { code, needle, runtimeDir, targetPath } = makeNeedleApp()

    await _cmd('just', ['tao', 'compile', '--code', `'${code}'`, '--runtime-dir', runtimeDir])

    // TODO: use the output path from the sdk compile
    const hackHardCodedOutputPath = path.resolve(runtimeDir, `app/_gen-tao-compiler/app-output.tsx`)

    await checkNeedleInApp(needle, hackHardCodedOutputPath, targetPath)
  })
})

const targetDir = path.resolve(__dirname, '..', 'app/_gen-runtime-tests')

async function checkNeedleInApp(needle: string, fromOutputPath: string, toTargetPath: string) {
  mkdirSync(targetDir, { recursive: true })
  copyFileSync(fromOutputPath, toTargetPath)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: CompiledNeedleApp } = require(toTargetPath)
  await render(<CompiledNeedleApp />).findByText(needle)
}

function makeNeedleApp() {
  const needle = Math.random().toString(36).substring(2, 15)
  const runtimeDir = path.resolve(__dirname, '..')
  const targetPath = path.resolve(runtimeDir, `app/_gen-runtime-tests/test-${needle}-app-output.tsx`)
  const code = `app KitchenSink { ui RootView }

    view RootView { Text value "${needle}" {} }

    view Text value string {
        inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
    }
  `
  return { code, needle, runtimeDir, targetPath }
}

async function _cmd(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['inherit', 'pipe', 'inherit'] })
    p.on('exit', code => (code === 0 ? resolve(code) : reject(code)))
  })
}
