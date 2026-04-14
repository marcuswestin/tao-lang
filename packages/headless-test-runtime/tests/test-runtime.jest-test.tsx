import { FS } from '@shared'
import { spawnSync } from '@shared/exec'
import {
  discoverCompiledTaoScenarios,
  getCompiledTaoScenariosRootDir,
  runScenario,
} from '@shared/testing'
import { fireEvent, render } from '@testing-library/react-native'
import * as RN from 'react-native'
import {
  createHeadlessScenarioAdapter,
  getHeadlessTestRuntimeDir,
  renderCompiledHeadlessTaoApp,
} from '../src/test-runtime'

import './jest-watch-compiler-hook'

const sharedScenarios = discoverCompiledTaoScenarios()

describe('headless runtime', () => {
  test('renders a local react native component', () => {
    const onPress = jest.fn()
    const screen = render(
      <RN.Pressable onPress={onPress}>
        <RN.Text>Press me</RN.Text>
      </RN.Pressable>,
    )

    fireEvent.press(screen.getAllByText('Press me')[0]!)

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('compiles and renders Tao code through the CLI entrypoint', () => {
    const repoRoot = FS.resolvePath(__dirname, '../../..')
    const cliEntryPath = FS.resolvePath(repoRoot, 'packages/tao-cli/tao-cli.ts')
    const runtimeDir = getHeadlessTestRuntimeDir()
    const taoPath = FS.resolvePath(getCompiledTaoScenariosRootDir(), 'Simple test render', 'app.tao')
    const args = [cliEntryPath, 'compile', taoPath, '--runtime-dir', runtimeDir]
    const command = spawnSync(
      'bun',
      args,
      { cwd: repoRoot, encoding: 'utf8' },
    )

    expect(command.status).toBe(0)
    const screen = renderCompiledHeadlessTaoApp()
    expect(screen.getAllByText('Hello from shared scenario')).toBeTruthy()
  })
})

describe('headless runtime shared scenarios', () => {
  for (const { scenarioDir, scenario, skip } of sharedScenarios) {
    const scenarioName = FS.basename(scenarioDir)
    if (skip) {
      test.todo(scenarioName + ' (' + skip + ')')
      continue
    }
    test(scenarioName, async () => {
      await runScenario({
        scenarioDir,
        scenarioName,
        scenario: scenario!,
        adapter: createHeadlessScenarioAdapter(),
      })
    })
  }
})
