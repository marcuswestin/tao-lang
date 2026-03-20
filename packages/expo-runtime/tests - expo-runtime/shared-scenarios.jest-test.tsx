import { basename } from 'node:path'
import {
  discoverCompiledTaoScenarios,
  runScenario,
} from '../../shared/shared-src/CompiledTaoScenarios'
import { createExpoScenarioAdapter, getCompiledTaoScenarioName } from '../test-runtime'

const expoScenarioAllowList = new Set(['Compile error', 'Simple test render'])

const expoSharedScenarios = discoverCompiledTaoScenarios()
  .filter(({ scenarioDir }) => expoScenarioAllowList.has(basename(scenarioDir)))

describe('expo runtime shared scenarios', () => {
  for (const { scenarioDir, scenario, isReady } of expoSharedScenarios) {
    if (!isReady) {
      test.todo(getCompiledTaoScenarioName(scenarioDir))
      continue
    }
    test(getCompiledTaoScenarioName(scenarioDir), async () => {
      await runScenario({
        scenarioDir,
        scenario: scenario!,
        adapter: createExpoScenarioAdapter(),
      })
    })
  }
})
