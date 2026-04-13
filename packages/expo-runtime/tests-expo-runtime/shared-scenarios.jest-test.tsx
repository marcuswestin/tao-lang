import { FS } from '@shared'
import {
  discoverCompiledTaoScenarios,
  runScenario,
} from '@shared/CompiledTaoScenarios'
import { createExpoScenarioAdapter } from '../test-runtime'

const expoScenarioAllowList = new Set(['Simple test render'])

const expoSharedScenarios = discoverCompiledTaoScenarios()
  .filter(({ scenarioDir }) => expoScenarioAllowList.has(FS.basename(scenarioDir)))

describe('expo runtime shared scenarios', () => {
  for (const { scenarioDir, scenario, skip } of expoSharedScenarios) {
    const scenarioName = FS.basename(scenarioDir)
    if (skip) {
      test.todo(scenarioName + ' (' + skip + ')')
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
