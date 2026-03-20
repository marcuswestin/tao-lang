import {
  discoverCompiledTaoScenarios,
  getCompiledTaoScenariosRootDir,
  runScenario,
} from '@shared/CompiledTaoScenarios'
import { fireEvent, render } from '@testing-library/react-native'
import { spawnSync } from 'node:child_process'
import { resolve as resolvePath } from 'node:path'
import * as RN from 'react-native'
import {
  createHeadlessScenarioAdapter,
  getCompiledTaoScenarioName,
  getHeadlessTestRuntimeDir,
  renderCompiledTaoApp,
} from '../src/test-runtime'

const sharedScenarios = discoverCompiledTaoScenarios()

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

  test('compiles and renders Tao code through the CLI entrypoint', () => {
    const repoRoot = resolvePath(__dirname, '../../..')
    const cliEntryPath = resolvePath(repoRoot, 'packages/tao-cli/tao-cli.ts')
    const runtimeDir = getHeadlessTestRuntimeDir()
    const taoPath = resolvePath(getCompiledTaoScenariosRootDir(), 'Simple test render', 'app.tao')
    const command = spawnSync(
      'bun',
      [
        cliEntryPath,
        'compile',
        taoPath,
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
    expect(screen.getByText('Hello from shared scenario')).toBeTruthy()
  })
})

describe('headless runtime shared scenarios', () => {
  for (const { scenarioDir, scenario, isReady } of sharedScenarios) {
    if (!isReady) {
      test.todo(getCompiledTaoScenarioName(scenarioDir))
      continue
    }
    test(getCompiledTaoScenarioName(scenarioDir), async () => {
      await runScenario({
        scenarioDir,
        scenario: scenario!,
        adapter: createHeadlessScenarioAdapter(),
      })
    })
  }
})
