import { fireEvent, render } from '@testing-library/react-native'
import { spawnSync } from 'node:child_process'
import { resolve as resolvePath } from 'node:path'
import * as RN from 'react-native'
import {
  compileAndRenderTao,
  compileTaoForHeadlessRuntime,
  getHeadlessTestRuntimeDir,
  renderCompiledTaoApp,
} from '../src/test-runtime'

describe('headless runtime', () => {
  test('renders a local react native component', () => {
    const onPress = jest.fn()
    const screen = render(
      <RN.Pressable onPress={onPress}>
        <RN.Text>Press me</RN.Text>
      </RN.Pressable>,
    )

    fireEvent.press(screen.getByText('Press me'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('compiles and renders Tao code with the SDK', async () => {
    const needle = Math.random().toString(36).slice(2)
    const screen = await compileAndRenderTao({
      code: `
        file app TestApp { ui RootView }

        view RootView {
          Text value "${needle}" {}
        }

        view Text value string {
          inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
        }
      `,
    })

    expect(screen.getByText(needle)).toBeTruthy()
    expect(screen.compileError).toBeUndefined()
  })

  test('compiles and renders Tao code through the CLI entrypoint', () => {
    const needle = Math.random().toString(36).slice(2)
    const repoRoot = resolvePath(__dirname, '../../..')
    const cliEntryPath = resolvePath(repoRoot, 'packages/tao-cli/tao-cli.ts')
    const runtimeDir = getHeadlessTestRuntimeDir()
    const command = spawnSync(
      'bun',
      [
        cliEntryPath,
        'compile',
        '--code',
        `
          file app TestApp { ui RootView }

          view RootView {
            Text value "${needle}" {}
          }

          view Text value string {
            inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
          }
        `,
        '--runtime-dir',
        runtimeDir,
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    )

    expect(command.status).toBe(0)
    const screen = renderCompiledTaoApp()
    expect(screen.getByText(needle)).toBeTruthy()
  })

  test('compiles a Tao file that uses the standard library', async () => {
    const taoFilePath = resolvePath(__dirname, '../../../Apps/Kitchen Sink/Kitchen Sink.tao')
    const stdLibRoot = resolvePath(__dirname, '../../tao-std-lib')
    const result = await compileTaoForHeadlessRuntime({ path: taoFilePath, stdLibRoot })

    expect(result.outputPath).toContain('src/_gen-tao-compiler/app-output.tsx')
    expect(result.compileError).toBeUndefined()
  })

  test('renders compiler errors through the generated error app', async () => {
    const screen = await compileAndRenderTao({
      code: `
        file app BrokenApp { ui MissingView }
      `,
    })

    expect(screen.compileError).toBeDefined()
    expect(screen.getByText('Error compiling file')).toBeTruthy()
  })
})
