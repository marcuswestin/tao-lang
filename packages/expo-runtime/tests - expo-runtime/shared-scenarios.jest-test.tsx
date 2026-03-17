import { basename } from 'node:path'
import {
  type CompiledTaoScenario,
  discoverCompiledTaoScenarios,
  runScenario,
} from '../../shared/shared-src/CompiledTaoScenario'
import { createExpoScenarioAdapter, getCompiledTaoScenarioName } from '../test-runtime'

const expoScenarioAllowList = new Set(['Compile error', 'Simple test render'])

type ExpoSharedScenarioTestCase = {
  scenarioDir: string
  scenario: CompiledTaoScenario
}

const expoSharedScenarios: ExpoSharedScenarioTestCase[] = discoverCompiledTaoScenarios()
  .filter(({ scenarioDir }) => expoScenarioAllowList.has(basename(scenarioDir)))

describe('expo runtime shared scenarios', () => {
  for (const { scenarioDir, scenario } of expoSharedScenarios) {
    test(getCompiledTaoScenarioName(scenarioDir), async () => {
      await runScenario({
        scenarioDir,
        scenario,
        adapter: createExpoScenarioAdapter(),
      })
    })
  }
})
