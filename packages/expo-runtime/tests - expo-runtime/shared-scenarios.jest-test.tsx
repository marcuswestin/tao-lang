import { basename } from 'node:path'
import {
  discoverCompiledTaoScenarios,
  runScenario,
} from '../../shared/shared-src/CompiledTaoScenarios'
import { createExpoScenarioAdapter } from '../test-runtime'

const expoScenarioAllowList = new Set(['Simple test render'])

const expoSharedScenarios = discoverCompiledTaoScenarios()
  .filter(({ scenarioDir }) => expoScenarioAllowList.has(basename(scenarioDir)))

describe('expo runtime shared scenarios', () => {
  for (const { scenarioDir, scenario, isReady } of expoSharedScenarios) {
    const scenarioName = basename(scenarioDir)
    if (!isReady) {
      test.todo(scenarioName)
      continue
    }
    test(scenarioName, async () => {
      await runScenario({
        scenarioName,
        scenarioDir,
        scenario: scenario!,
        adapter: createExpoScenarioAdapter(),
      })
    })
  }
})
